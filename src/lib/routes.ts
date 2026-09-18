// 라우트 경로 단일 원천. 컴포넌트, 액션, proxy에서 문자열 리터럴 대신 이 객체를 쓴다.
export const ROUTES = {
  home: "/",
  search: "/search",
  game: "/games",
  /** 스팀 정기 세일 예상 일정 — 수집이 아니라 lib/sales/calendar 의 계산 결과다 */
  sales: "/sales",
  /** 출시예정. 목록의 "최신 출시순" 과 묻는 질문이 달라 화면을 가른다(services/games/upcoming) */
  upcoming: "/upcoming",
  signIn: "/sign-in",
  signUp: "/sign-up",
  wishlist: "/wishlist",
  alerts: "/alerts",
  settings: "/settings",
  /** 내 기기 — 사양 판정의 한쪽 항이다(설계 §7 "설정") */
  settingsDevices: "/settings/devices",
  admin: "/admin",
  vendor: "/vendor",
  /** 매장(오프라인 판매처). 디지털 스토어와 낱말을 가르려고 shop 을 쓴다 — 설계서 §1 */
  shops: "/shops",
  /** 입점 랜딩. 매장을 데려오는 화면이라 /shops 와 따로 둔다 */
  business: "/business",
  shopsJoin: "/shops/join",
  /** 신청 상태. 심사 중, 반려 사유, 재신청이 한 화면에서 끝난다(설계서 §11) */
  shopsJoinStatus: "/shops/join/status",
  /**
   * 매장 관리자 콘솔. `/admin/shops` 로 두면 주소를 잘못 쳤을 때 `/admin` 으로 들어간다.
   * 경로 분리는 실수 방지일 뿐이고, 진짜 방어는 requireRoleOrForbid("admin") 이다.
   */
  shopsAdmin: "/shops/admin",
  forbidden: "/403",
  terms: "/terms",
  privacy: "/privacy",
  company: "/companies",
  apiAuthMe: "/api/auth/me",
  apiPushSubscribe: "/api/push/subscribe",
  /** 뉴스 썸네일 프록시 — 매체 CDN 이 핫링크를 막아 서버가 대신 받는다(lib/news/thumbnail) */
  apiNewsThumbnail: "/api/news/thumbnail",
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

/**
 * 매장 slug 로 쓸 수 없는 말. `/shops/[slug]` 가 `/shops/admin` 같은 고정 경로를 가리면
 * 그 화면이 통째로 가려진다 — 입점 신청에서 이 목록을 막는다.
 */
export const RESERVED_SHOP_SLUGS = ["admin", "join", "new", "search", "api"] as const;

export function shopPath(slug: string): string {
  return `${ROUTES.shops}/${encodeURIComponent(slug)}`;
}

/** 매장주 콘솔은 매장별로 갈린다 */
export function vendorShopPath(slug: string): string {
  return `${ROUTES.vendor}/${encodeURIComponent(slug)}`;
}

/** 가격 변동 그래프 — 게임 상세의 하위 화면 */
export function gamePricesPath(slug: string): string {
  return `${gamePath(slug)}/prices`;
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
