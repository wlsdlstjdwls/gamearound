// DB 예외를 갈래로 나눈다 — "DB 가 아예 안 열린다" 와 "질의 하나가 틀렸다" 는 화면에 다른 말을 해야 한다.
//
// 앞의 것은 회원 탓도 우리 코드 탓도 아니라 기다리면 풀린다. 그래서 점검 안내를 띄우고, 세션은 Redis 사본으로 버틴다
// (server/auth/session-cache). 2026-10-13 Neon 무료 compute 한도를 넘겼을 때 모든 질의가
// `Server error (HTTP status 402): {"message":"Your account or project has exceeded the quota..."}` 로 돌아왔다.
//
// 뒤의 것(제약 위반, 문법)은 원문을 화면에 내면 안 된다. drizzle 은 모든 질의 오류를 "Failed query: <SQL>" 로 감싸서,
// 액션이 e.message 를 그대로 돌려주면 회원 화면에 SQL 이 뜬다. 그 원문은 서버 로그만 받는다(lib/messages 주석).
//
// 순수 함수다(문구 상수만 읽는다). 드라이버 클래스를 import 하지 않고 이름과 글자로 본다 — 클라이언트 묶음에 드라이버가 끌려오지 않게.
import { MAINTENANCE_MESSAGES } from "@/lib/messages";

/** DB 가 닿지 않을 때 드라이버가 내는 글자. 원인 cause 사슬 어디에든 있으면 "안 열림" 이다 */
const UNAVAILABLE_PATTERNS: RegExp[] = [
  // Neon HTTP 가 질의 전에 거절한 것. 402 는 한도 초과, 5xx 는 깨우는 중이거나 장애
  /HTTP status (402|5\d\d)/i,
  /exceeded the (compute time )?quota/i,
  /endpoint (is|has been) disabled/i,
  // 연결 자체가 끊긴 것(fetch, 소켓)
  /fetch failed/i,
  /\b(ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN)\b/,
  /Couldn't connect to compute node/i,
  // 연결 문자열이 없는 것(server/db/client). 로컬 첫 실행에서만 난다
  /DATABASE_URL 환경변수가 없습니다/,
];

/** 사슬을 따라가는 깊이 상한. drizzle(DrizzleQueryError) 아래에 드라이버 오류가 한두 겹 붙는다 */
const CAUSE_DEPTH_MAX = 5;

function* causeChain(e: unknown): Generator<unknown> {
  let cur: unknown = e;
  for (let i = 0; i < CAUSE_DEPTH_MAX && cur != null; i++) {
    yield cur;
    cur = typeof cur === "object" && "cause" in cur ? (cur as { cause?: unknown }).cause : undefined;
  }
}

function textOf(e: unknown): string {
  if (e instanceof Error) return `${e.name} ${e.message}`;
  return typeof e === "string" ? e : "";
}

/** DB 가 아예 안 열려서 난 예외인가 */
export function isDbUnavailable(e: unknown): boolean {
  for (const link of causeChain(e)) {
    const text = textOf(link);
    if (UNAVAILABLE_PATTERNS.some((p) => p.test(text))) return true;
  }
  return false;
}

/** 원문을 화면에 내면 안 되는 DB 예외인가(질의 오류). 서비스가 일부러 던진 사람말 Error 는 여기 안 걸린다 */
export function isInternalDbError(e: unknown): boolean {
  for (const link of causeChain(e)) {
    if (!(link instanceof Error)) continue;
    if (link.name === "DrizzleQueryError" || link.name === "NeonDbError" || link.message.startsWith("Failed query")) return true;
  }
  return false;
}

/**
 * 액션이 회원에게 돌려줄 오류 문구. DB 가 안 열리면 점검 안내, 질의 오류면 fallback,
 * 서비스가 사람말로 던진 것(로그인이 필요해요 등)은 그 말 그대로.
 */
export function actionErrorMessage(e: unknown, fallback: string, unavailable: string): string {
  if (isDbUnavailable(e)) return unavailable;
  if (isInternalDbError(e)) return fallback;
  return e instanceof Error && e.message ? e.message : fallback;
}

/** 액션 catch 의 기본형. 서비스의 사람말은 살리고 DB 사정은 점검 안내로 바꾼다 */
export function actionError(e: unknown, fallback: string): string {
  return actionErrorMessage(e, fallback, MAINTENANCE_MESSAGES.write);
}

/** 원래 고정 문구만 돌려주던 자리(인증, 설정)용. DB 가 안 열렸을 때만 점검 안내로 바꾼다 */
export function unavailableOr(e: unknown, fallback: string, unavailable: string = MAINTENANCE_MESSAGES.write): string {
  return isDbUnavailable(e) ? unavailable : fallback;
}

/**
 * 조회를 감싸 DB 가 안 열렸을 때만 null 로 접는다. 다른 실패는 그대로 던진다 — 질의 버그를 안내문으로 덮지 않으려고.
 * 캐시(unstable_cache)에 값이 있으면 애초에 DB 까지 안 가므로, 이 null 은 "처음 여는 조합" 에서만 나온다.
 */
export async function nullIfDbUnavailable<T>(p: Promise<T>): Promise<T | null> {
  const r = await orDbDown(p);
  return r === DB_DOWN ? null : r;
}

/**
 * "DB 가 안 열림" 표식. 상세처럼 null 이 이미 "없는 게임"(404) 을 뜻하는 조회에서는 nullIfDbUnavailable 을 못 쓴다 —
 * 장애를 404 로 그리면 검색엔진이 멀쩡한 게임 주소를 지운다. 그래서 다른 값으로 돌려준다.
 */
export const DB_DOWN = Symbol("db-down");

export async function orDbDown<T>(p: Promise<T>): Promise<T | typeof DB_DOWN> {
  try {
    return await p;
  } catch (e) {
    if (isDbUnavailable(e)) {
      console.error("[db] 안 열림, 안내로 접는다:", e instanceof Error ? e.message : String(e));
      return DB_DOWN;
    }
    throw e;
  }
}
