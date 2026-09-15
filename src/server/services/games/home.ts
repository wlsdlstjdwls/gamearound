// 홈 데이터 — 할인, 신작, 뉴스 묶음. 캐시 태그 `home`(§4.5).
import { unstable_cache } from "next/cache";
import { and, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, HOME_REGION, news } from "@/server/db/schema";
import type { HomeData } from "./dto";
import { fillGenres, fillPlatforms, groupSummaries } from "./mappers";
import { mainGamesOnly } from "./filters";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";
import { DISPLAY_CURRENCY } from "@/lib/currency";

const HOME_LIMIT = 12;
const HOME_NEWS_LIMIT = 8;

async function getHomeDataRaw(): Promise<HomeData> {
  const db = getDb();

  // 목록 화면과 같은 기준을 쓴다 — 홈만 다른 나라 가격을 섞으면 같은 게임이 두 화면에서 다른 값을 말한다
  const homeRegion = eq(gamePlatforms.region, HOME_REGION);
  /**
   * 기준 통화 우선. 할인율만으로 세우면 첫 화면이 통째로 달러가 된다 —
   * 원화 가격이 없는 게임이 1,490개고 거의 GOG 인데 그쪽 할인이 -95% 대다(2026-09-15 실측).
   * 환산은 하지 않으므로(lib/currency) 남은 손잡이는 순서뿐이다. 목록의 hasBaseCurrency 와 같은 규칙.
   */
  const baseCurrencyFirst = sql`(${gamePlatforms.currency} = ${DISPLAY_CURRENCY}) desc`;

  /**
   * 오늘의 할인: 원화 우선 → 할인율 desc. 게임당 1개로 묶기 위해 넉넉히 가져와 JS에서 dedupe.
   *
   * 무료는 뺀다(2026-09-15). 100% 할인(에픽 무료 배포 등)은 할인율 정렬에서 늘 맨 앞에 서서
   * 첫 화면을 통째로 차지하는데, "할인 중인 게임" 이 답해야 하는 질문은 "얼마에 살까" 지
   * "공짜로 받을 게 있나" 가 아니다. 무료는 가격 필터(maxPrice=0)로 따로 찾는 축이다.
   */
  const discountRows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .where(and(mainGamesOnly(), homeRegion, gt(gamePlatforms.discountPct, 0), gt(gamePlatforms.currentPrice, 0)))
    .orderBy(baseCurrencyFirst, desc(gamePlatforms.discountPct), desc(gamePlatforms.lastSyncedAt))
    .limit(HOME_LIMIT * 4);

  // 최근 출시: 출시일 desc (미래 출시 제외)
  const releaseRows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .where(and(mainGamesOnly(), homeRegion, isNotNull(gamePlatforms.releaseDate), sql`${gamePlatforms.releaseDate} <= current_date`))
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
