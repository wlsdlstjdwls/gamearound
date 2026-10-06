// games 테이블 쓰기 — 신규 생성과 마스터 정보 갱신.
// 원칙 셋: null 로 덮어쓰지 않는다, 잠긴 필드(data_corrections.lock_field)는 건드리지 않는다, 값이 달라질 때만 UPDATE 한다.
import { eq, inArray } from "drizzle-orm";
import { gameGenres, gameSourceRefs, games, genres, type ContentType } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import { AdapterError, type StoreSnapshot } from "@/server/adapters/types";
import { normalizeGenre } from "@/lib/genres";
import { hasHangul, slugify, slugWithSuffix } from "@/lib/slug";
import { isLocked, type Ctx } from "./context";
import { META_OVERWRITE_SOURCES } from "./constants";

/** slug 충돌 처리: base → base-<externalId> → base-<externalId>-<ts> */
async function uniqueSlug(db: Db, titleEn: string, externalId: string): Promise<string> {
  const base = slugify(titleEn);
  const candidates = [base, slugWithSuffix(base, externalId), slugWithSuffix(base, `${externalId}-${Date.now()}`)];
  for (const c of candidates) {
    const hit = await db.query.games.findFirst({ where: eq(games.slug, c), columns: { id: true } });
    if (!hit) return c;
  }
  return candidates[candidates.length - 1];
}

async function linkGenres(db: Db, gameId: string, names: string[]): Promise<void> {
  // 저장 전에 우리 어휘로 옮긴다 — 소스마다 다른 말로 주면 같은 장르가 칩 두 개가 된다
  const clean = Array.from(new Set(names.map((n) => normalizeGenre(n)).filter(Boolean)));
  if (clean.length === 0) return;
  await db.insert(genres).values(clean.map((name) => ({ name }))).onConflictDoNothing();
  const rows = await db.select({ id: genres.id }).from(genres).where(inArray(genres.name, clean));
  if (rows.length === 0) return;
  await db.insert(gameGenres).values(rows.map((g) => ({ gameId, genreId: g.id }))).onConflictDoNothing();
}

/** DLC 로 만들 때만 채운다. 본편이면 기본값(game, 부모 없음) */
export interface CreateGameOptions {
  contentType?: ContentType;
  parentGameId?: string | null;
}

/** Steam 스냅샷의 meta 로 games 신규 생성 + refs 등록 */
export async function createGameFromSnapshot(
  ctx: Ctx,
  snapshot: StoreSnapshot,
  options: CreateGameOptions = {},
): Promise<{ id: string; slug: string }> {
  const meta = snapshot.meta;
  if (!meta?.titleEn) throw new AdapterError(`appid ${snapshot.storeExternalId}: meta.titleEn 없음 — 게임 생성 불가`, ctx.source, false);
  const { db } = ctx;
  const slug = await uniqueSlug(db, meta.titleEn, snapshot.storeExternalId);
  const mp = meta.multiplayer;
  const [game] = await db
    .insert(games)
    .values({
      slug,
      titleEn: meta.titleEn,
      titleKo: meta.titleKo ?? null,
      description: meta.description ?? null,
      coverUrl: meta.coverUrl ?? null,
      portraitUrl: meta.portraitUrl ?? null,
      developer: meta.developer ?? null,
      publisher: meta.publisher ?? null,
      supportsSolo: mp?.solo ?? true,
      supportsCoop: mp?.coop ?? false,
      supportsPvp: mp?.pvp ?? false,
      localMaxPlayers: mp?.localMax ?? null,
      onlineMaxPlayers: mp?.onlineMax ?? null,
      contentType: options.contentType ?? "game",
      parentGameId: options.parentGameId ?? null,
      createdAt: ctx.now,
      updatedAt: ctx.now,
    })
    .returning({ id: games.id, slug: games.slug });
  await db
    .insert(gameSourceRefs)
    .values({ gameId: game.id, source: ctx.source, externalId: snapshot.storeExternalId, url: snapshot.storeUrl, matchedBy: "auto", confidence: "1.00" })
    .onConflictDoNothing();
  await linkGenres(db, game.id, meta.genres ?? []);
  return game;
}

export type GameRow = typeof games.$inferSelect;

/**
 * 지금 `title_en` 이 "잘못 채워진 값" 이고 새 후보가 그것을 되돌리는가.
 *
 * 한글이 든 영문 이름은 채워진 값이 아니라 오염이다(2026-09-15 회차에 본편 1,443건이 그렇게 박혔다).
 * 후보에도 한글이 있으면 되돌릴 상대가 없다는 뜻이라 그대로 둔다 —
 * 닌텐도 코리아는 공식 표기 자체가 "ASTRAL CHAIN (애스트럴 체인)" 이다(2026-09-17 실측 0/3 복구).
 *
 * 술어를 따로 둔 이유: 덮어쓰기 예외(planGameMeta)와 주소 갱신(store-apply)이 같은 판단을 써야 한다.
 * 갈라지면 평범한 제목 정정에도 주소가 따라 바뀐다.
 */
export function isTitleEnRecovery(curTitleEn: string, nextTitleEn: string | null | undefined): boolean {
  if (!nextTitleEn) return false;
  return hasHangul(curTitleEn) && !hasHangul(nextTitleEn);
}

/**
 * 영문 이름을 되찾은 게임의 새 주소. 바꿀 필요가 없으면 null.
 *
 * 주소를 따라 바꾸는 쪽을 골랐다(2026-09-17 결정) — 옛 주소는 404 가 된다.
 * 되살릴 상대가 리다이렉트 표 하나뿐인데, 그 표를 만들면 상세 조회가 매 요청 한 번 더 늘어난다.
 * 오염된 주소는 481건이고 대부분 09-15 에 하루치로 생겨 밖에서 걸린 링크가 거의 없다.
 *
 * slug 갱신은 여기서만 한다 — 신규 생성(uniqueSlug)과 같은 충돌 규칙을 쓰되,
 * 자기 자신과 부딪히는 경우(제목이 달라져도 slug 는 같은 경우)는 바꾸지 않는다.
 */
export async function planSlugRename(db: Db, cur: GameRow, nextTitleEn: string, externalId: string): Promise<string | null> {
  const next = slugify(nextTitleEn);
  if (next === cur.slug) return null;
  const hit = await db.query.games.findFirst({ where: eq(games.slug, next), columns: { id: true } });
  if (!hit) return next;
  // 이미 남이 쓰는 주소다. 접미어를 붙여서라도 한글 주소에서 빠져나온다
  if (hit.id === cur.id) return null;
  return uniqueSlug(db, nextTitleEn, externalId);
}

/**
 * 기존 행과 새 meta 를 비교해 UPDATE 할 필드만 고른다. DB 를 건드리지 않는다 —
 * 배치 경로(store-apply)가 게임마다 왕복하지 않고 계획만 모을 수 있어야 한다.
 */
export function planGameMeta(ctx: Ctx, cur: GameRow, meta: NonNullable<StoreSnapshot["meta"]>): Partial<typeof games.$inferInsert> {
  const gameId = cur.id;
  const set: Partial<typeof games.$inferInsert> = {};
  const consider = <K extends keyof typeof games.$inferInsert>(
    field: K,
    value: (typeof games.$inferInsert)[K] | null | undefined,
    fillOnly = false,
  ) => {
    if (value === null || value === undefined) return;
    if (isLocked(ctx, "games", gameId, field)) return;
    // 채우기만 하는 소스는 이미 값이 있으면 물러난다 (META_OVERWRITE_SOURCES)
    if (fillOnly && cur[field as keyof typeof cur]) return;
    if (cur[field as keyof typeof cur] !== value) set[field] = value;
  };
  // 인원수는 큰 값이 이긴다. 같은 게임이라도 스토어마다 판이 달라 숫자가 다르다(마리오 카트처럼 스위치 판 4인, 다른 판 2인).
  // 덮어쓰기로 두면 두 스토어가 번갈아 값을 뒤집으며 수집마다 UPDATE 와 캐시 무효화를 만든다.
  // "이 게임은 어느 판에서든 최대 N인까지 된다" 는 뜻으로 읽는다
  const considerMax = (field: "localMaxPlayers" | "onlineMaxPlayers", value: number | undefined) => {
    if (value === undefined || value <= 0) return;
    if (isLocked(ctx, "games", gameId, field)) return;
    const have = cur[field];
    if ((have ?? 0) < value) set[field] = value;
  };
  // 권위 없는 소스는 빈 칸만 채운다 — 근거는 META_OVERWRITE_SOURCES 주석(스토어끼리 같은 값을 번갈아 뒤집는 것을 막는다)
  const fillOnly = !META_OVERWRITE_SOURCES.includes(ctx.source);
  // title_en 만은 예외를 둔다. 한글이 든 영문 이름은 "채워진 값" 이 아니라 잘못 채워진 값이라
  // fillOnly 를 무시하고 라틴 후보로 덮는다(2026-09-17). 이 예외가 없으면 Xbox 가 매 수집마다
  // 올바른 영문 이름을 들고 와도 버려진다 — 09-15 회차에 박힌 본편 1,443건이 그렇게 굳어 있었다.
  //
  // 후보에도 한글이 있으면 그대로 둔다. 닌텐도 코리아는 공식 표기 자체가
  // "ASTRAL CHAIN (애스트럴 체인)" 이고(2026-09-17 실측 0/3 복구), 그게 되돌릴 상대가 없는 정식 이름이다.
  consider("titleEn", meta.titleEn, fillOnly && !isTitleEnRecovery(cur.titleEn, meta.titleEn));
  consider("titleKo", meta.titleKo, fillOnly);
  consider("description", meta.description, fillOnly);
  consider("coverUrl", meta.coverUrl, fillOnly);
  consider("portraitUrl", meta.portraitUrl, fillOnly);
  consider("developer", meta.developer, fillOnly);
  consider("publisher", meta.publisher, fillOnly);
  if (meta.multiplayer) {
    consider("supportsSolo", meta.multiplayer.solo);
    consider("supportsCoop", meta.multiplayer.coop);
    consider("supportsPvp", meta.multiplayer.pvp);
    considerMax("localMaxPlayers", meta.multiplayer.localMax);
    considerMax("onlineMaxPlayers", meta.multiplayer.onlineMax);
  }
  return set;
}
