// 스토어 인기순위 순번 반영 — 발견이 목록을 걸어 내려가며 주운 순번을 game_platforms 에 쓴다.
//
// 왜 발견 단계에 붙어 있나: 순번은 목록의 순서 그 자체라 목록을 읽는 순간에만 존재한다.
// 단건 조회(appdetails, GetItems)는 "몇 위인가" 를 알려주지 않는다 — 나중에 따로 물을 방법이 없다.
//
// 왜 별도 파일인가: sync/discover 는 DB 를 모르는 순수 판단(테스트가 쉽다). DB 를 만지는 몫은 여기다.
import { and, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { gamePlatforms, gameSourceRefs } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import type { StoreSource } from "@/server/adapters";
import type { SearchCandidate } from "@/server/adapters/types";
import { SOURCE_PLATFORMS, SOURCE_REGION } from "./constants";

/** 순번이 달린 후보를 (게임, 순번) 쌍으로 푼 것 */
export interface RankRow {
  gameId: string;
  rank: number;
}

/**
 * 후보의 externalId 를 이미 등록된 게임으로 옮긴다. 아직 모르는 후보는 여기서 떨어진다 —
 * 그 게임은 이번 실행이 새로 만들 것이고, 만들어지기 전에는 붙일 행이 없다.
 * 다음 실행의 발견이 같은 자리를 다시 지나며 순번을 채운다.
 *
 * 한 게임에 같은 소스의 ref 가 둘 이상일 수 있다(에디션 SKU). 그때는 **더 높은 순위**(작은 수)를
 * 남긴다 — 본편과 디럭스판이 각각 순위에 있으면 그 게임의 인기는 둘 중 앞선 쪽이다.
 */
export async function resolveRankRows(db: Db, source: StoreSource, ranked: SearchCandidate[]): Promise<RankRow[]> {
  const rankOf = new Map<string, number>();
  for (const c of ranked) {
    if (c.rank === undefined) continue;
    const prev = rankOf.get(c.externalId);
    if (prev === undefined || c.rank < prev) rankOf.set(c.externalId, c.rank);
  }
  if (rankOf.size === 0) return [];

  const refs = await db
    .select({ externalId: gameSourceRefs.externalId, gameId: gameSourceRefs.gameId })
    .from(gameSourceRefs)
    .where(and(eq(gameSourceRefs.source, source), inArray(gameSourceRefs.externalId, [...rankOf.keys()])));

  const best = new Map<string, number>();
  for (const r of refs) {
    const rank = rankOf.get(r.externalId);
    if (rank === undefined) continue;
    const prev = best.get(r.gameId);
    if (prev === undefined || rank < prev) best.set(r.gameId, rank);
  }
  return [...best].map(([gameId, rank]) => ({ gameId, rank }));
}

/**
 * 한 번의 UPDATE 로 모두 쓴다.
 *
 * 건별로 쓰지 않는 이유는 왕복이다 — Neon 왕복 1회가 실측 220ms 라(lib 주석) 페이지당 100건을
 * 하나씩 쓰면 페이지마다 22초, 인기순위 한 바퀴(76페이지)면 28분이 된다. 발견 자체보다 오래 걸린다.
 *
 * 생 SQL 을 쓰는 것은 drizzle 빌더에 "VALUES 목록과 조인하는 UPDATE" 가 없어서다.
 * 값은 전부 바인딩으로 나간다 — 문자열을 이어 붙이지 않는다(lib 의 Neon 백슬래시 주석).
 */
export async function writePopularityRanks(db: Db, source: StoreSource, rows: RankRow[], now: Date): Promise<number> {
  if (rows.length === 0) return 0;
  const platforms = SOURCE_PLATFORMS[source];
  const region = SOURCE_REGION[source];
  const tuples = rows.map((r) => sql`(${r.gameId}::uuid, ${r.rank}::int)`);

  await db.execute(sql`
    update ${gamePlatforms}
    set popularity_rank = v.rank, popularity_rank_at = ${now}
    from (values ${sql.join(tuples, sql`, `)}) as v(game_id, rank)
    where ${gamePlatforms.gameId} = v.game_id
      and ${inArray(gamePlatforms.platform, platforms)}
      and ${eq(gamePlatforms.region, region)}
  `);
  return rows.length;
}
