// 개인화 할인 줄 — 온보딩에서 받은 플랫폼, 장르, 할인 성향, 구독으로 홈 "지금 할인 중" 을 다시 짠다(설계 §9 의 4회차).
//
// 2026-09-29 사용자 지정: 홈 첫 줄 밑의 "내 취향 할인" 둘째 줄을 없애고 **첫 줄 자체**를 개인화한다.
// 취향에 맞는 할인을 먼저 세우고, 없거나 모자라면 공통 줄(home.ts, 판매 순번 → 별점 → 환산 랭킹)로 채운다.
//
// 캐시를 걸지 않는다. 사람마다 조건이 달라 캐시 열쇠가 사용자 수만큼 생기고, 질의 하나로 끝난다.
// 홈 본문(풀 라우트 캐시)은 이 질의를 모른다 — 줄은 마운트 뒤 따로 받아 갈아 끼운다
// (api/me/picks, 홈의 정적 캐시를 깨지 않으려고. SessionProvider 주석과 같은 이유다).
import { and, eq, gte, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameGenres, gamePlatforms, games, gameSubscriptions, HOME_REGION, priceSnapshots, subscriptions, type Platform } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import type { DealFloor } from "@/lib/onboarding/personal";
import type { GameSummary } from "./dto";
import { fillGenres, fillPlatforms, groupSummaries } from "./mappers";
import { mainGamesOnly } from "./filters";
import { showcaseReady } from "./exposure";
import { dealOrder, popularityRankAgg } from "./popularity-order";
import { getHomeData, HOME_LIMIT } from "./home";
import { fillDeals } from "./fill-deals";

export type PersonalDealsFilter = {
  platforms: readonly Platform[] | null;
  genreIds: readonly number[] | null;
  subscriptionKeys: readonly string[] | null;
  floor: DealFloor;
};

async function getPickedDeals(f: PersonalDealsFilter): Promise<GameSummary[]> {
  const db = getDb();
  const rankAgg = popularityRankAgg(db);
  const wheres = [
    mainGamesOnly(),
    // 공통 줄(home.ts)과 같은 진열 조건 — 취향 칸만 소품을 세우면 두 칸의 결이 갈린다
    showcaseReady(),
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
    // 공통 줄과 같은 순서 — 취향 칸 뒤에 이어 붙는 칸과 잣대가 같아야 한다(popularity-order 머리 주석)
    .orderBy(...dealOrder(rankAgg))
    .limit(HOME_LIMIT * 4);

  return fillGenres(await fillPlatforms(groupSummaries(rows, HOME_LIMIT)));
}

/**
 * 개인화한 홈 첫 줄. 공통 줄은 캐시된 getHomeData 를 그대로 쓴다 — 채울 칸을 위해 질의를 또 돌리지 않는다.
 * 두 벌은 서로 기다릴 이유가 없어 나란히 받는다(왕복 수가 화면 속도를 정한다).
 *
 * "곧 할인 마감" 에 선 게임은 취향 칸에서 뺀다. 그 줄은 공통 첫 줄과 겹치지 않게 골라져 있는데
 * (home.ts, 2026-09-22 사용자 지정) 첫 줄을 갈아 끼우면 그 약속이 깨진다. 공통 줄은 애초에 겹치지 않는다.
 */
export async function getPersonalDeals(f: PersonalDealsFilter): Promise<GameSummary[]> {
  const [picked, home] = await Promise.all([getPickedDeals(f), getHomeData()]);
  const endingSoon = new Set(home.endingSoon.map((g) => g.slug));
  return fillDeals(picked.filter((g) => !endingSoon.has(g.slug)), home.discounts, HOME_LIMIT);
}
