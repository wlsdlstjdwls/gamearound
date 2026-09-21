// 뉴스 전체 목록 — 홈의 최신 8건(home.ts)이 넘치는 자리를 받는 축.
//
// 홈과 갈라 둔 이유: 홈은 "오늘 뭘 사면 되는가" 한 장이라 뉴스에 8줄만 내준다.
// 그 8줄에서 밀려난 기사는 홈만 있는 동안 어디에서도 못 읽었다 — 홈의 "전체 보기" 가
// 게임 목록으로 가던 것도 갈 곳이 없어서였다.
//
// 게임과 이어지지 않은 기사도 담는다(left join): 매체는 게임 하나를 집지 않는 업계 기사도 낸다.
import { unstable_cache } from "next/cache";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { games, news } from "@/server/db/schema";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";
import type { NewsDto } from "./dto";

/**
 * 한 페이지에 몇 줄. 뉴스 한 줄은 썸네일 72px 높이라 30줄이 대략 두 화면이다 —
 * 게임 목록(36장 격자)보다 적게 잡는 이유가 그것이다.
 */
export const NEWS_PAGE_SIZE = 30;

export type NewsListResult = {
  items: NewsDto[];
  total: number;
  page: number;
  totalPages: number;
};

async function listNewsRaw(page: number): Promise<NewsListResult> {
  const db = getDb();

  const [rows, [countRow]] = await Promise.all([
    db
      .select({ n: news, slug: games.slug, titleKo: games.titleKo, titleEn: games.titleEn })
      .from(news)
      .leftJoin(games, eq(news.gameId, games.id))
      .orderBy(desc(news.publishedAt))
      .limit(NEWS_PAGE_SIZE)
      .offset((page - 1) * NEWS_PAGE_SIZE),
    db.select({ total: sql<number>`count(*)::int` }).from(news),
  ]);

  const total = countRow?.total ?? 0;
  return {
    items: rows.map(({ n, slug, titleKo, titleEn }) => ({
      id: n.id,
      title: n.title,
      url: n.url,
      sourceName: n.sourceName,
      thumbnailUrl: n.thumbnailUrl,
      publishedAt: n.publishedAt.toISOString(),
      game: slug && titleEn ? { slug, title: titleKo ?? titleEn } : null,
    })),
    total,
    page,
    totalPages: Math.max(Math.ceil(total / NEWS_PAGE_SIZE), 1),
  };
}

/** 뉴스 목록 — 태그 `home`. 크롤러 완료 시 /api/revalidate 가 항상 무효화한다 */
export const listNews = (page: number) =>
  unstable_cache(() => listNewsRaw(page), [DTO_CACHE_VERSION, "news", String(page)], {
    tags: ["home"],
    revalidate: LIST_REVALIDATE_SECONDS,
  })();
