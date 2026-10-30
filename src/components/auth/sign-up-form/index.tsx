"use client";
// 가입 폼. 넓은 화면(lg)은 칸을 한 판에 다 펼치고, 좁은 화면은 한 화면에 한 질문씩 넘긴다(2026-10-30 사용자, fitin-app 가입 흐름).
// 좁은 화면 흐름: 지금 칸이 맨 위, 지나온 칸은 그 아래 칩으로 접혀 쌓인다(최근 것이 위). 칩을 누르면 그 칸으로 돌아가 고친다.
// 지금 칸을 위에 두는 이유: 휴대폰 키보드가 화면 아래 절반을 덮는다 — 칸과 "다음" 이 키보드 위에 있어야 한다.
// 두 모양이 같은 <input> 한 벌을 쓰는 이유와 가리는 방식은 steps.tsx 머리말에.
import Link from "next/link";
import { useActionState, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { flushSync } from "react-dom";
import { checkDisplayNameTakenAction, checkEmailTakenAction, signUpAction } from "@/app/(auth)/actions";
import { DISPLAY_NAME_MAX } from "@/lib/auth/constants";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { signUpInputFromForm, signUpSchema } from "@/lib/auth/schemas";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { focusNextOnEnter, useAuthForm } from "@/components/auth/use-auth-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { SignUpConsent, type Agree } from "./consent";
import { CONSENT_STEP, SIGNUP_STEPS, StepChip, StepHead, StepSlot, isWideForm, maskSecret, type SlotState } from "./steps";

/**
 * 이메일 칸을 떠날 때 중복을 묻는다(2026-09-23) — 다섯 칸을 다 채우고 눌러야 "이미 가입된 이메일" 을 알던 것을 앞당긴다.
 * 모듈 상수인 이유는 useAuthForm 의 remoteChecks 주석에.
 */
const REMOTE_CHECKS = {
  email: async (value: string) => ((await checkEmailTakenAction(value))?.taken ? M.emailTaken : null),
  displayName: async (value: string) => ((await checkDisplayNameTakenAction(value))?.taken ? M.displayNameTaken : null),
};

type FieldName = Exclude<(typeof SIGNUP_STEPS)[number], "consent">;
const EMPTY_VALUES: Record<FieldName, string> = { displayName: "", email: "", password: "", passwordConfirm: "" };

export function SignUpForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, null);
  const { formRef, errors, formError, errorSerial, fieldProps, onSubmit, navigating, validateField, checkRemote } = useAuthForm({
    schema: signUpSchema,
    toInput: signUpInputFromForm,
    serverState: state,
    submit: formAction,
    remoteChecks: REMOTE_CHECKS,
  });
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  // 이벤트와 효과 안에서만 부른다 — 렌더 중에 ref 를 묶음 객체로 들고 다니면 React 컴파일러가 렌더 중 접근으로 본다
  const inputOf = (name: FieldName) => ({ displayName: nameRef, email: emailRef, password: passwordRef, passwordConfirm: confirmRef })[name].current;
  // 칩과 강도 막대가 보일 값 — 값의 주인은 여전히 폼(FormData)이고, 여기는 표시용 사본이다
  const [values, setValues] = useState(EMPTY_VALUES);
  const busy = pending || navigating;
  const pw = fieldProps("password");
  const [agree, setAgree] = useState<Agree>({ terms: false, privacy: false, alertEmail: false });

  /*
   * 필수 항목을 다 채우기 전에는 단추를 끈다(기획서 v2.0 S-27 "필수 항목 미충족 시 가입 버튼 비활성").
   * 판정은 서버 액션과 **같은 zod 스키마**로 한다 — 기준이 둘이면 "켜졌는데 서버가 거절" 이나 "다 맞는데 꺼짐" 이 생긴다.
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

  // ── 좁은 화면 단계 ── step 은 지금 칸, reached 는 가장 멀리 간 칸(칩으로 돌아갔다가 "다음" 을 누르면 거기로 돌아온다)
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const slot = (i: number): SlotState => (i === step ? "active" : i < reached ? "done" : "todo");

  /*
   * 서버나 제출 검사가 앞 칸을 거절하면(이미 가입된 이메일 등) 그 칸으로 돌아간다 — 접힌 칩 안의 오류는 보이지 않는다.
   * 효과가 아니라 렌더 중 이전 값과 비교한다(useAuthForm 의 prevServerState 와 같은 방식)
   */
  const [seenSerial, setSeenSerial] = useState(errorSerial);
  if (seenSerial !== errorSerial) {
    setSeenSerial(errorSerial);
    const first = SIGNUP_STEPS.findIndex((name) => errors[name]);
    if (first >= 0 && first < CONSENT_STEP) setStep(first);
  }

  // 단계가 바뀌면 그 칸에 포커스. "다음" 은 이미 손으로 옮겼고(아래 go), 이건 오류로 되돌아온 경우를 맡는다
  useEffect(() => {
    if (isWideForm()) return;
    const name = SIGNUP_STEPS[step];
    if (name === "consent") return;
    const el = inputOf(name);
    if (el && document.activeElement !== el) el.focus();
  }, [step]);

  /*
   * 단계를 옮기고 **같은 이벤트 안에서** 포커스를 준다. iOS 는 사용자 손짓 안에서 받은 focus() 에만 키보드를 올린다 —
   * 상태만 바꾸고 효과에서 포커스하면 칸은 바뀌는데 키보드가 내려간다. flushSync 로 칸을 먼저 보이게 해야 focus() 가 먹는다(display:none 칸은 포커스를 못 받는다)
   */
  const go = (target: number) => {
    flushSync(() => {
      setStep(target);
      setReached((r) => Math.max(r, target));
    });
    const name = SIGNUP_STEPS[target];
    if (name === "consent") (document.activeElement as HTMLElement | null)?.blur();
    else inputOf(name)?.focus();
  };

  // "다음": 칸 안 검사(zod)는 기다리고, 서버 확인(중복)은 넘긴 뒤 뒤에서 묻는다 — 누른 순간 다음 칸이 선다(AGENTS.md §6)
  const advance = () => {
    const name = SIGNUP_STEPS[step];
    if (name === "consent" || validateField(name)) return;
    const from = step;
    go(step < reached ? reached : step + 1);
    void checkRemote(name).then((ok) => {
      if (!ok) go(from);
    });
  };

  const onEnter = (e: KeyboardEvent<HTMLInputElement>, nextRef?: RefObject<HTMLInputElement | null>) => {
    if (isWideForm()) {
      if (nextRef) focusNextOnEnter(e, nextRef);
      return;
    }
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    advance();
  };

  const nextButton = (
    <Button size="lg" fullWidth onClick={advance} disabled={busy}>
      {M.signUpNext}
    </Button>
  );
  const chip = (name: FieldName, label: string, secret = false) => (
    <StepChip label={label} value={secret ? maskSecret(values[name]) : values[name]} onEdit={() => go(SIGNUP_STEPS.indexOf(name))} />
  );
  const atConsent = step === CONSENT_STEP;

  // <form> 에 action 을 걸지 않는다 — 걸면 React 19 가 제출 때마다 form.reset() 을 불러
  // 실패한 폼의 칸이 전부 비워진다. 액션은 useAuthForm 의 onSubmit 이 직접 태운다(근거는 그 주석에)
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onInput={(e) => {
        recheck();
        const t = e.target;
        if (t instanceof HTMLInputElement && t.name in EMPTY_VALUES) setValues((v) => ({ ...v, [t.name]: t.value }));
      }}
      noValidate
      // 칸 사이 12px(넓은 화면 10px) — 16px 이던 것을 줄였다(2026-10-30 사용자 "공백이 너무 많다"). 칸 높이(46px)와 글자 16px 은 그대로다
      className="flex flex-col gap-3 lg:gap-2.5"
    >
      <input type="hidden" name="next" value={next} />

      {formError && (
        <div className="reveal" style={stagger(0)}>
          <FormMessage tone="error" replayKey={errorSerial}>
            {formError}
          </FormMessage>
        </div>
      )}

      <StepHead step={step} />

      {/* 넓은 화면은 닉네임과 이메일이 한 줄에 나란히 — 칸 하나 높이(약 80px)를 덜어 가입 화면이 첫 화면에 다 들어온다(2026-10-30 사용자 "세로 스크롤 안 생기게").
          좁은 화면은 거꾸로 쌓는다(flex-col-reverse): 지금 칸이 위, 지나온 칩이 그 아래 최근 순. 동의 단계에서는 동의와 단추 아래로 내려간다(order) */}
      <div className="flex flex-col-reverse gap-2.5 max-lg:order-1 lg:grid lg:grid-cols-2 lg:gap-x-3 lg:gap-y-2.5">
        <StepSlot state={slot(0)} chip={chip("displayName", "닉네임")} next={nextButton} className="reveal" style={stagger(1)}>
          <TextField
            dense
            ref={nameRef}
            label="닉네임"
            placeholder="게임 친구들에게 보일 이름"
            autoComplete="nickname"
            maxLength={DISPLAY_NAME_MAX}
            autoFocus
            disabled={busy}
            onKeyDown={(e) => onEnter(e, emailRef)}
            {...fieldProps("displayName")}
          />
        </StepSlot>

        <StepSlot state={slot(1)} chip={chip("email", "이메일")} next={nextButton} className="reveal" style={stagger(2)}>
          <TextField
            dense
            ref={emailRef}
            label="이메일"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            inputMode="email"
            disabled={busy}
            onKeyDown={(e) => onEnter(e, passwordRef)}
            {...fieldProps("email")}
          />
        </StepSlot>

        <StepSlot state={slot(2)} chip={chip("password", "비밀번호", true)} next={nextButton} className="reveal lg:col-span-2" style={stagger(3)}>
          <PasswordField
            dense
            ref={passwordRef}
            label="비밀번호"
            // 자리글에 규칙을 또 적지 않는다(2026-09-22) — 바로 아래 hint 가 같은 문장을 들고 있어
            // 칸 안과 칸 밖에 같은 말이 두 번 떴다. 규칙은 hint 한 곳에만 둔다(오류가 나면 그 자리를 오류가 갖는다)
            placeholder="비밀번호 입력"
            hint={M.passwordHint}
            autoComplete="new-password"
            disabled={busy}
            strengthOf={values.password}
            onKeyDown={(e) => onEnter(e, confirmRef)}
            {...pw}
          />
        </StepSlot>

        <StepSlot state={slot(3)} chip={chip("passwordConfirm", "비밀번호 확인", true)} next={nextButton} className="reveal lg:col-span-2" style={stagger(4)}>
          {/* 넓은 화면에서 마지막 칸의 엔터는 그대로 제출이다(nextRef 없음) */}
          <PasswordField dense ref={confirmRef} label="비밀번호 확인" placeholder="한 번 더 입력" autoComplete="new-password" disabled={busy} onKeyDown={(e) => onEnter(e)} {...fieldProps("passwordConfirm")} />
        </StepSlot>
      </div>

      <div className={cn("reveal", !atConsent && "max-lg:hidden")} style={stagger(5)}>
        <SignUpConsent agree={agree} setAgree={setAgree} busy={busy} terms={fieldProps("terms")} privacy={fieldProps("privacy")} />
      </div>

      <div className={cn("reveal", !atConsent && "max-lg:hidden")} style={stagger(6)}>
        <Button type="submit" size="lg" className="lg:h-10" fullWidth loading={busy} loadingLabel={M.pending} disabled={!complete && !busy} aria-describedby={complete ? undefined : incompleteId}>
          {M.signUpCta}
        </Button>
        {!complete && !busy && (
          <p id={incompleteId} className="mt-1.5 text-center text-[12px] text-dim">
            {M.signUpIncomplete}
          </p>
        )}
      </div>

      <p className="reveal text-center text-sm text-mut max-lg:order-2 max-lg:pt-1" style={stagger(7)}>
        {M.hasAccount}{" "}
        <Link href={next === ROUTES.home ? ROUTES.signIn : `${ROUTES.signIn}?next=${encodeURIComponent(next)}`} className="font-semibold text-acc-hover underline-offset-4 hover:underline">
          {M.signInCta}
        </Link>
      </p>
    </form>
  );
}
