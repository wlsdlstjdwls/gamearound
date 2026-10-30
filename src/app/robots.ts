// robots.txt. 막을 경로와 sitemap 파일 목록은 lib/seo/constants, app/sitemap 이 정한다.
//
// 운영 주소가 아닌 배포(미리 보기, 로컬)는 통째로 막는다 — 같은 화면이 두 주소로 색인되면 운영 주소가 중복으로 밀린다.
// 운영 판정은 Vercel 이 넣는 VERCEL_ENV 로 한다. 주소 문자열을 비교하면 도메인을 바꾼 날 운영이 막힌다.
import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW, siteOrigin } from "@/lib/seo/constants";
import { sitemapGameFileCount } from "@/server/services/seo/sitemap";

// sitemap 과 같은 주기 — 파일 수가 바뀌면 같이 바뀌어야 한다. 하루
export const revalidate = 86400;

/** Vercel 이 운영 배포에만 넣는 값 */
const PRODUCTION_ENV = "production";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = siteOrigin();
  if (process.env.VERCEL_ENV !== PRODUCTION_ENV || !origin) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const files = await sitemapGameFileCount();
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...ROBOTS_DISALLOW] },
    // 0번은 고정 화면, 회사, 인디 글, 1번부터 게임이다(app/sitemap)
    sitemap: Array.from({ length: files + 1 }, (_, i) => `${origin}/sitemap/${i}.xml`),
    host: origin,
  };
}
