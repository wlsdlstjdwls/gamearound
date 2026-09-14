// games 테이블 쓰기 — 신규 생성과 마스터 정보 갱신.
// 원칙 셋: null 로 덮어쓰지 않는다, 잠긴 필드(data_corrections.lock_field)는 건드리지 않는다, 값이 달라질 때만 UPDATE 한다.
import { eq, inArray } from "drizzle-orm";
import { gameGenres, gameSourceRefs, games, genres } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import { AdapterError, type StoreSnapshot } from "@/server/adapters/types";
import { slugify, slugWithSuffix } from "@/lib/slug";
import { isLocked, type Ctx } from "./context";

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
  const clean = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  if (clean.length === 0) return;
  await db.insert(genres).values(clean.map((name) => ({ name }))).onConflictDoNothing();
  const rows = await db.select({ id: genres.id }).from(genres).where(inArray(genres.name, clean));
  if (rows.length === 0) return;
  await db.insert(gameGenres).values(rows.map((g) => ({ gameId, genreId: g.id }))).onConflictDoNothing();
}

/** Steam 스냅샷의 meta 로 games 신규 생성 + refs 등록 */
export async function createGameFromSnapshot(ctx: Ctx, snapshot: StoreSnapshot): Promise<{ id: string; slug: string }> {
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

/** 기존 게임의 마스터 정보 갱신 (Steam 기준 소스). 값 변경 시에만, null 로 덮지 않음, 잠긴 필드 제외 */
export async function updateGameMeta(ctx: Ctx, gameId: string, slug: string, meta: NonNullable<StoreSnapshot["meta"]>): Promise<void> {
  const { db } = ctx;
  const cur = await db.query.games.findFirst({ where: eq(games.id, gameId) });
  if (!cur) return;
  const set: Partial<typeof games.$inferInsert> = {};
  const consider = <K extends keyof typeof games.$inferInsert>(field: K, value: (typeof games.$inferInsert)[K] | null | undefined) => {
    if (value === null || value === undefined) return;
    if (isLocked(ctx, "games", gameId, field)) return;
    if (cur[field as keyof typeof cur] !== value) set[field] = value;
  };
  consider("titleEn", meta.titleEn);
  consider("titleKo", meta.titleKo);
  consider("description", meta.description);
  consider("coverUrl", meta.coverUrl);
  consider("portraitUrl", meta.portraitUrl);
  consider("developer", meta.developer);
  consider("publisher", meta.publisher);
  if (meta.multiplayer) {
    consider("supportsSolo", meta.multiplayer.solo);
    consider("supportsCoop", meta.multiplayer.coop);
    consider("supportsPvp", meta.multiplayer.pvp);
    consider("localMaxPlayers", meta.multiplayer.localMax);
    consider("onlineMaxPlayers", meta.multiplayer.onlineMax);
  }
  if (Object.keys(set).length === 0) return;
  await db.update(games).set({ ...set, updatedAt: ctx.now }).where(eq(games.id, gameId));
  ctx.changedSlugs.add(slug);
}
