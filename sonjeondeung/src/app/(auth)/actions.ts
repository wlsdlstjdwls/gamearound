"use server";
// 인증 Server Action (§5.2: 호출자가 우리 UI → Server Action). zod 검증 → 레이트리밋 → 서비스 → 세션 쿠키.
// 리다이렉트는 클라이언트가 수행한다(헤더 SessionProvider 갱신 후 soft navigation) — 액션은 redirectTo만 돌려준다.
import { RATE_LIMIT } from "@/lib/auth/constants";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { fieldErrorsOf, signInInputFromForm, signInSchema, signUpInputFromForm, signUpSchema } from "@/lib/auth/schemas";
import { safeNextPath } from "@/lib/routes";
import { checkRateLimit, getRequestMeta, hashKeyPart } from "@/server/auth/rate-limit";
import { createSession, invalidateCurrentSession } from "@/server/auth/session";
import { createUser, EmailTakenError, verifyCredentials } from "@/server/services/users";

export type AuthActionState =
  | { ok: true; redirectTo: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> }
  | null;

function nextFrom(fd: FormData): string {
  const v = fd.get("next");
  return safeNextPath(typeof v === "string" ? v : null);
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
    return { ok: true, redirectTo: nextFrom(formData) };
  } catch (e) {
    if (e instanceof EmailTakenError) return { ok: false, fieldErrors: { email: M.emailTaken } };
    console.error("[auth] 회원가입 실패:", e instanceof Error ? e.message : e);
    return { ok: false, error: M.serverError };
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
