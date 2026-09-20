// 홈 데이터 — 할인, 신작, 뉴스 묶음. 캐시 태그 `home`(§4.5).
import { unstable_cache } from "next/cache";
import { and, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, HOME_REGION, news } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import type { HomeData } from "./dto";
import { fillGenres, fillPlatforms, groupSummaries } from "./mappers";
import { mainGamesOnly } from "./filters";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";
import { DISPLAY_CURRENCY } from "@/lib/currency";
import { POPULARITY_RANK_MAX_AGE_DAYS } from "@/lib/games/popularity";

const HOME_LIMIT = 12;
const HOME_NEWS_LIMIT = 8;

async function getHomeDataRaw(): Promise<HomeData> {
  const db = getDb();

  // 목록 화면과 같은 기준을 쓴다 — 홈만 다른 나라 가격을 섞으면 같은 게임이 두 화면에서 다른 값을 말한다
  const homeRegion = eq(gamePlatforms.region, HOME_REGION);
  /**
   * 기준 통화 우선. 할인율만으로 세우면 첫 화면이 통째로 달러가 된다 —
   * 원화 가격이 없는 게임이 1,490개였고 그쪽 할인이 -95% 대였다(2026-09-15 실측, 달러 전용 스토어).
   * 환산은 하지 않으므로(lib/currency) 남은 손잡이는 순서뿐이다. 목록의 hasBaseCurrency 와 같은 규칙.
   */
  const baseCurrencyFirst = sql`(${gamePlatforms.currency} = ${DISPLAY_CURRENCY}) desc`;

  /**
   * 게임 하나의 인기순위 자리. **행이 아니라 게임 단위**로 묶는 이유가 중요하다 —
   * 순번은 스토어가 알려 주는 값이라 지금은 스팀 행에만 붙는다. 조인한 행의 순번을 그대로 세우면
   * 같은 게임의 PS5 할인 행은 순번이 비어 뒤로 밀린다. 게임이 어느 기기에서든 순위에 있으면
   * 그 게임이 인기인 것이다.
   *
   * 낡은 순번은 여기서 버린다(lib/games/popularity 의 주석). 순번 가진 행은 한 줌이라
   * 부분 인덱스만 훑고 끝난다 — 전체 스캔이 아니다.
   */
  const rankAgg = db
    .select({
      gameId: gamePlatforms.gameId,
      minRank: sql<number>`min(${gamePlatforms.popularityRank})`.as("min_rank"),
    })
    .from(gamePlatforms)
    .where(
      and(
        isNotNull(gamePlatforms.popularityRank),
        sql`${gamePlatforms.popularityRankAt} >= now() - make_interval(days => ${POPULARITY_RANK_MAX_AGE_DAYS})`,
      ),
    )
    .groupBy(gamePlatforms.gameId)
    .as("rank_agg");

  /**
   * 오늘의 할인: 원화 우선 → **인기순** → 할인율 desc. 게임당 1개로 묶기 위해 넉넉히 가져와 JS에서 dedupe.
   *
   * 2026-09-21 에 할인율순에서 인기순으로 바꿨다. 할인율로 세우면 "가장 많이 깎인 것" 이 오는데
   * 그건 대개 묵은 게임이다(lib/games-query 의 MIN_DISCOUNT_STEPS 주석이 이미 알던 사실이다).
   * 홈 첫 줄이 답해야 하는 질문은 "지금 살 만한 게 뭔가" 지 "무엇이 가장 깎였나" 가 아니다.
   *
   * 무료는 뺀다(2026-09-15). 100% 할인(에픽 무료 배포 등)은 할인율 정렬에서 늘 맨 앞에 서서
   * 첫 화면을 통째로 차지하는데, "할인 중인 게임" 이 답해야 하는 질문은 "얼마에 살까" 지
   * "공짜로 받을 게 있나" 가 아니다. 무료는 가격 필터(maxPrice=0)로 따로 찾는 축이다.
   *
   * 아는 한계: 순번이 스팀에만 있어 **콘솔 전용작은 순위를 못 받는다**. 멀티플랫폼 게임은
   * 스팀 순위로 뽑혀 가장 싼 기기 값으로 서므로(attachBestPrice) 화면이 PC 전용이 되지는 않지만,
   * 콘솔 독점작은 이 줄에 오르지 못한다. PS, Xbox 인기 목록을 붙이면 그때 풀린다.
   */
  const discountRows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .leftJoin(rankAgg, eq(rankAgg.gameId, games.id))
    .where(and(mainGamesOnly(), homeRegion, visiblePlatformsOnly(), gt(gamePlatforms.discountPct, 0), gt(gamePlatforms.currentPrice, 0)))
    .orderBy(baseCurrencyFirst, sql`${rankAgg.minRank} asc nulls last`, desc(gamePlatforms.discountPct), desc(gamePlatforms.lastSyncedAt))
    .limit(HOME_LIMIT * 4);

  // 최근 출시: 출시일 desc (미래 출시 제외)
  const releaseRows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .where(and(mainGamesOnly(), homeRegion, visiblePlatformsOnly(), isNotNull(gamePlatforms.releaseDate), sql`${gamePlatforms.releaseDate} <= current_date`))
    .orderBy(desc(gamePlatforms.releaseDate), baseCurrencyFirst)
    .limit(HOME_LIMIT * 4);

  const newsRows = await db
    .select({ n: news, slug: games.slug, titleKo: games.titleKo, titleEn: games.titleEn })
    .from(news)
    .leftJoin(games, eq(news.gameId, games.id))
    .orderBy(desc(news.publishedAt))
    .limit(HOME_NEWS_LIMIT);

  // 잘라 온 조인 행만으로는 배지가 빠진다 — 자른 뒤 게임 단위로 한 번 더 채운다(fillPlatforms 주석)
  const fill = async (rows: typeof discountRows) => fillGenres(await fillPlatforms(groupSummaries(rows, HOME_LIMIT)));
  const [discounts, recentReleases] = await Promise.all([fill(discountRows), fill(releaseRows)]);

  return {
    discounts,
    recentReleases,
    latestNews: newsRows.map(({ n, slug, titleKo, titleEn }) => ({
      id: n.id,
      title: n.title,
      url: n.url,
      sourceName: n.sourceName,
      thumbnailUrl: n.thumbnailUrl,
      publishedAt: n.publishedAt.toISOString(),
      game: slug && titleEn ? { slug, title: titleKo ?? titleEn } : null,
    })),
  };
}

/** 홈 데이터 — 태그 `home`. 크롤러 완료 시 /api/revalidate 가 항상 무효화 */
export const getHomeData = unstable_cache(getHomeDataRaw, [DTO_CACHE_VERSION, "home"], { tags: ["home"], revalidate: LIST_REVALIDATE_SECONDS });
