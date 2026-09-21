// 관리자 서비스 (§8 MVP: sync 대시보드, 매칭 검수 큐, 필드 정정). 모든 함수는 requireAdmin()으로 시작.
import { and, count, desc, eq, gte, inArray, or } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  dataCorrections,
  gamePlatforms,
  games,
  gameSourceRefs,
  sourceEnum,
  syncLogs,
  type SourceName,
} from "@/server/db/schema";
import { requireAdmin } from "@/server/services/users";
import { DISPLAY_TIME_ZONE } from "@/lib/format";

export type SyncLogRow = typeof syncLogs.$inferSelect;
export type SourceRefRow = typeof gameSourceRefs.$inferSelect;
export type CorrectionRow = typeof dataCorrections.$inferSelect;

export const SOURCES: readonly SourceName[] = sourceEnum.enumValues;
export function isSourceName(v: unknown): v is SourceName {
  return typeof v === "string" && (SOURCES as readonly string[]).includes(v);
}

// ---------- sync 대시보드 ----------

export type SyncOverviewItem = { source: SourceName; latest: SyncLogRow | null; failedToday: number };

/** 표시 시간대(KST) 기준 오늘 0시. 서버는 UTC 라 로컬 자정을 쓰면 9시간 어긋난다 */
export function startOfTodayInDisplayZone(now: Date = new Date()): Date {
  const ymd = now.toLocaleDateString("en-CA", { timeZone: DISPLAY_TIME_ZONE }); // YYYY-MM-DD
  return new Date(`${ymd}T00:00:00+09:00`);
}

/** 소스별 최근 sync_logs 1건 + 오늘(KST 자정 이후) 실패 횟수 */
export async function getSyncOverview(): Promise<{ items: SyncOverviewItem[]; pendingCount: number }> {
  await requireAdmin();
  const db = getDb();
  const todayStart = startOfTodayInDisplayZone();

  const [latestRows, failedRows, [pending]] = await Promise.all([
    db.selectDistinctOn([syncLogs.source]).from(syncLogs).orderBy(syncLogs.source, desc(syncLogs.startedAt)),
    db
      .select({ source: syncLogs.source, n: count() })
      .from(syncLogs)
      .where(and(eq(syncLogs.status, "failed"), gte(syncLogs.startedAt, todayStart)))
      .groupBy(syncLogs.source),
    db.select({ n: count() }).from(gameSourceRefs).where(eq(gameSourceRefs.matchedBy, "pending")),
  ]);

  const latestBySource = new Map(latestRows.map((r) => [r.source, r]));
  const failedBySource = new Map(failedRows.map((r) => [r.source, Number(r.n)]));
  const items = SOURCES.map((source) => ({
    source,
    latest: latestBySource.get(source) ?? null,
    failedToday: failedBySource.get(source) ?? 0,
  }));
  return { items, pendingCount: Number(pending?.n ?? 0) };
}

export async function listSyncLogs(opts: { limit?: number; source?: SourceName } = {}): Promise<SyncLogRow[]> {
  await requireAdmin();
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  return getDb()
    .select()
    .from(syncLogs)
    .where(opts.source ? eq(syncLogs.source, opts.source) : undefined)
    .orderBy(desc(syncLogs.startedAt))
    .limit(limit);
}

// ---------- 매칭 검수 큐 (§4.2) ----------

export type PendingMatch = SourceRefRow & { game: { id: string; slug: string; titleKo: string | null; titleEn: string } };

/**
 * 한 화면에 띄울 검수 큐 길이. 회사, 상품 검수 큐와 같은 값이다 — 더 길면 사람이 훑지 못한다.
 * 상한이 없던 자리다. 지금은 45줄이라 티가 안 나지만 이 큐는 수집이 돌 때마다 자라고,
 * 전수를 그리면 관리자가 실제로 보는 건 앞의 몇 줄인데 화면은 그 전부를 실어 나른다.
 * 남은 수는 getSyncOverview().pendingCount 가 이미 세고 있으니 화면은 그 값을 쓴다.
 */
export const PENDING_MATCHES_LIMIT = 60;

export async function listPendingMatches(limit: number = PENDING_MATCHES_LIMIT): Promise<PendingMatch[]> {
  await requireAdmin();
  return getDb().query.gameSourceRefs.findMany({
    where: eq(gameSourceRefs.matchedBy, "pending"),
    orderBy: [desc(gameSourceRefs.confidence)],
    limit,
    with: { game: { columns: { id: true, slug: true, titleKo: true, titleEn: true } } },
  });
}

/** 검수 승인: matched_by=manual (크롤러가 덮어쓰지 않음) */
export async function approveMatch(gameId: string, source: SourceName): Promise<void> {
  await requireAdmin();
  const rows = await getDb()
    .update(gameSourceRefs)
    .set({ matchedBy: "manual" })
    .where(and(eq(gameSourceRefs.gameId, gameId), eq(gameSourceRefs.source, source)))
    .returning({ gameId: gameSourceRefs.gameId });
  if (rows.length === 0) throw new Error("해당 소스 매핑이 없습니다");
}

/**
 * 검수 거절: 행을 지우지 않고 "이 소스엔 없다"(none)로 기록한다.
 *
 * 지우면 그 게임은 다시 "ref 가 없는 게임" 이 돼 다음 실행의 큐 선두로 올라오고, 같은 검색이
 * 같은 후보를 데려와 같은 대기표를 또 만든다 — 사람이 거절할수록 큐가 그대로 차는 쳇바퀴다
 * (후보 0건을 기록하지 않아 hltb 큐 선두가 막혔던 것과 같은 머리막힘, match.ts NO_CANDIDATE_EXTERNAL_ID 참고).
 * none 으로 남기면 checked_at 이 갱신돼 NONE_RETRY_DAYS 동안 조용하고, 그 사이 판정 규칙이 좋아지면
 * 재검색 때 제대로 된 후보를 집는다. 거절한 후보 id 는 그대로 둔다 — 무엇을 보고 물렀는지가 남는다.
 */
export async function rejectMatch(gameId: string, source: SourceName): Promise<void> {
  await requireAdmin();
  const rows = await getDb()
    .update(gameSourceRefs)
    .set({ matchedBy: "none", confidence: null, checkedAt: new Date() })
    .where(and(eq(gameSourceRefs.gameId, gameId), eq(gameSourceRefs.source, source)))
    .returning({ gameId: gameSourceRefs.gameId });
  if (rows.length === 0) throw new Error("해당 소스 매핑이 없습니다");
}

/** 수동 매핑 upsert (game_id, source) 기준. confidence는 비움 */
export async function setManualRef(gameId: string, source: SourceName, externalId: string, url: string | null): Promise<void> {
  await requireAdmin();
  await getDb()
    .insert(gameSourceRefs)
    .values({ gameId, source, externalId, url, matchedBy: "manual", confidence: null })
    .onConflictDoUpdate({
      target: [gameSourceRefs.gameId, gameSourceRefs.source],
      set: { externalId, url, matchedBy: "manual", confidence: null },
    });
}

// ---------- 게임 상세(관리자) ----------

export type AdminGame = typeof games.$inferSelect & {
  platforms: (typeof gamePlatforms.$inferSelect)[];
  sourceRefs: SourceRefRow[];
  corrections: CorrectionRow[];
};

export async function getGameForAdmin(id: string): Promise<AdminGame | null> {
  await requireAdmin();
  const db = getDb();
  const game = await db.query.games.findFirst({
    where: eq(games.id, id),
    with: { platforms: true, sourceRefs: true },
  });
  if (!game) return null;
  const platformIds = game.platforms.map((p) => p.id);
  const corrections = await db
    .select()
    .from(dataCorrections)
    .where(
      or(
        and(eq(dataCorrections.table, "games"), eq(dataCorrections.rowId, id)),
        platformIds.length > 0
          ? and(eq(dataCorrections.table, "game_platforms"), inArray(dataCorrections.rowId, platformIds))
          : undefined,
      ),
    )
    .orderBy(desc(dataCorrections.createdAt))
    .limit(100);
  return { ...game, corrections };
}

// ---------- 필드 정정 (§4.4 data_corrections lock) ----------

type FieldKind = "text" | "int" | "bool" | "date";
type FieldSpec = { kind: FieldKind; label: string };

/** 허용 테이블, 필드 화이트리스트. 키는 DB 컬럼명(snake_case) — 크롤러가 lock 비교에 쓰는 이름 */
export const CORRECTABLE_FIELDS = {
  games: {
    title_ko: { kind: "text", label: "한글 제목" },
    title_en: { kind: "text", label: "영문 제목" },
    description: { kind: "text", label: "설명" },
    cover_url: { kind: "text", label: "커버 이미지 URL" },
    developer: { kind: "text", label: "개발사" },
    publisher: { kind: "text", label: "배급사" },
    local_max_players: { kind: "int", label: "로컬 최대 인원" },
    online_max_players: { kind: "int", label: "온라인 최대 인원" },
    supports_solo: { kind: "bool", label: "싱글 지원" },
    supports_coop: { kind: "bool", label: "협동 지원" },
    supports_pvp: { kind: "bool", label: "PvP 지원" },
    is_retro: { kind: "bool", label: "레트로" },
  },
  game_platforms: {
    list_price: { kind: "int", label: "정가(KRW)" },
    current_price: { kind: "int", label: "현재가(KRW)" },
    discount_pct: { kind: "int", label: "할인율(%)" },
    current_version: { kind: "text", label: "현재 버전" },
    release_date: { kind: "date", label: "출시일" },
    metacritic_score: { kind: "int", label: "메타크리틱 점수" },
    opencritic_score: { kind: "int", label: "오픈크리틱 점수" },
  },
} as const satisfies Record<string, Record<string, FieldSpec>>;

export type CorrectableTable = keyof typeof CORRECTABLE_FIELDS;
export type CorrectableField<T extends CorrectableTable> = keyof (typeof CORRECTABLE_FIELDS)[T] & string;

/** DB 컬럼명 → drizzle 컬럼 키 매핑 */
const GAME_COLUMN_KEY: Record<CorrectableField<"games">, keyof typeof games.$inferSelect> = {
  title_ko: "titleKo",
  title_en: "titleEn",
  description: "description",
  cover_url: "coverUrl",
  developer: "developer",
  publisher: "publisher",
  local_max_players: "localMaxPlayers",
  online_max_players: "onlineMaxPlayers",
  supports_solo: "supportsSolo",
  supports_coop: "supportsCoop",
  supports_pvp: "supportsPvp",
  is_retro: "isRetro",
};
const PLATFORM_COLUMN_KEY: Record<CorrectableField<"game_platforms">, keyof typeof gamePlatforms.$inferSelect> = {
  list_price: "listPrice",
  current_price: "currentPrice",
  discount_pct: "discountPct",
  current_version: "currentVersion",
  release_date: "releaseDate",
  metacritic_score: "metacriticScore",
  opencritic_score: "opencriticScore",
};

export function isCorrectableTable(v: unknown): v is CorrectableTable {
  return v === "games" || v === "game_platforms";
}
export function isCorrectableField(table: CorrectableTable, v: unknown): v is CorrectableField<typeof table> {
  return typeof v === "string" && Object.hasOwn(CORRECTABLE_FIELDS[table], v);
}

export type CorrectionValue = string | number | boolean | null;

/** 문자열 입력을 필드 타입에 맞게 변환. 빈 문자열은 null(값 지움), bool은 "true"/"on"/"1"만 true */
export function coerceFieldValue(kind: FieldKind, raw: string): CorrectionValue {
  const s = raw.trim();
  switch (kind) {
    case "bool":
      return s === "true" || s === "on" || s === "1";
    case "int": {
      if (s === "") return null;
      if (!/^-?\d+$/.test(s)) throw new Error("정수만 입력할 수 있습니다");
      const n = Number(s);
      if (!Number.isSafeInteger(n)) throw new Error("정수 범위를 벗어났습니다");
      return n;
    }
    case "date": {
      if (s === "") return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(new Date(s).getTime())) throw new Error("날짜는 YYYY-MM-DD 형식이어야 합니다");
      return s;
    }
    case "text":
      return s === "" ? null : s;
  }
}

export type CorrectFieldInput = {
  table: CorrectableTable;
  rowId: string;
  field: string;
  after: CorrectionValue;
  lock: boolean;
};

/**
 * 필드 정정: 현재값 조회(before) → UPDATE → data_corrections INSERT (트랜잭션 없이 순차, neon-http 제약)
 * title_en은 NOT NULL이므로 null 정정 불가.
 */
export async function correctField(input: CorrectFieldInput): Promise<{ before: CorrectionValue }> {
  const admin = await requireAdmin();
  const db = getDb();
  if (!isCorrectableTable(input.table)) throw new Error("허용되지 않은 테이블입니다");
  if (!isCorrectableField(input.table, input.field)) throw new Error("허용되지 않은 필드입니다");

  let before: CorrectionValue;
  if (input.table === "games") {
    const field = input.field as CorrectableField<"games">;
    const key = GAME_COLUMN_KEY[field];
    if (field === "title_en" && input.after === null) throw new Error("영문 제목은 비울 수 없습니다");
    const row = await db.query.games.findFirst({ where: eq(games.id, input.rowId) });
    if (!row) throw new Error("게임을 찾을 수 없습니다");
    before = toJsonValue(row[key]);
    const set = { [key]: input.after, updatedAt: new Date() } as Record<string, unknown> as Partial<typeof games.$inferInsert>;
    await db.update(games).set(set).where(eq(games.id, input.rowId));
  } else {
    const field = input.field as CorrectableField<"game_platforms">;
    const key = PLATFORM_COLUMN_KEY[field];
    const row = await db.query.gamePlatforms.findFirst({ where: eq(gamePlatforms.id, input.rowId) });
    if (!row) throw new Error("플랫폼 행을 찾을 수 없습니다");
    before = toJsonValue(row[key]);
    const set = { [key]: input.after } as Record<string, unknown> as Partial<typeof gamePlatforms.$inferInsert>;
    await db.update(gamePlatforms).set(set).where(eq(gamePlatforms.id, input.rowId));
  }

  await db.insert(dataCorrections).values({
    adminUserId: admin.id,
    table: input.table,
    rowId: input.rowId,
    field: input.field,
    before,
    after: input.after,
    lockField: input.lock,
  });
  return { before };
}

function toJsonValue(v: unknown): CorrectionValue {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  return String(v);
}
