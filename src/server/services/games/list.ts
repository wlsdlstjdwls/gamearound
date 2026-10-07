// /games 목록 — 필터, 정렬, 페이지네이션과 필터 선택지(facets).
import { cache } from "react";
import type { PgSelect } from "drizzle-orm/pg-core";
import { unstable_cache } from "next/cache";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { DISPLAY_CURRENCY } from "@/lib/currency";
import { getDb } from "@/server/db/client";
import { gameGenres, gamePlatforms, games, genres, HOME_REGION, type Platform } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { normalizeForSearch } from "@/lib/slug";
import { DEFAULT_GAME_SORT, parsePlatformValues, type GamesQuery } from "@/lib/games-query";
import { expandPlatformValues } from "@/lib/platform";
import { HLTB_RANK_OFFSET, HLTB_RANK_STEPS, POPULARITY_RANK_MAX_AGE_DAYS, REVIEW_RANK_STEPS } from "@/lib/games/popularity";
import type { GameSummary } from "./dto";
import { attachBestPrice, type GameRow } from "./mappers";
import { allOf, byCompanySlug, hasVisiblePlatform, inAnySubscription, inSteamSale, mainGamesOnly, runsOnRig } from "./filters";
import { runningSaleEndsAt } from "@/lib/sales/detect";
import { parseRig } from "@/lib/hardware/rig";
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
       * 이 키를 넣은 계기는 달러 전용 스토어였다(2026-09-15 실측: 4,910개 중 1,490개가 원화 없음).
       * 2026-09-16 에 그 스토어를 숨기면서 수가 **26개**로 줄었다(일본 스위치 행). 그래도 키는 남긴다 —
       * 26개가 첫 화면을 먹는 것도 같은 문제고, 지역이 늘면 그 수는 다시 는다.
       */
      hasBaseCurrency: sql<boolean>`bool_or(${gamePlatforms.currency} = ${DISPLAY_CURRENCY} and ${gamePlatforms.currentPrice} is not null)`.as("has_base_currency"),
      // 통화가 섞인 min() 은 뜻이 없다 — 정렬 기준은 기준 통화 가격만 본다(외화 전용 게임은 가격 정렬에서 nulls last)
      minPrice: sql<number | null>`min(${gamePlatforms.currentPrice}) filter (where ${gamePlatforms.currency} = ${DISPLAY_CURRENCY})`.as("min_price"),
      /**
       * "최신 출시순" 이 세는 값. **이미 나온 날짜만** 본다(2026-09-18).
       * 미래 날짜를 그대로 세면 아직 못 사는 게임이 첫 페이지를 통째로 차지한다 —
       * 이 목록이 답하는 질문은 "무엇이 나왔나" 고, "무엇을 기다리나" 는 /upcoming 이 맡는다.
       */
      maxRelease: sql<string | null>`max(${gamePlatforms.releaseDate}) filter (where ${gamePlatforms.releaseDate} <= current_date)`.as("max_release"),
      /**
       * "인기순" 이 세는 값 — 스토어 인기순위에서 이 게임의 가장 높은 자리(작은 수가 앞).
       *
       * **낡은 순번은 여기서 버린다**(POPULARITY_RANK_MAX_AGE_DAYS). 순위에서 빠진 게임은
       * 갱신할 기회가 없어 마지막 순번으로 굳는데, 그걸 그대로 세면 "인기순" 이
       * "한때 인기였던 순" 이 된다. 거르는 자리를 읽는 쪽에 두는 이유는 쓰는 쪽이 지울 수 없어서다 —
       * 목록 밖으로 나간 게임은 다음 수집에 나타나지 않으므로 아무도 그 행을 찾아가지 않는다.
       *
       * 여러 기기에 순번이 있으면 가장 높은 자리를 쓴다. 게임 하나의 인기는 그중 앞선 쪽이다.
       */
      /**
       * 평가 수(스팀, Xbox 가 기존 요청에 얹어 준다). 인기순의 **두 번째** 키다.
       *
       * 왜 필요한가: 순번은 상위 2,000위까지만 있고 카탈로그는 7만 건이다. 순번 없는 뒷줄이
       * 무순서면 거기서 다시 할인율이 기준이 되고, 그러면 묵은 싸구려가 또 앞에 선다.
       * 평가 수는 판매량 추정의 표준 대리지표다 — 순번 다음으로 좋은 근거다.
       *
       * PS 는 이 값을 주지 않는다(1MB HTML 을 긁어야 한다). 그래서 PS 독점작은 여전히
       * 두 근거를 다 못 받는다 — 그건 PS 인기 목록을 붙여야 풀린다.
       */
      maxReviews: sql<number | null>`max(${gamePlatforms.userScoreCount})`.as("max_reviews"),
      /**
       * 기준 통화로 **값을 받고 파는** 행이 하나라도 있나. 평가 수를 순번 자리로 바꿀 자격이다.
       * hasBaseCurrency 와 다른 값이다 — 저쪽은 가격이 있기만 하면 참이라 무료(0)도 참이 된다.
       */
      /** 한국어 지원을 밝힌 행이 하나라도 있나. 모르는 행(null)은 bool_or 가 건너뛴다 */
      koText: sql<boolean | null>`bool_or(${gamePlatforms.koText})`.as("ko_text"),
      hasPaidPrice: sql<boolean>`bool_or(${gamePlatforms.currency} = ${DISPLAY_CURRENCY} and ${gamePlatforms.currentPrice} > 0)`.as("has_paid_price"),
      minRank: sql<number | null>`min(${gamePlatforms.popularityRank}) filter (
        where ${gamePlatforms.popularityRankAt} >= now() - make_interval(days => ${POPULARITY_RANK_MAX_AGE_DAYS})
      )`.as("min_rank"),
    })
    .from(gamePlatforms)
    // 목록의 최저가, 할인, 발매일은 기준 지역(한국) 행만 본다. 다른 나라 가격을 섞으면
    // 카드의 할인 배지가 한국에서 살 수 없는 할인을 가리킨다 — 상세 화면에서만 참고로 보여 준다
    .where(and(eq(gamePlatforms.region, HOME_REGION), visiblePlatformsOnly(), platforms.length > 0 ? inArray(gamePlatforms.platform, platforms) : undefined))
    .groupBy(gamePlatforms.gameId)
    .as("agg");
}

/**
 * 평가 수를 순번 자리로 바꾸는 SQL 식. 경계는 lib/games/popularity 의 표 하나만 본다 —
 * 숫자를 여기 다시 적으면 두 문장이 갈라져 화면과 테스트가 다른 답을 낸다.
 * 유료 행이 없으면 자리를 주지 않는다(근거는 표 옆 주석에 있다).
 */
function reviewRankExpr(agg: ReturnType<typeof platformAgg>) {
  // 자리와 경계에 ::int 를 붙인다. 안 붙이면 바인딩 파라미터가 text 로 추론돼
  // coalesce(min_rank integer, ...) 가 42804(COALESCE types integer and text cannot be matched)로 깨진다.
  // 빌드도 테스트도 SQL 을 돌리지 않아 이 사고는 배포 뒤에야 드러난다 — 목록 화면이 통째로 500 이 됐다.
  const steps = REVIEW_RANK_STEPS.map(([position, reviews]) => sql`when ${agg.maxReviews} >= ${reviews}::int then ${position}::int`);
  return sql`case when ${agg.hasPaidPrice} then (case ${sql.join(steps, sql` `)} else null::int end) else null::int end`;
}

/**
 * HLTB 기록 인원수를 순번 자리로 바꾸는 SQL 식. 경계는 lib/games/popularity 의 표 하나만 본다.
 *
 * 평가 수 식과 달리 유료 조건이 없다(표 옆 주석의 근거). ::int 를 붙이는 이유는 같다 —
 * 안 붙이면 바인딩이 text 로 추론돼 coalesce 가 42804 로 깨지고 목록이 통째로 500 이 된다.
 */
function hltbRankExpr() {
  const steps = HLTB_RANK_STEPS.map(([position, logged]) => sql`when ${games.hltbLoggedCount} >= ${logged}::int then ${position + HLTB_RANK_OFFSET}::int`);
  return sql`(case ${sql.join(steps, sql` `)} else null::int end)`;
}

async function listGamesRaw(filter: GameListFilter): Promise<GameListResult> {
  const db = getDb();
  const page = Math.max(filter.page ?? 1, 1);
  const sort = filter.sort ?? DEFAULT_GAME_SORT;
  const picked = expandPlatformValues(parsePlatformValues(filter.platform));
  const agg = platformAgg(picked);

  // 본편만 — DLC 가 목록에 본편처럼 섞이지 않게 모든 목록 쿼리가 이 조건을 탄다
  const conds = [mainGamesOnly()];
  // 최소 할인율은 "할인 중" 을 포함하는 조건이라 둘이 같이 오면 강한 쪽만 건다
  if (filter.minDiscount) conds.push(sql`${agg.maxDiscount} >= ${filter.minDiscount}`);
  else if (filter.onSale) conds.push(sql`${agg.maxDiscount} > 0`);
  // 세일이 끝났거나 모르는 키면 조건을 안 건다 — 지난 배너의 링크가 빈 목록으로 열리지 않게
  const saleEndsAt = filter.event ? runningSaleEndsAt(filter.event, new Date()) : null;
  if (saleEndsAt) conds.push(inSteamSale(saleEndsAt));
  // 가격 상한은 기준 통화 가격이 있는 게임에만 뜻이 있다 — min_price 가 null 이면 조건이 자동으로 걸러 낸다
  if (filter.maxPrice !== undefined) conds.push(sql`${agg.minPrice} <= ${filter.maxPrice}`);
  if (filter.company) conds.push(byCompanySlug(filter.company));
  if (filter.subscription) conds.push(inAnySubscription());
  // 무료 제외 — 값을 **아는데 0원인** 게임만 뺀다. min_price 가 null 인 게임(아직 값을 못 긁은 스토어)은
  // 남긴다: 모르는 것을 공짜로 단정하면 목록에서 조용히 사라지고, 값이 붙는 날 이유 없이 되돌아온다
  if (filter.hideFree) conds.push(sql`(${agg.minPrice} is null or ${agg.minPrice} > 0)`);
  // 한국어 — 집계가 이미 한국 행, 고른 플랫폼만 모아서 "고른 기기에서 한국어" 가 된다(games-query 의 korean 주석)
  if (filter.korean) conds.push(sql`${agg.koText} is true`);
  // 주소에 실린 기기. 모양이 어긋난 값은 parseRig 가 null 로 돌려줘 필터가 아예 안 걸린다
  const rig = parseRig(filter.rig);
  if (rig) conds.push(runsOnRig(rig));
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
    /**
     * 검색어가 있는 질의만 한국 행이 없는 게임까지 받는다(2026-09-18 실측 477건, 전부 일본 스위치).
     *
     * 왜 검색어가 있을 때만인가: 기본 목록이 답하는 질문은 "무엇을 살 수 있나" 라서 한국에서 못 사는
     * 게임이 끼면 훑는 사람이 매번 걸려 넘어진다. 그런데 **제목을 찍어 물은** 사람은 그 게임 하나를
     * 찾는 중이다 — 검색 화면(/search)은 이미 그 게임을 주는데 그 아래 "전체 목록에서 찾기" 링크만
     * 0건으로 떨어지고 있었다. 같은 제목에 두 화면이 다른 답을 하지 않게 이 자리를 맞춘다.
     *
     * 집계(agg)는 한국 행만 세는 채로 둔다. 카드의 가격, 할인은 지금처럼 한국 값이고,
     * 한국 행이 없는 게임은 그 자리가 빈다(엔화 값은 attachBestPrice 가 대표로 채운다).
     * 가격, 할인 필터는 집계가 null 이라 저절로 걸러 낸다 — 원화 조건에 엔화 게임이 낄 이유가 없다.
     */
    conds.push(hasVisiblePlatform(picked));
  }
  const where = allOf(...conds);

  // nulls last 로 값 없는 게임(가격 미수집, 출시일 미상)이 앞을 차지하지 않게 한다
  const orderBy = {
    discount: [sql`${agg.hasBaseCurrency} desc`, sql`${agg.maxDiscount} desc nulls last`, sql`${agg.minPrice} asc nulls last`],
    price: [sql`${agg.minPrice} asc nulls last`, sql`${agg.maxDiscount} desc nulls last`],
    release: [sql`${agg.maxRelease} desc nulls last`],
    title: [asc(sql`coalesce(${games.titleKo}, ${games.titleEn})`)],
    /**
     * 순번이 있는 게임은 한 줌이다(실측 1,687건 대 카탈로그 7만). 나머지는 nulls last 로 뒤에 서는데,
     * 그 뒤가 무순서면 2페이지부터 새로고침마다 순서가 바뀐다 — 그래서 뒷줄에도 기준을 준다.
     * 뒷줄의 기준은 할인율순과 같게 둔다: 순위를 모르는 게임들 사이에서 답할 수 있는 질문이 그것뿐이다.
     */
    popular: [
      // 순번이 있으면 그것으로, 없으면 환산한 자리로 **같은 축에** 세운다.
      // 이 한 줄이 없으면 순번 없는 게임은 전부 순번 보유 1,877건 뒤에서 시작한다(24칸 기준 78페이지 뒤).
      //
      // 환산이 둘인 이유는 스토어마다 남는 것이 다르기 때문이다. Xbox 는 평가 수를 주고(81%),
      // 스위치와 Epic 은 둘 다 안 줘서 스토어 밖 값(HLTB)이라야 자리를 받는다.
      // least 로 묶는다 — 둘 중 하나만 있으면 그것이, 둘 다 있으면 **앞선 자리**가 답이다
      // (Postgres 의 least 는 null 을 무시한다, 2026-09-21 확인).
      //
      // 자리가 같으면 실제 순번이 이긴다 — 스토어가 센 값이 우리가 환산한 값보다 낫다.
      sql`coalesce(${agg.minRank}, least(${reviewRankExpr(agg)}, ${hltbRankExpr()})) asc nulls last`,
      sql`(${agg.minRank} is not null) desc`,
      sql`${agg.hasBaseCurrency} desc`,
      // 자리를 못 받은 뒷줄의 기준. 기록 인원수를 평가 수보다 앞에 두는 이유는 기기를 안 가려서다 —
      // 평가 수는 Xbox 행이 있는 게임에만 있어 스위치, Epic 끼리는 비교가 안 된다
      sql`${games.hltbLoggedCount} desc nulls last`,
      sql`${agg.maxReviews} desc nulls last`,
      sql`${agg.maxDiscount} desc nulls last`,
      sql`${agg.minPrice} asc nulls last`,
    ],
  }[sort];

  // 검색어가 있으면 집계를 left join 으로 붙인다 — inner join 이 한국 행 없는 게임을 통째로 지운다.
  // 플랫폼 필터를 강제하던 힘은 위의 hasVisiblePlatform 이 대신 받는다.
  // 조인 종류가 갈리면 빌더 타입도 갈려 제네릭 한 함수에 담기지 않는다. select 모양을 명시해 뒀으니
  // 돌아오는 행 모양은 조인 종류와 무관하다 — 조립은 PgSelect 로 받고 결과에서 한 번만 모양을 밝힌다
  const joinAgg = (qb: PgSelect): PgSelect => (term ? qb.leftJoin(agg, eq(agg.gameId, games.id)) : qb.innerJoin(agg, eq(agg.gameId, games.id)));

  // 건수와 목록은 서로를 기다릴 이유가 없다. DB 실행은 각 10~20ms 인데 왕복이 200ms 대라
  // (Neon us-east-1, 2026-09-15 실측) 직렬로 두면 지연의 거의 전부가 기다림이다
  const [totalRows, pageRows] = await Promise.all([
    joinAgg(db.select({ total: sql<number>`count(*)::int` }).from(games).$dynamic()).where(where),
    joinAgg(db.select({ game: games }).from(games).$dynamic())
      .where(where)
      // 같은 정렬값이 많을 때 페이지 경계에서 중복/누락이 나지 않도록 마지막 키는 항상 고유값(slug)
      .orderBy(...orderBy, asc(games.slug))
      .limit(GAMES_PAGE_SIZE)
      .offset((page - 1) * GAMES_PAGE_SIZE),
  ]);
  const total = (totalRows as Array<{ total: number }>)[0].total;
  const rows = pageRows as Array<{ game: GameRow }>;

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
    f.event ?? "",
    f.minDiscount ? String(f.minDiscount) : "",
    f.maxPrice !== undefined ? String(f.maxPrice) : "",
    f.company ?? "",
    f.subscription ? "sub" : "",
    f.hideFree ? "nofree" : "",
    f.korean ? "ko" : "",
    // 기기는 티어로 실려서 같은 급의 컴퓨터를 쓰는 사람들이 한 캐시를 나눠 쓴다(lib/hardware/rig)
    f.rig ?? "",
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
  const [q, platform, genre, onSale, event, minDiscount, maxPrice, company, subscription, hideFree, korean, rig, sort, page] = listKey(filter);
  return listByJson(JSON.stringify({
    q: q || undefined,
    platform: platform || undefined,
    genre: genre || undefined,
    onSale: onSale ? true : undefined,
    event: event || undefined,
    minDiscount: (minDiscount ? Number(minDiscount) : undefined) as GameListFilter["minDiscount"],
    // 0("무료")과 "고르지 않음"을 가르는 자리 — 빈 문자열만 undefined 다
    maxPrice: (maxPrice === "" ? undefined : Number(maxPrice)) as GameListFilter["maxPrice"],
    company: company || undefined,
    subscription: subscription ? true : undefined,
    hideFree: hideFree ? true : undefined,
    korean: korean ? true : undefined,
    rig: rig || undefined,
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
