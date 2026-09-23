"use server";
// 인증 Server Action (§5.2: 호출자가 우리 UI → Server Action). zod 검증 → 레이트리밋 → 서비스 → 세션 쿠키.
// 리다이렉트는 클라이언트가 수행한다(헤더 SessionProvider 갱신 후 soft navigation) — 액션은 redirectTo만 돌려준다.
import { RATE_LIMIT } from "@/lib/auth/constants";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { emailSchema, fieldErrorsOf, signInInputFromForm, signInSchema, signUpInputFromForm, signUpSchema } from "@/lib/auth/schemas";
import { afterSignUpPath, safeNextPath } from "@/lib/routes";
import { checkRateLimit, getRequestMeta, hashKeyPart } from "@/server/auth/rate-limit";
import { createSession, invalidateCurrentSession } from "@/server/auth/session";
import { createUser, EmailTakenError, isEmailRegistered, verifyCredentials } from "@/server/services/users";

export type AuthActionState =
  | { ok: true; redirectTo: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> }
  | null;

function nextFrom(fd: FormData): string {
  const v = fd.get("next");
  return safeNextPath(typeof v === "string" ? v : null);
}

/**
 * 가입 직후 갈 곳. 규칙 자체는 lib/routes 의 afterSignUpPath 에 있다 — 인증 레이아웃도 같은 함수를
 * 봐야 한다(둘이 다르면 경주가 되고 레이아웃이 이긴다. 그 실측은 afterAuthPath 주석에).
 *
 * 로그인(재방문)에는 걸지 않는다 — 온보딩은 계정마다 한 번이고, 재개는 /welcome 이 알아서 한다.
 * 이미 마친 사람이 /welcome 에 닿아도 홈으로 비켜 준다(welcome/page.tsx).
 */
function afterSignUp(fd: FormData): string {
  return afterSignUpPath(nextFrom(fd));
}

/** useActionState용 (prevState, formData) */
export async function signUpAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse(signUpInputFromForm(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const meta = await getRequestMeta();
  if (!(await checkRateLimit(`signup:ip:${hashKeyPart(meta.ip)}`, RATE_LIMIT.signUpPerIp))) {
    return { ok: false, error: M.tooManyAttempts };
  }

  try {
    const user = await createUser(parsed.data);
    await createSession(user.id, meta);
    return { ok: true, redirectTo: afterSignUp(formData) };
  } catch (e) {
    if (e instanceof EmailTakenError) return { ok: false, fieldErrors: { email: M.emailTaken } };
    console.error("[auth] 회원가입 실패:", e instanceof Error ? e.message : e);
    return { ok: false, error: M.serverError };
  }
}

/**
 * 가입 폼 이메일 칸의 중복 확인(칸을 떠날 때). 답을 못 하면 null — 칸에 아무것도 띄우지 않고 제출에 맡긴다.
 *
 * 계정이 있는지를 드러내는 창구다. 새로 새는 정보는 없다(가입 제출도 "이미 가입된 이메일이에요" 로 답한다).
 * 다만 칸 하나로 물을 수 있어 가장 싼 창구가 되므로 따로 막는다(RATE_LIMIT.emailCheckPerIp).
 */
export async function checkEmailTakenAction(rawEmail: unknown): Promise<{ taken: boolean } | null> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return null;

  const meta = await getRequestMeta();
  if (!(await checkRateLimit(`emailcheck:ip:${hashKeyPart(meta.ip)}`, RATE_LIMIT.emailCheckPerIp))) return null;

  try {
    return { taken: await isEmailRegistered(parsed.data) };
  } catch (e) {
    console.error("[auth] 이메일 중복 확인 실패:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function signInAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse(signInInputFromForm(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const meta = await getRequestMeta();
  const [ipOk, emailOk] = await Promise.all([
    checkRateLimit(`signin:ip:${hashKeyPart(meta.ip)}`, RATE_LIMIT.signInPerIp),
    checkRateLimit(`signin:email:${hashKeyPart(parsed.data.email)}`, RATE_LIMIT.signInPerEmail),
  ]);
  if (!ipOk || !emailOk) return { ok: false, error: M.tooManyAttempts };

  try {
    const user = await verifyCredentials(parsed.data.email, parsed.data.password);
    if (!user) return { ok: false, error: M.invalidCredentials };
    await createSession(user.id, meta);
    return { ok: true, redirectTo: nextFrom(formData) };
  } catch (e) {
    console.error("[auth] 로그인 실패:", e instanceof Error ? e.message : e);
    return { ok: false, error: M.serverError };
  }
}

/** 로그아웃 — 세션 행 삭제 + 쿠키 제거. 실패해도 쿠키는 지운다 */
export async function signOutAction(): Promise<{ ok: true }> {
  try {
    await invalidateCurrentSession();
  } catch (e) {
    console.error("[auth] 로그아웃 실패:", e instanceof Error ? e.message : e);
  }
  return { ok: true };
}
