// 인증 관련 상수 단일 원천. 서버, 클라이언트, proxy가 공유한다 (비밀값 없음).
import { ROUTES } from "@/lib/routes";

/** 세션 쿠키 이름. 바꾸면 기존 로그인 전부 풀린다 */
export const SESSION_COOKIE_NAME = "sjd_session";
/** 세션 수명 30일 (슬라이딩) */
export const SESSION_TTL_SEC = 60 * 60 * 24 * 30;
/** 남은 수명이 이 값 아래로 내려가면 만료를 연장한다 (15일) */
export const SESSION_RENEW_BELOW_SEC = SESSION_TTL_SEC / 2;
/** 쿠키 토큰 바이트 수 (base64url 43자) */
export const SESSION_TOKEN_BYTES = 32;

/**
 * 헤더가 /api/auth/me 로 세션을 물어볼 때의 재시도.
 *
 * 왜 재시도가 필요한가: 이 요청 한 번의 실패가 곧 "로그아웃 상태" 로 그려진다. 한 번 그렇게 그려지면
 * 사람이 새로고침하기 전까지 고쳐지지 않는다 — 로그인은 됐는데 머리글만 계속 "로그인" 버튼인 상태다.
 * 실패는 세션이 없다는 뜻이 아니라 **못 물어봤다** 는 뜻이므로, 둘을 갈라 보고 몇 번 더 물어본다.
 *
 * 세 번, 0.4초에서 배로 늘린다. 더 늘리면 진짜 비로그인 사용자가 머리글 자리가 빈 채로 기다린다.
 */
export const SESSION_PROBE_RETRIES = 3;
export const SESSION_PROBE_BACKOFF_MS = 400;

/** 입력 규칙 — zod 스키마와 UI 안내 문구가 같은 숫자를 본다 */
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
/** scrypt에는 bcrypt 72바이트 제한이 없지만 DoS 방지로 상한을 둔다 */
export const PASSWORD_MAX = 128;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 20;

/**
 * 쉬운 비밀번호 판정 문턱(lib/auth/weak-password). 가입에만 건다 — 로그인은 loose 스키마라 기존 계정은 안 잠긴다.
 *
 * 서로 다른 글자 4개: "aaaaaaa1", "11111111a", "abababab1" 처럼 8자를 채웠어도 사실상 한두 글자인 것을 거른다.
 * 5는 과했다 — "tetris44" 같은 평범한 조합이 걸린다.
 * 연속은 4글자까지 봐준다(5글자부터 거절): "a1234567", "12345abc" 를 거른다. 4글자를 막으면 "abcd" 나 "1234" 가
 * 든 평범한 조합까지 걸린다 — 그 흔한 꼴("abcd1234" 등)은 weak-password 의 목록이 따로 잡는다.
 */
export const PASSWORD_MIN_DISTINCT_CHARS = 4;
export const PASSWORD_MAX_SEQUENTIAL_RUN = 4;

/** 레이트리밋 (Upstash Redis 고정 윈도우) */
export const RATE_LIMIT = {
  /** 로그인: IP당 15분에 20회, 이메일당 15분에 10회 */
  signInPerIp: { limit: 20, windowSec: 15 * 60 },
  signInPerEmail: { limit: 10, windowSec: 15 * 60 },
  /** 회원가입: IP당 1시간에 5회 */
  signUpPerIp: { limit: 5, windowSec: 60 * 60 },
  /**
   * 가입 폼 이메일 중복 확인: IP당 15분에 10회.
   * 사람은 이메일 칸을 두세 번 떠날 뿐이다. 이 창구는 칸 하나로 계정 존재를 물을 수 있는 **가장 싼 조회 창구**라,
   * 가입 제출(1시간 5회)보다 넉넉하되 넉넉함이 그대로 대량 조회 능력이 되지 않게 좁게 둔다.
   * 막히면 칸에 아무것도 안 띄우고 제출에 맡긴다 — 제출이 어차피 같은 답을 한다.
   */
  emailCheckPerIp: { limit: 10, windowSec: 15 * 60 },
  /** 푸시 구독: 사용자당 분당 10회 (§1) */
  pushPerUser: { limit: 10, windowSec: 60 },
} as const;

/** proxy.ts 경로 가드 — 접두사 매칭 */
// 입점 신청은 로그인한 사람만 본다. 매장 찾기(/shops)와 매장 페이지는 공개라 접두사로 막지 않는다
// 온보딩(/welcome)도 로그인한 사람만 본다 — 저장할 곳이 계정이라 비로그인은 답할 자리가 없다
export const USER_ROUTE_PREFIXES: readonly string[] = [ROUTES.wishlist, ROUTES.alerts, ROUTES.settings, ROUTES.shopsJoin, ROUTES.welcome];
export const ADMIN_ROUTE_PREFIXES: readonly string[] = [ROUTES.admin, ROUTES.shopsAdmin];
export const VENDOR_ROUTE_PREFIXES: readonly string[] = [ROUTES.vendor];
export const AUTH_PAGE_PREFIXES: readonly string[] = [ROUTES.signIn, ROUTES.signUp];

/** 관리자 부트스트랩: ADMIN_EMAILS 환경변수(쉼표 구분)에 있는 이메일은 가입/로그인 시 admin으로 승격 */
export const ADMIN_EMAILS_ENV = "ADMIN_EMAILS";

export const ROLE_LABEL = {
  user: "일반",
  game_company: "게임업체",
  seller: "판매업체",
  admin: "관리자",
} as const;
