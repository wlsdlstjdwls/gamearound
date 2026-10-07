"use client";
import Link from "next/link";
import { useActionState, useRef } from "react";
import { signInAction } from "@/app/(auth)/actions";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { signInInputFromForm, signInSchema } from "@/lib/auth/schemas";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { focusNextOnEnter, useAuthForm } from "@/components/auth/use-auth-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, null);
  const { formRef, formError, errorSerial, fieldProps, onSubmit, navigating } = useAuthForm({
    schema: signInSchema,
    toInput: signInInputFromForm,
    serverState: state,
    submit: formAction,
  });
  const passwordRef = useRef<HTMLInputElement>(null);
  const busy = pending || navigating;

  // <form> 에 action 을 걸지 않는다 — 걸면 React 19 가 제출 때마다 form.reset() 을 불러
  // 실패한 폼의 칸이 전부 비워진다. 액션은 useAuthForm 의 onSubmit 이 직접 태운다(근거는 그 주석에)
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {formError && (
        <div className="reveal" style={stagger(0)}>
          <FormMessage tone="error" replayKey={errorSerial}>
            {formError}
          </FormMessage>
        </div>
      )}

      <div className="reveal" style={stagger(1)}>
        <TextField
          label="이메일"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          autoCapitalize="none"
          inputMode="email"
          autoFocus
          disabled={busy}
          onKeyDown={(e) => focusNextOnEnter(e, passwordRef)}
          {...fieldProps("email")}
        />
      </div>

      <div className="reveal" style={stagger(2)}>
        <PasswordField ref={passwordRef} label="비밀번호" placeholder="비밀번호" autoComplete="current-password" disabled={busy} {...fieldProps("password")} />
        {/* 칸 바로 밑, 오른쪽 — 비밀번호를 못 떠올린 사람의 눈이 머무는 자리다. 줄 높이를 44px 로 맞춰 터치 타깃을 지킨다 */}
        <div className="flex justify-end">
          <Link href={ROUTES.forgotPassword} className="inline-flex h-11 items-center text-[13px] text-mut underline-offset-4 hover:text-ink hover:underline">
            {M.forgotLink}
          </Link>
        </div>
      </div>

      <div className="reveal pt-1" style={stagger(3)}>
        <Button type="submit" size="lg" fullWidth loading={busy} loadingLabel={M.pending}>
          {M.signInCta}
        </Button>
      </div>

      <p className="reveal text-center text-sm text-mut" style={stagger(4)}>
        {M.noAccount}{" "}
        <Link href={next === ROUTES.home ? ROUTES.signUp : `${ROUTES.signUp}?next=${encodeURIComponent(next)}`} className="font-semibold text-acc-hover underline-offset-4 hover:underline">
          {M.signUpCta}
        </Link>
      </p>
    </form>
  );
}
