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

/** 입력 규칙 — zod 스키마와 UI 안내 문구가 같은 숫자를 본다 */
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
/** scrypt에는 bcrypt 72바이트 제한이 없지만 DoS 방지로 상한을 둔다 */
export const PASSWORD_MAX = 128;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 20;

/** 레이트리밋 (Upstash Redis 고정 윈도우) */
export const RATE_LIMIT = {
  /** 로그인: IP당 15분에 20회, 이메일당 15분에 10회 */
  signInPerIp: { limit: 20, windowSec: 15 * 60 },
  signInPerEmail: { limit: 10, windowSec: 15 * 60 },
  /** 회원가입: IP당 1시간에 5회 */
  signUpPerIp: { limit: 5, windowSec: 60 * 60 },
  /** 푸시 구독: 사용자당 분당 10회 (§1) */
  pushPerUser: { limit: 10, windowSec: 60 },
} as const;

/** proxy.ts 경로 가드 — 접두사 매칭 */
// 입점 신청은 로그인한 사람만 본다. 매장 찾기(/shops)와 매장 페이지는 공개라 접두사로 막지 않는다
export const USER_ROUTE_PREFIXES: readonly string[] = [ROUTES.wishlist, ROUTES.alerts, ROUTES.settings, ROUTES.shopsJoin];
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
