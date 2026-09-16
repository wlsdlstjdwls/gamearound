// /games 목록 — 필터, 정렬, 페이지네이션과 필터 선택지(facets).
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { DISPLAY_CURRENCY } from "@/lib/currency";
import { getDb } from "@/server/db/client";
import { gameGenres, gamePlatforms, games, genres, HOME_REGION, type Platform } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { normalizeForSearch } from "@/lib/slug";
import { DEFAULT_GAME_SORT, parsePlatformValues, type GamesQuery } from "@/lib/games-query";
import { expandPlatformValues } from "@/lib/platform";
import type { GameSummary } from "./dto";
import { attachBestPrice } from "./mappers";
import { allOf, byCompanySlug, inAnySubscription, mainGamesOnly } from "./filters";
import { titleMatch, titleMatches } from "./title-search";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";

export const GAMES_PAGE_SIZE = 36;

/**
 * 정렬 키, 쿼리스트링 변환은 lib/games-query (순수 유틸)에 있다 — 여기서는 조회만 한다.
 * platform 은 스토어("steam"), 갈래("pc"), 또는 그것들을 쉼표로 이은 여러 값("ps5,switch") 이다.
 * 갈래와 스토어를 한 칸에 두는 이유는 주소가 하나만 남기 때문이다 — 칸을 나누면 서로 어긋난
 * 조합(pc + ps5)이 생기고 같은 화면이 두 주소를 갖는다.
 */
export type GameListFilter = Omit<GamesQuery, "platform"> & { platform?: string };

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
function platformAgg(platforms: Platform[]) {
  const db = getDb();
  return db
    .select({
      gameId: gamePlatforms.gameId,
      maxDiscount: sql<number>`max(coalesce(${gamePlatforms.discountPct}, 0))`.as("max_discount"),
      /**
       * 기준 통화로 살 수 있는 게임인가. 할인율순의 첫 정렬 키다.
       *
       * 왜 필요한가: 원화 가격이 없는 게임이 할인율만으로 첫 화면을 차지하는 것을 막는다.
       * 환산은 하지 않으므로(lib/currency) 남은 손잡이는 순서뿐이다 — 원화로 살 수 있는 것을
       * 먼저 세우고, 나머지는 뒤에 그대로 둔다.
       *
       * 이 키를 넣은 계기는 GOG 였다(2026-09-15 실측: 4,910개 중 1,490개가 원화 없음, 거의 GOG).
       * 2026-09-16 에 GOG 를 숨기면서 그 수가 **26개**로 줄었다(일본 스위치 행). 그래도 키는 남긴다 —
       * 26개가 첫 화면을 먹는 것도 같은 문제고, 지역이 늘면 그 수는 다시 는다.
       */
      hasBaseCurrency: sql<boolean>`bool_or(${gamePlatforms.currency} = ${DISPLAY_CURRENCY} and ${gamePlatforms.currentPrice} is not null)`.as("has_base_currency"),
      // 통화가 섞인 min() 은 뜻이 없다 — 정렬 기준은 기준 통화 가격만 본다(외화 전용 게임은 가격 정렬에서 nulls last)
      minPrice: sql<number | null>`min(${gamePlatforms.currentPrice}) filter (where ${gamePlatforms.currency} = ${DISPLAY_CURRENCY})`.as("min_price"),
      maxRelease: sql<string | null>`max(${gamePlatforms.releaseDate})`.as("max_release"),
    })
    .from(gamePlatforms)
    // 목록의 최저가, 할인, 발매일은 기준 지역(한국) 행만 본다. 다른 나라 가격을 섞으면
    // 카드의 할인 배지가 한국에서 살 수 없는 할인을 가리킨다 — 상세 화면에서만 참고로 보여 준다
    .where(and(eq(gamePlatforms.region, HOME_REGION), visiblePlatformsOnly(), platforms.length > 0 ? inArray(gamePlatforms.platform, platforms) : undefined))
    .groupBy(gamePlatforms.gameId)
    .as("agg");
}

async function listGamesRaw(filter: GameListFilter): Promise<GameListResult> {
  const db = getDb();
  const page = Math.max(filter.page ?? 1, 1);
  const sort = filter.sort ?? DEFAULT_GAME_SORT;
  const agg = platformAgg(expandPlatformValues(parsePlatformValues(filter.platform)));

  // 본편만 — DLC 가 목록에 본편처럼 섞이지 않게 모든 목록 쿼리가 이 조건을 탄다
  const conds = [mainGamesOnly()];
  // 최소 할인율은 "할인 중" 을 포함하는 조건이라 둘이 같이 오면 강한 쪽만 건다
  if (filter.minDiscount) conds.push(sql`${agg.maxDiscount} >= ${filter.minDiscount}`);
  else if (filter.onSale) conds.push(sql`${agg.maxDiscount} > 0`);
  // 가격 상한은 기준 통화 가격이 있는 게임에만 뜻이 있다 — min_price 가 null 이면 조건이 자동으로 걸러 낸다
  if (filter.maxPrice !== undefined) conds.push(sql`${agg.minPrice} <= ${filter.maxPrice}`);
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
    conds.push(titleMatches({ hit, score }));
  }
  const where = allOf(...conds);

  // nulls last 로 값 없는 게임(가격 미수집, 출시일 미상)이 앞을 차지하지 않게 한다
  const orderBy = {
    discount: [sql`${agg.hasBaseCurrency} desc`, sql`${agg.maxDiscount} desc nulls last`, sql`${agg.minPrice} asc nulls last`],
    price: [sql`${agg.minPrice} asc nulls last`, sql`${agg.maxDiscount} desc nulls last`],
    release: [sql`${agg.maxRelease} desc nulls last`],
    title: [asc(sql`coalesce(${games.titleKo}, ${games.titleEn})`)],
  }[sort];

  // 건수와 목록은 서로를 기다릴 이유가 없다. DB 실행은 각 10~20ms 인데 왕복이 200ms 대라
  // (Neon us-east-1, 2026-09-15 실측) 직렬로 두면 지연의 거의 전부가 기다림이다
  const [[{ total }], rows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(games)
      .innerJoin(agg, eq(agg.gameId, games.id))
      .where(where),
    db
      .select({ game: games })
      .from(games)
      .innerJoin(agg, eq(agg.gameId, games.id))
      .where(where)
      // 같은 정렬값이 많을 때 페이지 경계에서 중복/누락이 나지 않도록 마지막 키는 항상 고유값(slug)
      .orderBy(...orderBy, asc(games.slug))
      .limit(GAMES_PAGE_SIZE)
      .offset((page - 1) * GAMES_PAGE_SIZE),
  ]);

  return {
    items: await attachBestPrice(rows.map((r) => r.game)),
    total,
    page,
    pageSize: GAMES_PAGE_SIZE,
    totalPages: Math.max(Math.ceil(total / GAMES_PAGE_SIZE), 1),
  };
}

/** 캐시 키. 같은 뜻의 필터가 늘 같은 문자열이 되도록 순서를 고정한다 */
function listKey(f: GameListFilter): string[] {
  return [
    f.q?.trim().toLowerCase() ?? "",
    f.platform ?? "",
    f.genre ?? "",
    f.onSale ? "sale" : "",
    f.minDiscount ? String(f.minDiscount) : "",
    f.maxPrice !== undefined ? String(f.maxPrice) : "",
    f.company ?? "",
    f.subscription ? "sub" : "",
    f.sort ?? DEFAULT_GAME_SORT,
    String(f.page ?? 1),
  ];
}

/**
 * 한 번의 렌더 안에서 같은 목록을 두 곳(머리글의 건수, 격자)이 물어도 조회는 한 번이다.
 *
 * 인자가 문자열 하나인 이유: React cache 는 인자를 참조로 비교한다. 필터 객체를 그대로 넘기면
 * 호출마다 새 객체라 캐시가 절대 맞지 않는다. 그래서 필터를 직렬화해 넘기고 여기서 되돌린다 —
 * 값이 전부 스칼라라 왕복이 안전하다.
 */
const listByJson = cache(async (json: string): Promise<GameListResult> => {
  const filter = JSON.parse(json) as GameListFilter;
  const cached = unstable_cache(() => listGamesRaw(filter), [DTO_CACHE_VERSION, "games", ...listKey(filter)], {
    tags: ["home"],
    revalidate: LIST_REVALIDATE_SECONDS,
  });
  return cached();
});

/** 목록 — 필터 조합별 1시간 캐시. 크롤러 완료 시 `home` 태그로 함께 무효화된다 */
export async function listGames(filter: GameListFilter): Promise<GameListResult> {
  // 키 순서와 같은 순서로 다시 세워야 같은 필터가 늘 같은 문자열이 된다
  const [q, platform, genre, onSale, minDiscount, maxPrice, company, subscription, sort, page] = listKey(filter);
  return listByJson(JSON.stringify({
    q: q || undefined,
    platform: platform || undefined,
    genre: genre || undefined,
    onSale: onSale ? true : undefined,
    minDiscount: (minDiscount ? Number(minDiscount) : undefined) as GameListFilter["minDiscount"],
    // 0("무료")과 "고르지 않음"을 가르는 자리 — 빈 문자열만 undefined 다
    maxPrice: (maxPrice === "" ? undefined : Number(maxPrice)) as GameListFilter["maxPrice"],
    company: company || undefined,
    subscription: subscription ? true : undefined,
    sort: sort as GameListFilter["sort"],
    page: Number(page),
  }));
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
      .where(and(mainGamesOnly(), eq(gamePlatforms.region, HOME_REGION), visiblePlatformsOnly()))
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

/**
 * 필터 선택지 — 게임 수가 늘어도 목록 페이지마다 다시 세지 않게 별도 캐시.
 * React cache 로 한 번 더 감싸는 이유: 한 화면에서 두 곳(머리글의 전체 수, 필터 기둥)이 부른다.
 * 감싸지 않으면 같은 값을 얻자고 왕복을 두 번 한다.
 */
export const getGameFacets = cache(
  unstable_cache(getGameFacetsRaw, [DTO_CACHE_VERSION, "game-facets"], { tags: ["home"], revalidate: LIST_REVALIDATE_SECONDS }),
);
