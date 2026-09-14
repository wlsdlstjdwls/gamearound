// /games 목록 — 필터, 정렬, 페이지네이션과 필터 선택지(facets).
import { unstable_cache } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import { DISPLAY_CURRENCY } from "@/lib/currency";
import { getDb } from "@/server/db/client";
import { gameGenres, gamePlatforms, games, genres, HOME_REGION, type Platform } from "@/server/db/schema";
import { normalizeForSearch } from "@/lib/slug";
import { DEFAULT_GAME_SORT, type GamesQuery } from "@/lib/games-query";
import type { GameSummary } from "./dto";
import { attachBestPrice } from "./mappers";
import { allOf, byCompanySlug, inAnySubscription, mainGamesOnly } from "./filters";
import { titleMatch, TRGM_THRESHOLD } from "./title-search";
import { LIST_REVALIDATE_SECONDS } from "@/lib/cache";

export const GAMES_PAGE_SIZE = 36;

/** 정렬 키, 쿼리스트링 변환은 lib/games-query (순수 유틸)에 있다 — 여기서는 조회만 한다 */
export type GameListFilter = Omit<GamesQuery, "platform"> & { platform?: Platform };

export type GameListResult = {
  items: GameSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** 필터 UI 가 고를 수 있는 값 — 실제로 게임이 붙어 있는 것만 */
export type GameFacets = {
  platforms: Array<{ platform: Platform; count: number }>;
  genres: Array<{ name: string; count: number }>;
  total: number;
};

/**
 * 게임별 플랫폼 집계 서브쿼리. platform 필터가 있으면 그 플랫폼만 집계하므로
 * inner join 하는 것만으로 "그 플랫폼을 가진 게임"으로 좁혀진다.
 */
function platformAgg(platform?: Platform) {
  const db = getDb();
  return db
    .select({
      gameId: gamePlatforms.gameId,
      maxDiscount: sql<number>`max(coalesce(${gamePlatforms.discountPct}, 0))`.as("max_discount"),
      // 통화가 섞인 min() 은 뜻이 없다 — 정렬 기준은 기준 통화 가격만 본다(외화 전용 게임은 가격 정렬에서 nulls last)
      minPrice: sql<number | null>`min(${gamePlatforms.currentPrice}) filter (where ${gamePlatforms.currency} = ${DISPLAY_CURRENCY})`.as("min_price"),
      maxRelease: sql<string | null>`max(${gamePlatforms.releaseDate})`.as("max_release"),
    })
    .from(gamePlatforms)
    // 목록의 최저가, 할인, 발매일은 기준 지역(한국) 행만 본다. 다른 나라 가격을 섞으면
    // 카드의 할인 배지가 한국에서 살 수 없는 할인을 가리킨다 — 상세 화면에서만 참고로 보여 준다
    .where(and(eq(gamePlatforms.region, HOME_REGION), platform ? eq(gamePlatforms.platform, platform) : undefined))
    .groupBy(gamePlatforms.gameId)
    .as("agg");
}

async function listGamesRaw(filter: GameListFilter): Promise<GameListResult> {
  const db = getDb();
  const page = Math.max(filter.page ?? 1, 1);
  const sort = filter.sort ?? DEFAULT_GAME_SORT;
  const agg = platformAgg(filter.platform);

  // 본편만 — DLC 가 목록에 본편처럼 섞이지 않게 모든 목록 쿼리가 이 조건을 탄다
  const conds = [mainGamesOnly()];
  if (filter.onSale) conds.push(sql`${agg.maxDiscount} > 0`);
  if (filter.company) conds.push(byCompanySlug(filter.company));
  if (filter.subscription) conds.push(inAnySubscription());
  if (filter.genre) {
    conds.push(
      sql`exists (select 1 from ${gameGenres} inner join ${genres} on ${genres.id} = ${gameGenres.genreId}
                  where ${gameGenres.gameId} = ${games.id} and ${genres.name} = ${filter.genre})`,
    );
  }
  const term = filter.q ? normalizeForSearch(filter.q) : "";
  if (term) {
    const { hit, score } = titleMatch(filter.q!);
    conds.push(sql`(${hit} or ${score} >= ${TRGM_THRESHOLD})`);
  }
  const where = allOf(...conds);

  // nulls last 로 값 없는 게임(가격 미수집, 출시일 미상)이 앞을 차지하지 않게 한다
  const orderBy = {
    discount: [sql`${agg.maxDiscount} desc nulls last`, sql`${agg.minPrice} asc nulls last`],
    price: [sql`${agg.minPrice} asc nulls last`, sql`${agg.maxDiscount} desc nulls last`],
    release: [sql`${agg.maxRelease} desc nulls last`],
    title: [asc(sql`coalesce(${games.titleKo}, ${games.titleEn})`)],
  }[sort];

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(games)
    .innerJoin(agg, eq(agg.gameId, games.id))
    .where(where);

  const rows = await db
    .select({ game: games })
    .from(games)
    .innerJoin(agg, eq(agg.gameId, games.id))
    .where(where)
    // 같은 정렬값이 많을 때 페이지 경계에서 중복/누락이 나지 않도록 마지막 키는 항상 고유값(slug)
    .orderBy(...orderBy, asc(games.slug))
    .limit(GAMES_PAGE_SIZE)
    .offset((page - 1) * GAMES_PAGE_SIZE);

  return {
    items: await attachBestPrice(rows.map((r) => r.game)),
    total,
    page,
    pageSize: GAMES_PAGE_SIZE,
    totalPages: Math.max(Math.ceil(total / GAMES_PAGE_SIZE), 1),
  };
}

/** 목록 — 필터 조합별 1시간 캐시. 크롤러 완료 시 `home` 태그로 함께 무효화된다 */
export async function listGames(filter: GameListFilter): Promise<GameListResult> {
  const key = [filter.q?.trim().toLowerCase() ?? "", filter.platform ?? "", filter.genre ?? "", filter.onSale ? "sale" : "", filter.company ?? "", filter.subscription ? "sub" : "", filter.sort ?? DEFAULT_GAME_SORT, String(filter.page ?? 1)];
  const cached = unstable_cache(() => listGamesRaw(filter), ["games", ...key], { tags: ["home"], revalidate: LIST_REVALIDATE_SECONDS });
  return cached();
}

async function getGameFacetsRaw(): Promise<GameFacets> {
  const db = getDb();
  const [platformRows, genreRows, [{ total }]] = await Promise.all([
    db
      .select({ platform: gamePlatforms.platform, count: sql<number>`count(distinct ${gamePlatforms.gameId})::int` })
      .from(gamePlatforms)
      .innerJoin(games, eq(games.id, gamePlatforms.gameId))
      // 필터 선택지도 기준 지역만 센다 — 일본 스토어에만 있는 게임이 "스위치 1,234개" 를 부풀리면
      // 그 필터를 눌렀을 때 목록(위 집계도 기준 지역만 본다)과 수가 안 맞는다
      .where(and(mainGamesOnly(), eq(gamePlatforms.region, HOME_REGION)))
      .groupBy(gamePlatforms.platform),
    db
      .select({ name: genres.name, count: sql<number>`count(*)::int` })
      .from(gameGenres)
      .innerJoin(genres, eq(genres.id, gameGenres.genreId))
      .innerJoin(games, eq(games.id, gameGenres.gameId))
      .where(mainGamesOnly())
      .groupBy(genres.name),
    db.select({ total: sql<number>`count(*)::int` }).from(games).where(mainGamesOnly()),
  ]);
  return {
    platforms: platformRows.sort((a, b) => b.count - a.count),
    genres: genreRows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko")),
    total,
  };
}

/** 필터 선택지 — 게임 수가 늘어도 목록 페이지마다 다시 세지 않게 별도 캐시 */
export const getGameFacets = unstable_cache(getGameFacetsRaw, ["game-facets"], { tags: ["home"], revalidate: LIST_REVALIDATE_SECONDS });
