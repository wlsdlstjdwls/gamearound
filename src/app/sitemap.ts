// sitemap. 0번 파일은 고정 화면, 회사, 인디 글이고, 1번부터는 게임 상세를 SITEMAP_GAMES_PER_FILE 개씩 나눈다.
//
// 왜 나누나: 구글은 파일 하나에 5만 개까지만 읽는다. 카탈로그가 한 번 10배로 불어난 적이 있어(games-list-query-cost)
// 한 파일에 몰아 두면 넘친 날 꼬리 게임이 소리 없이 색인에서 빠진다. 몇 번 파일까지 있는지는 robots.ts 가 같은 함수로 센다.
//
// 장애 때 빈 목록을 내지 않는다 — 던지면 직전 캐시가 남지만, 빈 sitemap 을 내면 검색엔진이 주소가 다 사라졌다고 읽는다.
import type { MetadataRoute } from "next";
import { companyPath, gamePath, indiePath } from "@/lib/routes";
import { SITEMAP_GAMES_PER_FILE, SITEMAP_STATIC_PATHS, siteOrigin } from "@/lib/seo/constants";
import { listSitemapCompanies, listSitemapGames, listSitemapIndie, sitemapGameFileCount } from "@/server/services/seo/sitemap";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — 크롤 주기(가격 8시간)보다 자주 바꿀 내용이 아니다. 하루
export const revalidate = 86400;

export async function generateSitemaps() {
  const files = await sitemapGameFileCount();
  return [{ id: 0 }, ...Array.from({ length: files }, (_, i) => ({ id: i + 1 }))];
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  if (!origin) return [];
  const id = Number(await props.id);

  if (id === 0) {
    const [companies, indie] = await Promise.all([listSitemapCompanies(), listSitemapIndie()]);
    return [
      ...SITEMAP_STATIC_PATHS.map((p) => ({ url: `${origin}${p}` })),
      ...companies.map((c) => ({ url: `${origin}${companyPath(c.slug)}`, lastModified: c.updatedAt })),
      ...indie.map((p) => ({ url: `${origin}${indiePath(p.slug)}`, lastModified: p.updatedAt })),
    ];
  }

  const games = await listSitemapGames((id - 1) * SITEMAP_GAMES_PER_FILE, SITEMAP_GAMES_PER_FILE);
  return games.map((g) => ({ url: `${origin}${gamePath(g.slug)}`, lastModified: g.updatedAt }));
}
