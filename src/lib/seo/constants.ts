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
  ROUTES.notifications,
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
  // 거르기, 정렬, 쪽 번호가 붙은 목록(2026-11-02). 조합이 장르 × 기기 × 정렬 × 쪽으로 불어나고, 조합마다 캐시가 따로라
  // 봇이 긁으면 처음 보는 조합마다 DB 를 깨운다(Neon 은 질의가 5분 없어야 잠든다 — neon-compute-quota).
  // 담긴 게임과 회사는 sitemap 이 상세 주소로 다 알려 주므로 막아도 색인에서 빠지는 것이 없다.
  // 끝의 "?" 가 있어야 맨 주소(/games)는 열려 있다 — robots 는 앞에서부터 글자로 맞춘다.
  `${ROUTES.game}?`,
  `${ROUTES.upcoming}?`,
  `${ROUTES.company}?`,
  `${ROUTES.news}?`,
];

/**
 * 쿼리가 붙은 목록 화면의 robots 메타. robots.txt 를 지키지 않는 봇이나 바깥 링크로 들어온 경우의 두 번째 방어다 —
 * 색인은 하지 말되 안의 게임 링크는 따라가게 둔다.
 */
export const FILTERED_LIST_ROBOTS = { index: false, follow: true } as const;

/** 쿼리스트링에 값이 하나라도 있는가 */
export function hasQueryValues(sp: Record<string, string | string[] | undefined>): boolean {
  return Object.values(sp).some((v) => (Array.isArray(v) ? v.some(Boolean) : Boolean(v)));
}

/** 목록 화면의 메타데이터에 쿼리가 붙었을 때만 FILTERED_LIST_ROBOTS 를 얹는다 */
export function withListRobots<T extends object>(base: T, sp: Record<string, string | string[] | undefined>): T & { robots?: typeof FILTERED_LIST_ROBOTS } {
  return hasQueryValues(sp) ? { ...base, robots: FILTERED_LIST_ROBOTS } : base;
}

/** 배포 주소. 없으면 null — 상대 주소로는 sitemap 을 만들 수 없어 빈 목록을 낸다 */
export function siteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  return raw ? raw.replace(/\/+$/, "") : null;
}
