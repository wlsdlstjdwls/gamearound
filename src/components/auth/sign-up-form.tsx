"use client";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { signUpAction } from "@/app/(auth)/actions";
import { DISPLAY_NAME_MAX } from "@/lib/auth/constants";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { signUpInputFromForm, signUpSchema } from "@/lib/auth/schemas";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { focusNextOnEnter, useAuthForm } from "@/components/auth/use-auth-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormMessage } from "@/components/ui/form-message";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";

export function SignUpForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, null);
  const { formRef, formError, errorSerial, fieldProps, onSubmit, navigating } = useAuthForm({
    schema: signUpSchema,
    toInput: signUpInputFromForm,
    serverState: state,
    submit: formAction,
  });
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  // 강도 미터용 — 값 자체는 폼(FormData)이 들고 가므로 여기서는 표시만
  const [password, setPassword] = useState("");
  const busy = pending || navigating;
  const pw = fieldProps("password");
  const terms = fieldProps("terms");

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
          label="닉네임"
          placeholder="게임 친구들에게 보일 이름"
          autoComplete="nickname"
          maxLength={DISPLAY_NAME_MAX}
          autoFocus
          disabled={busy}
          onKeyDown={(e) => focusNextOnEnter(e, emailRef)}
          {...fieldProps("displayName")}
        />
      </div>

      <div className="reveal" style={stagger(2)}>
        <TextField
          ref={emailRef}
          label="이메일"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          autoCapitalize="none"
          inputMode="email"
          disabled={busy}
          onKeyDown={(e) => focusNextOnEnter(e, passwordRef)}
          {...fieldProps("email")}
        />
      </div>

      <div className="reveal" style={stagger(3)}>
        <PasswordField
          ref={passwordRef}
          label="비밀번호"
          // 자리글에 규칙을 또 적지 않는다(2026-09-22) — 바로 아래 hint 가 같은 문장을 들고 있어
          // 칸 안과 칸 밖에 같은 말이 두 번 떴다. 규칙은 hint 한 곳에만 둔다(오류가 나면 그 자리를 오류가 갖는다)
          placeholder="비밀번호 입력"
          hint={M.passwordHint}
          autoComplete="new-password"
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

      <div className="reveal" style={stagger(4)}>
        <PasswordField ref={confirmRef} label="비밀번호 확인" placeholder="한 번 더 입력" autoComplete="new-password" disabled={busy} {...fieldProps("passwordConfirm")} />
      </div>

      <div className="reveal" style={stagger(5)}>
        <Checkbox name="terms" disabled={busy} onChange={terms.onChange} onBlur={terms.onBlur} error={terms.error}>
          {/* 두 문서는 링크다 — 동의하기 전에 읽을 길이 있어야 한다.
              새 창으로 여는 이유: 같은 창에서 나가면 여기까지 채운 칸이 전부 날아간다 */}
          <span className="text-ink">(필수)</span> {M.termsConsentLead}{" "}
          <Link href={ROUTES.terms} target="_blank" rel="noreferrer" className="font-semibold text-acc-hover underline underline-offset-4">
            {M.termsDocLabel}
            <span className="sr-only"> (새 창에서 열림)</span>
          </Link>
          과{" "}
          <Link href={ROUTES.privacy} target="_blank" rel="noreferrer" className="font-semibold text-acc-hover underline underline-offset-4">
            {M.privacyDocLabel}
            <span className="sr-only"> (새 창에서 열림)</span>
          </Link>
          {M.termsConsentTail}
        </Checkbox>
      </div>

      <div className="reveal pt-1" style={stagger(6)}>
        <Button type="submit" size="lg" fullWidth loading={busy} loadingLabel={M.pending}>
          {M.signUpCta}
        </Button>
      </div>

      <p className="reveal text-center text-sm text-mut" style={stagger(7)}>
        {M.hasAccount}{" "}
        <Link href={next === ROUTES.home ? ROUTES.signIn : `${ROUTES.signIn}?next=${encodeURIComponent(next)}`} className="font-semibold text-acc-hover underline-offset-4 hover:underline">
          {M.signInCta}
        </Link>
      </p>
    </form>
  );
}
