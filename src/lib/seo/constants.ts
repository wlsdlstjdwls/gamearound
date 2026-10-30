// 검색엔진에 내주는 주소 규칙 — sitemap, robots 가 함께 읽는다.
//
// 배포 주소는 NEXT_PUBLIC_APP_URL 하나만 믿는다(layout 의 metadataBase 와 같은 값). 요청 Host 헤더로 만들면
// 미리 보기 배포 주소가 운영 sitemap 에 섞여 색인된다.
import { ROUTES } from "@/lib/routes";

/** 파일 하나에 싣는 게임 주소 수. 구글 한도는 5만 개, 50MB 라 여유를 둔다 — 2026-10-30 실측 공개 본편 약 1만 5천 개 */
export const SITEMAP_GAMES_PER_FILE = 40_000;

/** sitemap 에 같이 싣는 고정 화면. 로그인해야 쓰는 화면, 쓰기 화면은 넣지 않는다 */
export const SITEMAP_STATIC_PATHS: readonly string[] = [
  ROUTES.home,
  ROUTES.game,
  ROUTES.upcoming,
  ROUTES.sales,
  ROUTES.news,
  ROUTES.company,
  ROUTES.indie,
  ROUTES.hallOfFame,
  ROUTES.rookies,
  ROUTES.playtests,
  ROUTES.board,
  ROUTES.lounge,
];

/**
 * 크롤러가 들어가지 않을 경로. 들어가 봐야 로그인 화면으로 튕기거나(내 화면) 색인할 내용이 없다(쓰기, 결제, 관리).
 * 공개 상세 아래에 붙은 개인 화면(/indie/mine, /board/write)도 여기서 막는다 — 앞 조각이 공개라 allow 에 묻힌다.
 */
export const ROBOTS_DISALLOW: readonly string[] = [
  ROUTES.admin,
  "/api/",
  ROUTES.vendor,
  ROUTES.me,
  ROUTES.settings,
  ROUTES.wishlist,
  ROUTES.alerts,
  ROUTES.welcome,
  ROUTES.signIn,
  ROUTES.signUp,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.indieMine,
  ROUTES.indieNew,
  ROUTES.shopsJoin,
  `${ROUTES.board}/write`,
  `${ROUTES.board}/mine`,
  `${ROUTES.lounge}/write`,
  `${ROUTES.lounge}/mine`,
  `${ROUTES.lounge}/comments`,
  // 검색 결과는 사람마다 다른 낱말이 만든 얇은 화면이다 — 색인되면 검색 결과 안의 검색 결과가 된다
  ROUTES.search,
];

/** 배포 주소. 없으면 null — 상대 주소로는 sitemap 을 만들 수 없어 빈 목록을 낸다 */
export function siteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  return raw ? raw.replace(/\/+$/, "") : null;
}
