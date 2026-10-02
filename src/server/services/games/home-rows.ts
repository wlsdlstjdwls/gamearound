// 홈의 둘째 판 줄들 — 스토어 값 차이, 인기 순위, 만 원 이하(2026-10-02 홈 재구성).
//
// home.ts 에서 가른 이유: 그 파일은 첫 줄(할인), 곧 마감, 최근 출시, 뉴스를 이미 들고 있고 줄마다 긴 근거 주석이 붙는다.
// 여기 셋은 모두 "진열 줄" 이라 같은 조건(mainGamesOnly + showcaseReady)을 쓴다 — 조건은 exposure 한곳이다.
// 질의는 둘씩만 함께 띄운다 — 한꺼번에 띄우면 Neon 이 메모리 부족으로 죽는다(home.ts 의 같은 주석, 2026-10-02 실측).
import { and, asc, eq, gt, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, HOME_REGION } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { DISPLAY_CURRENCY } from "@/lib/currency";
import { SAVING_GROUPS, SAVING_MIN_AMOUNT } from "@/lib/games/saving";
import { HOME_BUDGET_PRICE, HOME_RAIL_LIMIT, HOME_RANK_LIMIT } from "@/lib/home/rows";
import type { GameSummary } from "./dto";
import { fillGenres, fillPlatforms, groupSummaries } from "./mappers";
import { mainGamesOnly } from "./filters";
import { showcaseReady } from "./exposure";
import { baseCurrencyFirst, dealOrder, popularityRankAgg } from "./popularity-order";

type Db = ReturnType<typeof getDb>;

/** 줄 하나를 받아 오는 넉넉함 — 게임 하나가 스토어 여러 행으로 오고, 위 줄과 겹치는 게임을 JS 에서 버린다 */
const OVERFETCH = 5;

const homeRows = () => and(mainGamesOnly(), showcaseReady(), eq(gamePlatforms.region, HOME_REGION), visiblePlatformsOnly());

/**
 * 이 행보다 같은 기기 스토어 묶음 안에서 SAVING_MIN_AMOUNT 이상 비싼 짝이 있다 —
 * 즉 이 행이 "스토어만 바꿔도 아끼는" 쪽이다. 판정 규칙은 lib/games/saving 과 같아야 한다(카드가 그 함수로 다시 잰다).
 */
function cheaperThanSibling(): SQL {
  const pairs = SAVING_GROUPS.map((group) => {
    const list = sql.join(group.map((p) => sql`${p}`), sql`, `);
    return sql`(${gamePlatforms.platform} in (${list}) and o.platform in (${list}))`;
  });
  return sql`exists (
    select 1 from ${gamePlatforms} o
    where o.game_id = ${gamePlatforms.gameId} and o.region = ${HOME_REGION} and o.currency = ${DISPLAY_CURRENCY}
      and o.platform <> ${gamePlatforms.platform}
      and o.current_price - ${gamePlatforms.currentPrice} >= ${SAVING_MIN_AMOUNT}::int
      and (${sql.join(pairs, sql` or `)})
  )`;
}

/** 스토어만 바꿔도 더 싼 게임 — 싼 쪽 행이 대표 값이 된다. 순서는 할인 줄과 같은 인기순 */
async function storeDeals(db: Db): Promise<GameSummary[]> {
  const rankAgg = popularityRankAgg(db);
  const rows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .leftJoin(rankAgg, eq(rankAgg.gameId, games.id))
    .where(and(homeRows(), eq(gamePlatforms.currency, DISPLAY_CURRENCY), gt(gamePlatforms.currentPrice, 0), cheaperThanSibling()))
    .orderBy(...dealOrder(rankAgg))
    .limit(HOME_RAIL_LIMIT * OVERFETCH);
  return groupSummaries(rows, HOME_RAIL_LIMIT * 2);
}

/**
 * 지금 인기 순위 — 스토어가 준 순번(신선한 것만, popularityRankAgg)이 있는 게임만 선다.
 * 할인 여부를 묻지 않는다. "무엇이 팔리나" 와 "무엇이 싸나" 는 다른 질문이고, 앞의 것이 이 줄의 몫이다.
 * 같은 게임의 행 중에는 싼 값이 먼저 와서 대표 값이 된다.
 */
async function popularNow(db: Db): Promise<GameSummary[]> {
  const rankAgg = popularityRankAgg(db);
  const rows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .innerJoin(rankAgg, eq(rankAgg.gameId, games.id))
    .where(and(homeRows(), gt(gamePlatforms.currentPrice, 0)))
    .orderBy(asc(rankAgg.minRank), baseCurrencyFirst(), asc(gamePlatforms.currentPrice))
    .limit(HOME_RANK_LIMIT * OVERFETCH);
  return groupSummaries(rows, HOME_RANK_LIMIT);
}

/** 만 원 이하 할인 — 테마 줄. 무료는 뺀다(할인 줄과 같은 이유, home.ts 주석) */
async function underBudget(db: Db): Promise<GameSummary[]> {
  const rankAgg = popularityRankAgg(db);
  const rows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .leftJoin(rankAgg, eq(rankAgg.gameId, games.id))
    .where(
      and(
        homeRows(),
        eq(gamePlatforms.currency, DISPLAY_CURRENCY),
        gt(gamePlatforms.discountPct, 0),
        gt(gamePlatforms.currentPrice, 0),
        lte(gamePlatforms.currentPrice, HOME_BUDGET_PRICE),
      ),
    )
    .orderBy(...dealOrder(rankAgg))
    .limit(HOME_RAIL_LIMIT * OVERFETCH);
  return groupSummaries(rows, HOME_RAIL_LIMIT * 2);
}

export type HomeExtras = { storeDeals: GameSummary[]; popular: GameSummary[]; budget: GameSummary[] };

/** 넷을 한꺼번에. 판정(saving), 배지, 장르는 자른 뒤에 채운다 — 잘라 온 조인 행만으로는 배지가 빠진다(fillPlatforms 주석) */
export async function getHomeExtras(): Promise<HomeExtras> {
  const db = getDb();
  // 둘씩만 함께 — 넷을 한꺼번에 띄우면 Neon 컴퓨트가 공유 메모리 부족으로 질의를 죽인다(home.ts 주석)
  const [deals, popular] = await Promise.all([storeDeals(db), popularNow(db)]);
  const budget = await underBudget(db);
  // 채우기는 슬러그로 집는 가벼운 질의라 셋을 함께 띄워도 된다
  const fill = async (list: GameSummary[]) => fillGenres(await fillPlatforms(list));
  const [a, b, c] = await Promise.all([fill(deals), fill(popular), fill(budget)]);
  return { storeDeals: a, popular: b, budget: c };
}
