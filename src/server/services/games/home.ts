// 홈 데이터 — 할인, 신작, 뉴스 묶음. 캐시 태그 `home`(§4.5).
import { unstable_cache } from "next/cache";
import { and, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, news } from "@/server/db/schema";
import type { HomeData } from "./dto";
import { groupSummaries } from "./mappers";
import { mainGamesOnly } from "./filters";
import { LIST_REVALIDATE_SECONDS } from "@/lib/cache";

const HOME_LIMIT = 12;
const HOME_NEWS_LIMIT = 8;

async function getHomeDataRaw(): Promise<HomeData> {
  const db = getDb();

  // 오늘의 할인: 할인율 desc. 게임당 1개로 묶기 위해 넉넉히 가져와 JS에서 dedupe
  const discountRows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .where(and(mainGamesOnly(), gt(gamePlatforms.discountPct, 0), isNotNull(gamePlatforms.currentPrice)))
    .orderBy(desc(gamePlatforms.discountPct), desc(gamePlatforms.lastSyncedAt))
    .limit(HOME_LIMIT * 4);

  // 최근 출시: 출시일 desc (미래 출시 제외)
  const releaseRows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .where(and(mainGamesOnly(), isNotNull(gamePlatforms.releaseDate), sql`${gamePlatforms.releaseDate} <= current_date`))
    .orderBy(desc(gamePlatforms.releaseDate))
    .limit(HOME_LIMIT * 4);

  const newsRows = await db
    .select({ n: news, slug: games.slug, titleKo: games.titleKo, titleEn: games.titleEn })
    .from(news)
    .leftJoin(games, eq(news.gameId, games.id))
    .orderBy(desc(news.publishedAt))
    .limit(HOME_NEWS_LIMIT);

  return {
    discounts: groupSummaries(discountRows, HOME_LIMIT),
    recentReleases: groupSummaries(releaseRows, HOME_LIMIT),
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
export const getHomeData = unstable_cache(getHomeDataRaw, ["home"], { tags: ["home"], revalidate: LIST_REVALIDATE_SECONDS });
