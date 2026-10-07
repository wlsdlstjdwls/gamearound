"use server";
// 비밀번호 재설정 Server Action 둘 — 링크 받기, 새 비밀번호 저장. 로그인/가입 액션과 같은 모양(zod → 레이트리밋 → 서비스)이다.
// 성공하면 redirectTo 만 돌려주고 이동은 useAuthForm 이 한다(문서를 새로 연다).
import { after } from "next/server";
import { RATE_LIMIT } from "@/lib/auth/constants";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { fieldErrorsOf, forgotPasswordInputFromForm, forgotPasswordSchema, resetPasswordInputFromForm, resetPasswordSchema } from "@/lib/auth/schemas";
import { forgotSentPath, resetDonePath } from "@/lib/routes";
import { checkRateLimit, getRequestMeta, hashKeyPart } from "@/server/auth/rate-limit";
import { passwordResetAvailable, resetPasswordWithToken, sendPasswordResetLink } from "@/server/services/password-reset";
import type { AuthActionState } from "@/app/(auth)/actions";

/**
 * 링크 받기. 계정이 있든 없든 같은 화면으로 보낸다.
 * 메일 발송은 응답 뒤(after)에 돈다 — 계정이 있을 때만 DB 쓰기와 메일 왕복이 붙으니, 응답을 기다리게 하면
 * 걸린 시간으로 계정이 있는지 갈린다.
 */
export async function forgotPasswordAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse(forgotPasswordInputFromForm(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  if (!passwordResetAvailable()) return { ok: false, error: M.forgotUnavailable };

  const meta = await getRequestMeta();
  const [ipOk, emailOk] = await Promise.all([
    checkRateLimit(`reset:ip:${hashKeyPart(meta.ip)}`, RATE_LIMIT.resetRequestPerIp),
    checkRateLimit(`reset:email:${hashKeyPart(parsed.data.email)}`, RATE_LIMIT.resetRequestPerEmail),
  ]);
  if (!ipOk || !emailOk) return { ok: false, error: M.tooManyAttempts };

  const email = parsed.data.email;
  after(async () => {
    try {
      await sendPasswordResetLink(email, meta.ip);
    } catch (e) {
      console.error("[auth] 재설정 메일 실패:", e instanceof Error ? e.message : e);
    }
  });
  return { ok: true, redirectTo: forgotSentPath() };
}

export async function resetPasswordAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse(resetPasswordInputFromForm(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const meta = await getRequestMeta();
  if (!(await checkRateLimit(`resetsubmit:ip:${hashKeyPart(meta.ip)}`, RATE_LIMIT.resetSubmitPerIp))) {
    return { ok: false, error: M.tooManyAttempts };
  }

  try {
    const ok = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    if (!ok) return { ok: false, error: M.resetInvalid };
    return { ok: true, redirectTo: resetDonePath() };
  } catch (e) {
    console.error("[auth] 비밀번호 재설정 실패:", e instanceof Error ? e.message : e);
    return { ok: false, error: M.serverError };
  }
}
