"use client";
// 재설정 2단계 — 메일 링크의 토큰을 숨은 칸으로 싣고 새 비밀번호를 받는다. 규칙과 강도 미터는 가입과 같다.
import { useActionState, useRef, useState } from "react";
import { resetPasswordAction } from "@/app/(auth)/reset-actions";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { resetPasswordInputFromForm, resetPasswordSchema } from "@/lib/auth/schemas";
import { stagger } from "@/lib/motion";
import { BackToSignIn } from "@/components/auth/forgot-password-form";
import { focusNextOnEnter, useAuthForm } from "@/components/auth/use-auth-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { PasswordField } from "@/components/ui/password-field";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);
  const { formRef, formError, errorSerial, fieldProps, onSubmit, navigating } = useAuthForm({
    schema: resetPasswordSchema,
    toInput: resetPasswordInputFromForm,
    serverState: state,
    submit: formAction,
  });
  const confirmRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const busy = pending || navigating;
  const pw = fieldProps("password");

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {formError && (
        <div className="reveal" style={stagger(0)}>
          <FormMessage tone="error" replayKey={errorSerial}>
            {formError}
          </FormMessage>
        </div>
      )}

      <div className="reveal" style={stagger(1)}>
        <PasswordField
          label={M.newPasswordLabel}
          placeholder="비밀번호 입력"
          hint={M.passwordHint}
          autoComplete="new-password"
          autoFocus
          disabled={busy}
          strengthOf={password}
          onKeyDown={(e) => focusNextOnEnter(e, confirmRef)}
          {...pw}
          onChange={(e) => {
            setPassword(e.currentTarget.value);
            pw.onChange(e);
          }}
        />
      </div>

      <div className="reveal" style={stagger(2)}>
        <PasswordField ref={confirmRef} label={M.newPasswordConfirmLabel} placeholder="한 번 더 입력" autoComplete="new-password" disabled={busy} {...fieldProps("passwordConfirm")} />
      </div>

      <div className="reveal pt-1" style={stagger(3)}>
        <Button type="submit" size="lg" fullWidth loading={busy} loadingLabel={M.pending}>
          {M.resetCta}
        </Button>
      </div>

      <BackToSignIn index={4} />
    </form>
  );
}
