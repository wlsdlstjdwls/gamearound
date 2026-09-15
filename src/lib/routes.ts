// 라우트 경로 단일 원천. 컴포넌트, 액션, proxy에서 문자열 리터럴 대신 이 객체를 쓴다.
export const ROUTES = {
  home: "/",
  search: "/search",
  game: "/games",
  signIn: "/sign-in",
  signUp: "/sign-up",
  wishlist: "/wishlist",
  alerts: "/alerts",
  settings: "/settings",
  admin: "/admin",
  vendor: "/vendor",
  forbidden: "/403",
  terms: "/terms",
  privacy: "/privacy",
  company: "/companies",
  apiAuthMe: "/api/auth/me",
  apiPushSubscribe: "/api/push/subscribe",
} as const;

/** 로그인 후 돌아갈 경로를 붙인 로그인 URL. next가 없거나 안전하지 않으면 붙이지 않는다 */
export function signInPath(next?: string | null): string {
  const safe = safeNextPath(next);
  return safe === ROUTES.home ? ROUTES.signIn : `${ROUTES.signIn}?next=${encodeURIComponent(safe)}`;
}

// "//evil.com", 백슬래시, "@", 공백/제어문자는 origin 뒤에 붙였을 때 다른 호스트로 해석되거나 헤더 인젝션이 된다
const UNSAFE_NEXT = /^\/\/|[@\\]|[\s\x00-\x1f]/;

/**
 * 오픈 리다이렉트 방지: 같은 오리진의 앱 경로("/...")만 허용, 그 외는 홈.
 * 인증 페이지 자체로 되돌아가는 것도 막는다(무한 루프 방지).
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || UNSAFE_NEXT.test(raw)) return ROUTES.home;
  if (raw.startsWith(ROUTES.signIn) || raw.startsWith(ROUTES.signUp)) return ROUTES.home;
  return raw;
}

export function gamePath(slug: string): string {
  return `${ROUTES.game}/${encodeURIComponent(slug)}`;
}

export function companyPath(slug: string): string {
  return `${ROUTES.company}/${encodeURIComponent(slug)}`;
}

/** 가격 변동 그래프 — 게임 상세의 하위 화면 */
export function gamePricesPath(slug: string): string {
  return `${gamePath(slug)}/prices`;
}

/** 패치 기록, 플랫폼별 패치 속도 — 게임 상세의 하위 화면 */
export function gamePatchesPath(slug: string): string {
  return `${gamePath(slug)}/patches`;
}

/**
 * "/sign-in?next=%2Fadmin" 같은 (pathname+search) 문자열에서 next 를 꺼내 안전 경로로 돌려준다.
 * proxy 가 넘긴 PATHNAME_HEADER 값을 layout 에서 해석할 때 쓴다(layout 은 searchParams 를 받지 못함).
 */
export function nextFromPathWithSearch(pathWithSearch: string | null | undefined): string {
  if (!pathWithSearch) return ROUTES.home;
  const q = pathWithSearch.indexOf("?");
  if (q === -1) return ROUTES.home;
  return safeNextPath(new URLSearchParams(pathWithSearch.slice(q + 1)).get("next"));
}
