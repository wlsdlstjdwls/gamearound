"use client";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { checkDisplayNameTakenAction, checkEmailTakenAction, signUpAction } from "@/app/(auth)/actions";
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

/**
 * 이메일 칸을 떠날 때 중복을 묻는다(2026-09-23) — 다섯 칸을 다 채우고 눌러야 "이미 가입된 이메일" 을 알던 것을 앞당긴다.
 * 모듈 상수인 이유는 useAuthForm 의 remoteChecks 주석에.
 */
const REMOTE_CHECKS = {
  email: async (value: string) => ((await checkEmailTakenAction(value))?.taken ? M.emailTaken : null),
  displayName: async (value: string) => ((await checkDisplayNameTakenAction(value))?.taken ? M.displayNameTaken : null),
};

export function SignUpForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, null);
  const { formRef, formError, errorSerial, fieldProps, onSubmit, navigating } = useAuthForm({
    schema: signUpSchema,
    toInput: signUpInputFromForm,
    serverState: state,
    submit: formAction,
    remoteChecks: REMOTE_CHECKS,
  });
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  // 강도 미터용 — 값 자체는 폼(FormData)이 들고 가므로 여기서는 표시만
  const [password, setPassword] = useState("");
  const busy = pending || navigating;
  const pw = fieldProps("password");
  const terms = fieldProps("terms");
  const privacy = fieldProps("privacy");
  const [agree, setAgree] = useState({ terms: false, privacy: false, alertEmail: false });
  const allAgreed = agree.terms && agree.privacy && agree.alertEmail;

  /*
   * 필수 항목을 다 채우기 전에는 단추를 끈다(기획서 v2.0 S-27 "필수 항목 미충족 시 가입 버튼 비활성").
   * 판정은 서버 액션과 **같은 zod 스키마**로 한다 — 기준이 둘이면 "켜졌는데 서버가 거절" 이나 "다 맞는데 꺼짐" 이 생긴다.
   * 칸마다 입력 이벤트(onInput 은 폼까지 올라온다)와 동의 상태가 바뀔 때 폼 전체를 다시 읽는다.
   * "전체 동의" 는 상태로 체크를 바꿔 입력 이벤트가 나지 않으므로 agree 를 지켜보는 효과가 같은 일을 한다.
   * 이메일 중복처럼 서버에 물어야 아는 것은 여기서 막지 않는다 — 그 답은 칸 아래 문구와 제출 응답이 말한다.
   */
  const [complete, setComplete] = useState(false);
  const recheck = useCallback(() => {
    const form = formRef.current;
    if (form) setComplete(signUpSchema.safeParse(signUpInputFromForm(new FormData(form))).success);
  }, [formRef]);
  useEffect(recheck, [agree, recheck]);
  const incompleteId = useId();

  // <form> 에 action 을 걸지 않는다 — 걸면 React 19 가 제출 때마다 form.reset() 을 불러
  // 실패한 폼의 칸이 전부 비워진다. 액션은 useAuthForm 의 onSubmit 이 직접 태운다(근거는 그 주석에)
  return (
    // 칸 사이 12px — 16px 이던 것을 줄였다(2026-10-30 사용자 "공백이 너무 많다"). 칸 높이(46px)와 글자 16px 은 그대로다
    <form ref={formRef} onSubmit={onSubmit} onInput={recheck} noValidate className="space-y-3">
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

      {/* 동의 넷(기획서 v2.0 S-27, 목업 regv): 전체 동의, 이용약관(필수), 개인정보(필수), 가격 알림 이메일(선택).
          두 문서는 링크다 — 동의하기 전에 읽을 길이 있어야 한다. 새 창으로 여는 이유: 같은 창에서 나가면 여기까지 채운 칸이 전부 날아간다.
          세 칸은 상태로 쥔다 — "전체 동의" 가 셋을 한 번에 켜고 끄고, 셋이 다 켜지면 전체 동의도 켜져 보여야 한다 */}
      <fieldset className="reveal flex flex-col rounded-[var(--radius-md)] bg-surface-2 px-3.5 py-2" style={stagger(5)}>
        <legend className="sr-only">{M.consentAll}</legend>
        <Checkbox checked={allAgreed} disabled={busy} onChange={(e) => setAgree({ terms: e.currentTarget.checked, privacy: e.currentTarget.checked, alertEmail: e.currentTarget.checked })}>
          <span className="font-bold text-ink">{M.consentAll}</span>
        </Checkbox>
        <div className="my-0.5 border-t border-line" />
        <Checkbox
          name="terms"
          checked={agree.terms}
          disabled={busy}
          onChange={(e) => {
            setAgree((a) => ({ ...a, terms: e.currentTarget.checked }));
            terms.onChange(e);
          }}
          onBlur={terms.onBlur}
          error={terms.error}
        >
          <span className="text-ink">{M.consentRequired}</span>{" "}
          <Link href={ROUTES.terms} target="_blank" rel="noreferrer" className="font-semibold text-acc-hover underline underline-offset-4">
            {M.termsDocLabel}
            <span className="sr-only"> (새 창에서 열림)</span>
          </Link>
          {M.termsConsentTail}
        </Checkbox>
        <Checkbox
          name="privacy"
          checked={agree.privacy}
          disabled={busy}
          onChange={(e) => {
            setAgree((a) => ({ ...a, privacy: e.currentTarget.checked }));
            privacy.onChange(e);
          }}
          onBlur={privacy.onBlur}
          error={privacy.error}
        >
          <span className="text-ink">{M.consentRequired}</span>{" "}
          <Link href={ROUTES.privacy} target="_blank" rel="noreferrer" className="font-semibold text-acc-hover underline underline-offset-4">
            {M.privacyConsentLabel}
            <span className="sr-only"> (새 창에서 열림)</span>
          </Link>
          {M.termsConsentTail}
        </Checkbox>
        <Checkbox name="alertEmail" checked={agree.alertEmail} disabled={busy} onChange={(e) => setAgree((a) => ({ ...a, alertEmail: e.currentTarget.checked }))}>
          <span className="text-ink">{M.consentOptional}</span> {M.alertEmailConsent}
        </Checkbox>
      </fieldset>

      <div className="reveal" style={stagger(6)}>
        <Button type="submit" size="lg" fullWidth loading={busy} loadingLabel={M.pending} disabled={!complete && !busy} aria-describedby={complete ? undefined : incompleteId}>
          {M.signUpCta}
        </Button>
        {!complete && !busy && (
          <p id={incompleteId} className="mt-1.5 text-center text-[12px] text-dim">
            {M.signUpIncomplete}
          </p>
        )}
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
