// 스토어 소스의 수집 대상 선정 — 기존 매핑 + 카탈로그 신규 발견(시드).
import { and, eq, inArray, sql } from "drizzle-orm";
import { gamePlatforms, gameSourceRefs, games } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import { getStoreAdapter, type StoreSource } from "@/server/adapters";
import { fetchSteamTopAppIds } from "@/server/adapters/steam";
import { errorMessage } from "@/lib/errors";
import { findGameByTitle, type GameTitleRow } from "./match";
import { MATCHED_FOR_SYNC, SOURCE_PLATFORMS } from "./constants";
import { fetchWithRetry } from "./retry";
import type { Ctx } from "./context";

export interface StoreTarget {
  gameId: string | null; // null = 신규 게임 생성 대상
  slug: string | null;
  externalId: string;
}

export async function listStoreTargets(ctx: Ctx, source: StoreSource, limit: number, seedTop?: number): Promise<StoreTarget[]> {
  const { db } = ctx;
  const platforms = SOURCE_PLATFORMS[source];
  const rows = await db
    .select({ gameId: gameSourceRefs.gameId, externalId: gameSourceRefs.externalId, slug: games.slug })
    .from(gameSourceRefs)
    .innerJoin(games, eq(games.id, gameSourceRefs.gameId))
    .leftJoin(gamePlatforms, and(eq(gamePlatforms.gameId, gameSourceRefs.gameId), inArray(gamePlatforms.platform, platforms)))
    .where(and(eq(gameSourceRefs.source, source), inArray(gameSourceRefs.matchedBy, MATCHED_FOR_SYNC)))
    .orderBy(sql`${gamePlatforms.lastSyncedAt} asc nulls first`)
    .limit(limit);

  const seen = new Set<string>();
  const targets: StoreTarget[] = [];
  for (const r of rows) {
    const key = `${r.gameId}:${r.externalId}`;
    if (seen.has(key)) continue; // psstore/nintendo 는 플랫폼 2개 조인으로 중복 가능
    seen.add(key);
    targets.push({ gameId: r.gameId, slug: r.slug, externalId: r.externalId });
  }

  // 신규 시드 (§4.2-1, §11-1 상위 N개).
  // 발견은 부가 작업이다 — 스토어가 목록을 안 주더라도(차단, 개편) 기존 게임 가격 갱신은 계속돼야 한다.
  if (seedTop && seedTop > 0) {
    try {
      for (const t of await seedTargets(ctx, source, seedTop)) {
        if (seen.has(`seed:${t.externalId}`)) continue;
        seen.add(`seed:${t.externalId}`);
        targets.unshift(t);
      }
    } catch (e) {
      ctx.errors.push(`[${source}:discover] ${errorMessage(e)}`);
      console.warn(`[sync:${source}] 카탈로그 발견 실패 — 기존 게임 갱신만 진행: ${errorMessage(e)}`);
    }
  }
  // 시드는 앞에 붙으므로 여기서 자르면 신규 게임이 우선되고, 가장 오래 갱신 안 된 기존 게임이 밀린다.
  // limit 을 한 실행의 총 처리 건수 상한으로 지키지 않으면 시드가 많은 날 워크플로 timeout 이 난다.
  return targets.slice(0, limit);
}

/** 이 소스에 이미 ref 가 있는 externalId 집합 */
async function knownExternalIds(db: Db, source: StoreSource, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ externalId: gameSourceRefs.externalId })
    .from(gameSourceRefs)
    .where(and(eq(gameSourceRefs.source, source), inArray(gameSourceRefs.externalId, ids)));
  return new Set(rows.map((r) => r.externalId));
}

/**
 * 카탈로그에서 신규 대상을 찾는다.
 * - steam(기준 소스): 게임이 여기서 생겨나므로 발견한 appid 를 그대로 신규 생성 대상으로 둔다.
 * - 그 외 소스: 같은 게임이 Steam 으로 이미 들어와 있을 수 있다. 제목으로 역방향 매칭해
 *   맞으면 ref 만 붙여 기존 게임의 플랫폼으로 흡수하고, 못 찾은 것만 새 게임으로 만든다.
 *   이 단계가 없으면 멀티플랫폼 게임이 플랫폼 수만큼 중복 등록된다.
 */
async function seedTargets(ctx: Ctx, source: StoreSource, seedTop: number): Promise<StoreTarget[]> {
  const { db } = ctx;
  if (source === "steam") {
    const appIds = await fetchSteamTopAppIds(seedTop);
    const known = await knownExternalIds(db, source, appIds);
    return appIds.filter((id) => !known.has(id)).map((id) => ({ gameId: null, slug: null, externalId: id }));
  }

  const adapter = getStoreAdapter(source);
  if (!adapter.discover) return [];
  const candidates = await fetchWithRetry(() => adapter.discover!(seedTop));
  const known = await knownExternalIds(db, source, candidates.map((c) => c.externalId));
  const fresh = candidates.filter((c) => !known.has(c.externalId));
  if (fresh.length === 0) return [];

  const titles: GameTitleRow[] = await db
    .select({ id: games.id, slug: games.slug, titleEn: games.titleEn, titleKo: games.titleKo })
    .from(games);

  const out: StoreTarget[] = [];
  let absorbed = 0;
  for (const c of fresh) {
    const hit = findGameByTitle(c.title, titles);
    if (!hit) {
      out.push({ gameId: null, slug: null, externalId: c.externalId });
      continue;
    }
    await db
      .insert(gameSourceRefs)
      .values({
        gameId: hit.game.id,
        source,
        externalId: c.externalId,
        url: c.url,
        matchedBy: "auto",
        confidence: hit.similarity.toFixed(2),
        checkedAt: ctx.now,
      })
      // 이미 매칭된 게임이면(동시 실행, 수동 매칭) 건드리지 않는다
      .onConflictDoNothing();
    out.push({ gameId: hit.game.id, slug: hit.game.slug, externalId: c.externalId });
    absorbed++;
  }
  console.log(`[sync:${source}] 발견 ${candidates.length}건 → 신규 ${fresh.length}건 (기존 게임에 흡수 ${absorbed}, 새 게임 ${fresh.length - absorbed})`);
  return out;
}
