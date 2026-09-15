// games 테이블 쓰기 — 신규 생성과 마스터 정보 갱신.
// 원칙 셋: null 로 덮어쓰지 않는다, 잠긴 필드(data_corrections.lock_field)는 건드리지 않는다, 값이 달라질 때만 UPDATE 한다.
import { eq, inArray } from "drizzle-orm";
import { gameGenres, gameSourceRefs, games, genres, type ContentType } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import { AdapterError, type StoreSnapshot } from "@/server/adapters/types";
import { normalizeGenre } from "@/lib/genres";
import { slugify, slugWithSuffix } from "@/lib/slug";
import { isLocked, type Ctx } from "./context";
import { TEXT_FILL_ONLY_SOURCES } from "./constants";

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
    // 채우기만 하는 소스는 이미 값이 있으면 물러난다 (TEXT_FILL_ONLY_SOURCES)
    if (fillOnly && cur[field as keyof typeof cur]) return;
    if (cur[field as keyof typeof cur] !== value) set[field] = value;
  };
  // 일본어 표기로 우리가 세워 둔 이름을 뒤집지 않게 한다 — 근거는 TEXT_FILL_ONLY_SOURCES 주석
  const textFillOnly = TEXT_FILL_ONLY_SOURCES.includes(ctx.source);
  consider("titleEn", meta.titleEn, textFillOnly);
  consider("titleKo", meta.titleKo);
  consider("description", meta.description);
  consider("coverUrl", meta.coverUrl);
  consider("portraitUrl", meta.portraitUrl);
  consider("developer", meta.developer, textFillOnly);
  consider("publisher", meta.publisher, textFillOnly);
  if (meta.multiplayer) {
    consider("supportsSolo", meta.multiplayer.solo);
    consider("supportsCoop", meta.multiplayer.coop);
    consider("supportsPvp", meta.multiplayer.pvp);
    consider("localMaxPlayers", meta.multiplayer.localMax);
    consider("onlineMaxPlayers", meta.multiplayer.onlineMax);
  }
  return set;
}
