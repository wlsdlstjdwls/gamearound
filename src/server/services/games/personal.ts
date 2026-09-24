// 취향 할인 줄 — 온보딩에서 받은 플랫폼, 장르, 할인 성향, 구독으로 홈의 할인을 거른다(설계 §9 의 4회차).
//
// 캐시를 걸지 않는다. 사람마다 조건이 달라 캐시 열쇠가 사용자 수만큼 생기고, 줄이 작아(8칸)
// 질의 하나로 끝난다. 홈 본문(풀 라우트 캐시)은 이 질의를 모른다 — 줄은 마운트 뒤 따로 받아 온다
// (api/me/picks, 홈의 정적 캐시를 깨지 않으려고. SessionProvider 주석과 같은 이유다).
import { and, desc, eq, gte, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameGenres, gamePlatforms, games, gameSubscriptions, HOME_REGION, priceSnapshots, subscriptions, type Platform } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import type { DealFloor } from "@/lib/onboarding/personal";
import type { GameSummary } from "./dto";
import { fillGenres, fillPlatforms, groupSummaries } from "./mappers";
import { mainGamesOnly } from "./filters";
import { baseCurrencyFirst, hltbRankExpr, popularityRankAgg } from "./popularity-order";

/** 줄 칸 수. 홈 첫 줄(12칸) 밑에 붙는 둘째 줄이라 더 짧게 — 한 줄에 네 장씩 두 줄이다 */
export const PERSONAL_DEALS_LIMIT = 8;

export type PersonalDealsFilter = {
  platforms: readonly Platform[] | null;
  genreIds: readonly number[] | null;
  subscriptionKeys: readonly string[] | null;
  floor: DealFloor;
};

export async function getPersonalDeals(f: PersonalDealsFilter): Promise<GameSummary[]> {
  const db = getDb();
  const rankAgg = popularityRankAgg(db);
  const wheres = [
    mainGamesOnly(),
    eq(gamePlatforms.region, HOME_REGION),
    visiblePlatformsOnly(),
    gt(gamePlatforms.currentPrice, 0),
    gte(gamePlatforms.discountPct, f.floor.minDiscountPct),
  ];
  // 할인 **행**이 내 플랫폼이어야 한다 — 게임이 내 플랫폼에도 있다는 것만으로는 부족하다.
  // PS5 만 고른 사람에게 스팀 할인을 보여 주면 그 사람이 살 수 없는 값이다
  if (f.platforms?.length) wheres.push(inArray(gamePlatforms.platform, [...f.platforms]));
  // 장르는 "하나라도" — 다섯 개 고른 사람에게 전부를 요구하면 줄이 빈다
  if (f.genreIds?.length) {
    wheres.push(sql`exists (select 1 from ${gameGenres} where ${gameGenres.gameId} = ${games.id} and ${inArray(gameGenres.genreId, [...f.genreIds])})`);
  }
  // 이미 구독으로 하는 게임은 할인해도 살 이유가 없다(설계 §2 의 6번). 그 행만 뺀다 — 같은 게임의 다른 기기 할인은 남는다
  if (f.subscriptionKeys?.length) {
    wheres.push(sql`not exists (
      select 1 from ${gameSubscriptions} inner join ${subscriptions} on ${subscriptions.id} = ${gameSubscriptions.subscriptionId}
      where ${gameSubscriptions.gamePlatformId} = ${gamePlatforms.id} and ${gameSubscriptions.removedAt} is null
        and ${inArray(subscriptions.key, [...f.subscriptionKeys])})`);
  }
  // 역대 최저가: 지금 값보다 싸게 찍힌 적이 한 번도 없어야 한다. 이력이 없는 행은 판단할 수 없어 뺀다
  if (f.floor.historicLow) {
    wheres.push(sql`exists (select 1 from ${priceSnapshots} where ${priceSnapshots.gamePlatformId} = ${gamePlatforms.id})`);
    wheres.push(sql`not exists (select 1 from ${priceSnapshots} where ${priceSnapshots.gamePlatformId} = ${gamePlatforms.id} and ${priceSnapshots.price} < ${gamePlatforms.currentPrice})`);
  }

  const rows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .leftJoin(rankAgg, eq(rankAgg.gameId, games.id))
    .where(and(...wheres))
    // 홈 첫 줄과 같은 순서(services/games/home 주석) — 원화 먼저, 인기, 최신작, 할인율
    .orderBy(
      baseCurrencyFirst(),
      sql`coalesce(${rankAgg.minRank}, ${hltbRankExpr()}) asc nulls last`,
      sql`${gamePlatforms.releaseDate} desc nulls last`,
      desc(gamePlatforms.discountPct),
    )
    .limit(PERSONAL_DEALS_LIMIT * 4);

  return fillGenres(await fillPlatforms(groupSummaries(rows, PERSONAL_DEALS_LIMIT)));
}
