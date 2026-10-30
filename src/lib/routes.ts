// 라우트 경로 단일 원천. 컴포넌트, 액션, proxy에서 문자열 리터럴 대신 이 객체를 쓴다.
import { PLAN_PARAM, type PlanChoice } from "@/lib/payments/products";

export const ROUTES = {
  home: "/",
  search: "/search",
  game: "/games",
  /** 스팀 정기 세일 예상 일정 — 수집이 아니라 lib/sales/calendar 의 계산 결과다 */
  sales: "/sales",
  /** 출시예정. 목록의 "최신 출시순" 과 묻는 질문이 달라 화면을 가른다(services/games/upcoming) */
  upcoming: "/upcoming",
  /** 게임 뉴스 전체. 홈은 최신 8건만 내주고 나머지는 여기서 읽는다(services/games/news) */
  news: "/news",
  signIn: "/sign-in",
  signUp: "/sign-up",
  /** 비밀번호 재설정 1단계(메일 받기). 2단계는 메일 링크가 여는 resetPassword 다 */
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  wishlist: "/wishlist",
  /** 내 활동(기획서 v2.0 S-24): 프로필 사진, 내가 쓴 글, 저장한 글 */
  me: "/me",
  apiAvatarUpload: "/api/me/avatar/upload",
  alerts: "/alerts",
  /** 알림함 전체(2026-10-30). 머리 종 팝오버는 최근 20건만 펴서 그보다 오래된 알림이 읽을 자리가 여기다 */
  notifications: "/notifications",
  settings: "/settings",
  /**
   * 첫 로그인 온보딩. /welcome 은 재개 지점으로 넘기기만 하고, 실제 화면은 /welcome/<단계> 다.
   * 단계를 주소로 가르는 이유는 lib/onboarding/steps 머리 주석에 있다(뒤로가기).
   */
  welcome: "/welcome",
  /** 내 기기 — 사양 판정의 한쪽 항이다(설계 §7 "설정") */
  settingsDevices: "/settings/devices",
  /** 관리자 첫 화면 — 업무 현황판. 묶음마다 쌓인 일 건수를 세우고, 숫자가 곧 그 일을 하는 화면으로 가는 길이다 */
  admin: "/admin",
  /**
   * 관리자 로그인(2026-10-30 회원 로그인에서 뗐다). 관리자 계정은 회원 `/sign-in` 으로도 들어올 수 있다 — 화면만 둘이고 세션은 하나다.
   * `/admin` 아래지만 `(admin)` 그룹 밖에 산다(그룹 레이아웃의 역할 검사가 로그인 화면 자체를 막지 않게)
   */
  adminSignIn: "/admin/sign-in",
  /** 스토어별 수집 현황. 앞에는 관리자 첫 화면이었다(2026-10-29 업무 현황판에 자리를 내줬다) */
  adminSync: "/admin/sync",
  /** 수집 실행 기록. 수집 현황이 요약만 보여 주는 값의 전문이 여기 있다 */
  adminSyncLogs: "/admin/sync-logs",
  /**
   * 매칭 대기 큐. `/admin` 안에 섞여 있던 자리를 뗐다 — 수집 현황은 읽기만 하는 화면이고
   * 여기는 사람이 눌러야 줄이 줄어드는 화면이라, 섞여 있으면 메뉴가 "남은 일"을 셀 자리를 못 준다.
   */
  adminMatches: "/admin/matches",
  /** 데이터 점검(sync/quality). 기계가 찾은 카탈로그 문제 중 사람이 볼 것. 자동으로 고친 기록도 여기서 본다 */
  adminDataIssues: "/admin/data-issues",
  /** 회사 이름 확정 큐 */
  adminCompanies: "/admin/companies",
  /** 상품 매핑 검수 — 매핑 배치(§5.2)가 후보만 남긴 상품을 사람이 마무리하는 자리 */
  adminProducts: "/admin/products",
  /** 관리자 할 일 판. 자동으로 쌓이는 검수 큐와 달리 사람이 직접 적는 일이 사는 자리 */
  adminTasks: "/admin/tasks",
  /** 판에서 걷은 할 일(2026-10-02). 치우기가 지우기였던 때는 이력이 남지 않았다 */
  adminTasksArchive: "/admin/tasks/archive",
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
  /** 인디 홍보 — 개발자가 직접 쓰는 소개 글. 공개 목록과 상세는 누구나, 쓰기와 내 글은 로그인 */
  indie: "/indie",
  indieNew: "/indie/new",
  indieMine: "/indie/mine",
  /** 내 게임 통계(2026-10-27). /indie/mine/[id] 는 uuid 라 낱말 "stats" 와 부딪히지 않는다 */
  indieStats: "/indie/mine/stats",
  /** 내 광고 결제 내역(2026-10-27). /indie/mine/[id] 는 uuid 라 낱말과 부딪히지 않는다 */
  indiePayments: "/indie/mine/payments",
  /** 메이커 멤버십(2026-10-27). /indie/mine/[id] 는 uuid 라 낱말과 부딪히지 않는다 */
  membership: "/indie/mine/membership",
  /** 광고, 멤버십 요금 안내와 구매 입구(2026-10-28). 메뉴 칸은 없고 등록현황, 통계, 내 게임 상세의 안내 판(payments/plan-nudge)으로 들어온다 */
  makerPlans: "/indie/mine/plans",
  /** 내 광고 성과(2026-10-27, 기획서 4.4). /indie/mine/[id] 는 uuid 라 낱말과 부딪히지 않는다 */
  indieAds: "/indie/mine/ads",
  /** 플레이테스트 모아 보기(2026-10-27). /indie 아래에 두지 않는다 — /indie/<slug> 가 인디 글 주소라 부딪힌다 */
  playtests: "/playtests",
  /**
   * 기획서 v2.0 의 새 갈래(2026-10-26). 화면이 생기기 전까지는 "준비 중" 화면이 선다(components/coming-soon).
   * 명예의 전당, 슈퍼루키를 /indie 아래에 두지 않은 이유: /indie/<slug> 가 인디 글 주소라 글 주소와 부딪힌다
   */
  hallOfFame: "/hall-of-fame",
  rookies: "/rookies",
  board: "/board",
  boardReviews: "/board/reviews",
  boardGuides: "/board/guides",
  boardPromos: "/board/promos",
  /** 게시판 글 전체(기획서 S-10A, 사이드 메뉴 "전체 글") */
  boardAll: "/board/all",
  lounge: "/lounge",
  loungeDevlogs: "/lounge/devlogs",
  loungeQna: "/lounge/qna",
  /** 라운지 글 전체(기획서 S-17) */
  loungeAll: "/lounge/all",
  /** 내 라운지 글에 달린 댓글 모아 보기(2026-10-28, 라운지 홈 현황의 "새 댓글" 칸이 연다) */
  loungeComments: "/lounge/comments",
  /** 인디 홍보 글 신고, 게임 연결 확인 */
  adminIndie: "/admin/indie",
  /** 예약 특전 글 검토 — 게임을 못 이었거나 특전을 못 뽑은 글이 여기 남는다 */
  adminPreorder: "/admin/preorder",
  /** 게시판, 라운지 글과 댓글 숨김(기획서 v2.0 9.2 "게시글 관리") */
  adminPosts: "/admin/posts",
  /** 광고 자리 걸기, 회수(2026-10-27) */
  adminPromotions: "/admin/promotions",
  adminMemberships: "/admin/memberships",
  /** 상품 값, 판매, 요금 카드 문구(2026-10-28, 사용자 "프로모션과 멤버십 설정을 관리자가") */
  adminPricing: "/admin/pricing",
  /** 할인 행사(2026-10-29, 상품과 가격 화면에서 뗐다). 저장은 같은 요금 설정 하나다 */
  adminDiscounts: "/admin/discounts",
  /** 결제와 환불(2026-10-29, 광고 자리 화면 아래에 붙어 있던 결제 목록을 뗐다) */
  adminPayments: "/admin/payments",
  /** 화면 연출 설정(2026-10-28, 명예의 전당 1위 인트로) */
  adminEffects: "/admin/effects",
  /** 시스템관리(2026-10-30): 공통코드, 알림 템플릿, 알림 발송 */
  adminCodes: "/admin/codes",
  adminNotifyTemplates: "/admin/notify-templates",
  adminNotifySends: "/admin/notify-sends",
  /** 통계관리(2026-10-30): 매출현황, 이용현황 */
  adminStatsSales: "/admin/stats/sales",
  adminStatsUsage: "/admin/stats/usage",
  forbidden: "/403",
  terms: "/terms",
  privacy: "/privacy",
  company: "/companies",
  apiAuthMe: "/api/auth/me",
  /** 홈 할인 줄의 개인화판. 홈 캐시를 깨지 않으려고 마운트 뒤 따로 받아 갈아 끼운다(api/me/picks 주석) */
  apiMePicks: "/api/me/picks",
  /** 명예의 전당 "내 게임 자리". 화면 캐시를 깨지 않으려고 마운트 뒤 따로 받는다(api/me/fame 주석) */
  apiMeFame: "/api/me/fame",
  apiPushSubscribe: "/api/push/subscribe",
  /** 뉴스 썸네일 프록시 — 매체 CDN 이 핫링크를 막아 서버가 대신 받는다(lib/news/thumbnail) */
  apiNewsThumbnail: "/api/news/thumbnail",
  /** 게임 상세 조회 기록. 수집이 사람들이 보는 게임을 먼저 갱신하는 데 쓴다(server/game-views) */
  apiGameView: "/api/games/view",
  /** 사이트 방문 한 번(components/visit-beacon). 이용현황의 방문, 유입경로가 이 기록을 센다 */
  apiVisit: "/api/visit",
  /** 광고 카드가 보였다, 눌렸다는 신호(2026-10-27, components/promo/ad-track 이 sendBeacon 으로 보낸다) */
  apiAdTrack: "/api/promo/track",
} as const;

/** 온보딩 단계 주소. 단계 키는 lib/onboarding/steps 의 ONBOARDING_STEPS 다 */
export function welcomeStepPath(step: string): string {
  return `${ROUTES.welcome}/${step}`;
}

/** 설정에서 칸 하나만 고치러 들어온 표식(?from=settings). 저장하면 다음 단계 대신 설정으로 돌아간다 */
export const WELCOME_FROM_PARAM = "from";
export const WELCOME_FROM_SETTINGS = "settings";

/** 설정 화면의 "바꾸기" 가 여는 주소 — 온보딩과 같은 질문 화면을 쓰되 한 칸만 고치고 돌아온다 */
export function welcomeEditPath(step: string): string {
  return `${welcomeStepPath(step)}?${WELCOME_FROM_PARAM}=${WELCOME_FROM_SETTINGS}`;
}

/** 로그인 후 돌아갈 경로를 붙인 로그인 URL. next가 없거나 안전하지 않으면 붙이지 않는다 */
export function signInPath(next?: string | null): string {
  const safe = safeNextPath(next);
  return safe === ROUTES.home ? ROUTES.signIn : `${ROUTES.signIn}?next=${encodeURIComponent(safe)}`;
}

/**
 * 재설정 흐름의 결과 표시. 상태를 주소 꼬리에 싣는 이유: 성공하면 useAuthForm 이 문서를 새로 연다 —
 * 클라이언트 상태로 들고 있으면 그 순간 사라진다.
 */
export const RESET_FLAG = { sent: "sent", done: "reset" } as const;

export function forgotSentPath(): string {
  return `${ROUTES.forgotPassword}?${RESET_FLAG.sent}=1`;
}

export function resetDonePath(): string {
  return `${ROUTES.signIn}?${RESET_FLAG.done}=1`;
}

// "//evil.com", 백슬래시, "@", 공백/제어문자는 origin 뒤에 붙였을 때 다른 호스트로 해석되거나 헤더 인젝션이 된다
const UNSAFE_NEXT = /^\/\/|[@\\]|[\s\x00-\x1f]/;

/**
 * 오픈 리다이렉트 방지: 같은 오리진의 앱 경로("/...")만 허용, 그 외는 홈.
 * 인증 페이지 자체로 되돌아가는 것도 막는다(무한 루프 방지).
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || UNSAFE_NEXT.test(raw)) return ROUTES.home;
  if ([ROUTES.signIn, ROUTES.signUp, ROUTES.forgotPassword, ROUTES.resetPassword, ROUTES.adminSignIn].some((p) => raw.startsWith(p))) return ROUTES.home;
  return raw;
}

/** 명예의 전당 갈래와 달. 명예의 전당 화면의 칩과 인디 상세의 지난 순위 딱지가 같은 주소를 쓴다 */
export function hallOfFamePath(tab: "month" | "history", ym?: string): string {
  const p = new URLSearchParams();
  if (tab === "history") p.set("tab", "history");
  if (ym) p.set("ym", ym);
  const qs = p.toString();
  return qs ? `${ROUTES.hallOfFame}?${qs}` : ROUTES.hallOfFame;
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
 * `invite` 는 반대 방향이다: `/vendor/invite/[token]` 이 고정 경로라 그 이름의 매장은 콘솔이 가려진다.
 */
export const RESERVED_SHOP_SLUGS = ["admin", "join", "new", "search", "api", "invite"] as const;

export function shopPath(slug: string): string {
  return `${ROUTES.shops}/${encodeURIComponent(slug)}`;
}

/** 매장주 콘솔은 매장별로 갈린다 */
export function vendorShopPath(slug: string): string {
  return `${ROUTES.vendor}/${encodeURIComponent(slug)}`;
}

/** 매장주의 판매 목록. 매장 하나짜리 매장주는 /vendor 가 곧장 여기로 보낸다 */
export function vendorListingsPath(slug: string): string {
  return `${vendorShopPath(slug)}/listings`;
}

/**
 * 판매 줄 사진 업로드 토큰 발급(Vercel Blob 클라이언트 업로드의 handleUploadUrl).
 * 파일은 브라우저가 Blob 으로 곧장 보내고, 이 경로는 권한을 보고 토큰만 내준다
 */
export const SHOP_PHOTO_UPLOAD_PATH = "/api/shops/photos/upload";

/** 인디 홍보 글 그림 업로드 토큰 발급. 매장 사진과 같은 방식이다(글쓴이만 받는다) */
export const INDIE_IMAGE_UPLOAD_PATH = "/api/indie/images/upload";
/** 게시판, 라운지 글 본문 그림과 첨부파일의 Blob 업로드 토큰 경로(lib/community/media) */
export const POST_MEDIA_UPLOAD_PATH = "/api/community/media/upload";

/**
 * 인디 글 바깥 링크로 나가는 경유 주소(플레이하기 클릭 집계). 주소가 아니라 링크 순번을 싣는다 —
 * 받은 주소로 넘기면 우리 도메인이 아무 데로나 보내 주는 열린 리다이렉트가 된다. 목적지는 서버가 글에서 다시 읽는다
 */
export function indieOutPath(postId: string, linkIndex: number): string {
  return `/api/indie/out/${encodeURIComponent(postId)}?i=${linkIndex}`;
}

/** 토스 결제창이 돌아오는 주소(성공, 실패). 서버가 승인하거나 실패를 적고 결제 내역으로 넘긴다 */
export const TOSS_SUCCESS_PATH = "/api/payments/toss/success";
export const TOSS_FAIL_PATH = "/api/payments/toss/fail";
/** 정기결제 카드 등록 창이 돌아오는 주소(성공, 실패) */
export const TOSS_BILLING_SUCCESS_PATH = "/api/payments/toss/billing/success";
export const TOSS_BILLING_FAIL_PATH = "/api/payments/toss/billing/fail";

/** 내 게임 하나의 통계 자세히(메이커 멤버십) */
export function indieStatsDetailPath(id: string): string {
  return `${ROUTES.indieStats}/${encodeURIComponent(id)}`;
}

/** /indie/mine/<id> 아래 끝 칸 이름. 메뉴 소속(lib/nav 의 childLeaves)이 같은 이름을 본다 */
export const INDIE_MINE_LEAF = { playtest: "playtest", boost: "boost" } as const;

/** 내 인디 게임 플레이테스트 모집 관리 */
export function indiePlaytestPath(id: string): string {
  return `${ROUTES.indieMine}/${encodeURIComponent(id)}/${INDIE_MINE_LEAF.playtest}`;
}

/** 내 인디 게임에 광고 걸기(결제). plan 을 주면 구매 화면이 그 묶음을 골라 둔 채 열린다(lib/payments/products 의 PLAN_PARAM) */
export function indieBoostPath(id: string, plan?: PlanChoice): string {
  return withPlan(`${ROUTES.indieMine}/${encodeURIComponent(id)}/${INDIE_MINE_LEAF.boost}`, plan);
}

function withPlan(path: string, plan?: PlanChoice): string {
  return plan ? `${path}?${PLAN_PARAM}=${plan}` : path;
}

/** 내 홍보 글을 게시판 홍보 목록 위에 고정(결제). 게시판 글 주소(/board/promos/p/<id>)는 공개 화면이라 그 아래에 두지 않는다 */
export function boardPinPath(id: string, plan?: PlanChoice): string {
  return withPlan(`${ROUTES.board}/mine/${encodeURIComponent(id)}/pin`, plan);
}

/**
 * 내 게시판, 라운지 글 고치기(2026-10-30). 공개 글 주소(/board/.../p/<id>) 아래가 아니라 "내 것" 아래 둔다 — 고정 구매(boardPinPath)와 같은 자리.
 * 라운지 글은 라운지 아래로 보낸다 — 하위 메뉴 띠가 주소로 소속을 읽어서, 게시판 아래 두면 개발일지를 고치는데 게시판 띠가 켜진다
 */
export function postEditPath(id: string, lounge: boolean): string {
  return `${lounge ? ROUTES.lounge : ROUTES.board}/mine/${encodeURIComponent(id)}/edit`;
}

/** 인디 홍보 글 공개 화면 */
export function indiePath(slug: string): string {
  return `${ROUTES.indie}/${encodeURIComponent(slug)}`;
}

/** 인디 홍보 글 고치기. slug 가 아니라 id 로 가른다 — 제목을 고쳐도 고치던 화면 주소가 살아 있어야 한다 */
export function indieEditPath(id: string): string {
  return `${ROUTES.indieMine}/${encodeURIComponent(id)}`;
}

/** 할 일 첨부 업로드 토큰 발급. 매장 사진과 같은 방식이다(관리자만 받는다) */
/** 알림발송관리를 템플릿 하나로 발송 폼을 연 채 여는 주소 값(알림템플릿관리의 "이 템플릿으로 발송") */
export const NOTIFY_COMPOSE_PARAM = "compose";

export const TASK_ATTACHMENT_UPLOAD_PATH = "/api/admin/tasks/attachments/upload";

/** 직원 목록과 초대 */
export function vendorStaffPath(slug: string): string {
  return `${vendorShopPath(slug)}/staff`;
}

/** 직원 초대 수락. 토큰은 원문이 곧 열쇠라 경로에만 싣고 어디에도 적지 않는다 */
export function staffInvitePath(token: string): string {
  return `${ROUTES.vendor}/invite/${encodeURIComponent(token)}`;
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

/**
 * 가입 직후 갈 곳. `?next=` 로 어디를 가려던 중이었다면 그곳이 우선이고(장바구니 같은 흐름을 끊지 않는다),
 * 그냥 가입한 사람만 온보딩으로 보낸다.
 */
export function afterSignUpPath(next: string): string {
  return next === ROUTES.home ? ROUTES.welcome : next;
}

/**
 * 이미 로그인한 사람이 인증 화면에 닿았을 때 돌려보낼 곳.
 *
 * **서버 액션의 답과 같아야 한다.** 가입이 성공하면 두 가지가 동시에 움직인다 —
 * 액션이 돌려준 redirectTo 로 클라이언트가 문서를 새로 열고(use-auth-form), 같은 순간
 * 다시 그려진 인증 레이아웃이 "이미 로그인한 사람" 을 보고 제 갈 곳으로 보낸다.
 * 둘이 다른 곳을 가리키면 경주가 되고, 2026-09-22 실측으로는 **레이아웃이 이긴다**
 * (가입한 사람이 온보딩 대신 홈으로 떨어졌다). 그래서 답을 afterSignUpPath 하나로 모은다.
 */
export function afterAuthPath(pathWithSearch: string | null | undefined, onboarding = true): string {
  const explicit = nextFromPathWithSearch(pathWithSearch);
  if (explicit !== ROUTES.home) return explicit;
  const path = (pathWithSearch ?? "").split("?")[0];
  // onboarding=false 는 온보딩을 보지 않는 계정(관리자)이다. 여기서 안 걸러도 /welcome 이
  // 되돌려 보내지만, 그러면 가입 직후 화면이 한 번 깜빡인다 — 판단이 서는 자리에서 끝낸다
  return onboarding && path === ROUTES.signUp ? afterSignUpPath(ROUTES.home) : ROUTES.home;
}

/** 할 일 판의 카드 하나를 바로 여는 주소. 텔레그램 알림이 이 주소를 싣는다(판이 열리며 그 카드 팝업이 뜬다) */
export const TASK_OPEN_PARAM = "task";

export function adminTaskPath(id: string): string {
  return `${ROUTES.adminTasks}?${TASK_OPEN_PARAM}=${encodeURIComponent(id)}`;
}

/** 관리자 게임 고치기 화면. 승인 화면 둘(스토어매칭, 상품 매핑)이 상세에서 이 주소로 건너간다 */
export function adminGamePath(id: string): string {
  return `/admin/games/${encodeURIComponent(id)}`;
}

/** 알림함 한 쪽. 1쪽은 주소에 쪽 번호를 붙이지 않는다 — 종 팝오버의 "전체 보기" 와 내 정보 띠가 같은 주소를 연다 */
export function notificationsPath(page = 1): string {
  return page > 1 ? `${ROUTES.notifications}?page=${page}` : ROUTES.notifications;
}
