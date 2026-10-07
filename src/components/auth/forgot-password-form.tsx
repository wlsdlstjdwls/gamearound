"use client";
// 재설정 1단계 — 이메일 하나 받고 링크를 보낸다. 보낸 뒤 화면(?sent=1)은 폼 대신 안내만 남긴다(page 가 가른다).
import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/(auth)/reset-actions";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { forgotPasswordInputFromForm, forgotPasswordSchema } from "@/lib/auth/schemas";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { TextField } from "@/components/ui/text-field";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, null);
  const { formRef, formError, errorSerial, fieldProps, onSubmit, navigating } = useAuthForm({
    schema: forgotPasswordSchema,
    toInput: forgotPasswordInputFromForm,
    serverState: state,
    submit: formAction,
  });
  const busy = pending || navigating;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
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
          {...fieldProps("email")}
        />
      </div>

      <div className="reveal pt-1" style={stagger(2)}>
        <Button type="submit" size="lg" fullWidth loading={busy} loadingLabel={M.pending}>
          {M.forgotCta}
        </Button>
      </div>

      <BackToSignIn index={3} />
    </form>
  );
}

/** 재설정 화면 셋(받기, 보냄, 새 비밀번호)이 같은 줄로 끝난다 */
export function BackToSignIn({ index }: { index: number }) {
  return (
    <p className="reveal text-center text-sm" style={stagger(index)}>
      <Link href={ROUTES.signIn} className="font-semibold text-acc-hover underline-offset-4 hover:underline">
        {M.backToSignIn}
      </Link>
    </p>
  );
}
