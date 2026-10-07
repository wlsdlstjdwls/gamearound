// 온보딩 화면 껍데기 — 한 화면 한 질문. 7단계가 전부 이 하나를 쓴다(규약 §3).
//
// 배치 근거는 docs/기획_첫로그인_온보딩_개인화_2026-09-22.md §4.
// 좁은 화면: 다음 버튼을 화면 바닥에 붙인다(sticky). 카드가 많아 스크롤이 생겨도
//            "다음" 이 늘 손 닿는 자리에 있어야 한다.
// 넓은 화면: 560px 판 안에 가두고 세로 가운데. 질문 하나를 1400px 에 펼치면 답을 눈으로 찾아야 한다.
//
// data-onboarding: 머리띠와 푸터를 감추는 표식이다(globals.css). 이 화면에서 나가는 문은 우상단 하나다.
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import { ROUTES, WELCOME_FROM_PARAM, WELCOME_FROM_SETTINGS, welcomeStepPath } from "@/lib/routes";
import { SITE } from "@/lib/site";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import {
  prevStep,
  stepProgress,
  type OnboardingStep,
  type StepContext,
} from "@/lib/onboarding/steps";
import { BrandSymbol } from "@/components/ui/logo";
import { ChevronLeftIcon, XIcon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/page";
import { AnswerGate } from "@/components/onboarding/answer-gate";
import { OnboardingSubmit } from "@/components/onboarding/submit";

export function OnboardingShell({
  step,
  ctx,
  title,
  subtitle,
  note,
  action,
  submitLabel,
  skippable = true,
  requireAnswer = false,
  initialAnswered = false,
  editing = false,
  children,
}: {
  step: OnboardingStep;
  ctx: StepContext;
  /** 두 줄로 끊어 준다. <br/> 을 쓰지 않는 이유는 auth-card 와 같다(접근성 이름이 붙어 버린다) */
  title: readonly [string, string] | readonly [string];
  subtitle?: string;
  /** 카드 아래 인셋 안내. 헷갈릴 규칙을 못 박는 자리다 */
  note?: ReactNode;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
  skippable?: boolean;
  /** 답을 꼭 받아야 하는 단계인가. 참이면 고르기 전까지 "다음" 이 꺼져 있다(참고자료 규칙) */
  requireAnswer?: boolean;
  /** 되돌아와 답이 이미 채워진 상태로 열린 단계인가 */
  initialAnswered?: boolean;
  /**
   * 설정에서 칸 하나만 고치러 왔는가. 참이면 뒤로, 나가기가 설정을 가리키고 진행 막대와 건너뛰기가 빠진다 —
   * 순서 안에 있는 화면이 아니라서 "3/7" 이나 "건너뛸게요" 는 뜻이 없다. 저장 뒤 목적지는 액션이 정한다.
   */
  editing?: boolean;
  children: ReactNode;
}) {
  const back = editing ? null : prevStep(step, ctx);
  const progress = stepProgress(step, ctx);
  const showSkip = skippable && !editing;

  return (
    <div data-onboarding className="flex min-h-svh flex-col bg-bg">
      {/* 머리 — 뒤로, 진행 막대, 나가기. 진행 막대에 퍼센트를 적지 않는 이유는 steps.ts 주석 */}
      <div className="sticky top-0 z-10 bg-bg/92 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[var(--page-w)] items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),10px)] sm:px-7">
          {editing ? (
            <Link
              href={ROUTES.settings}
              aria-label={M.edit.back}
              className="press tap -ml-2 flex size-11 items-center justify-center rounded-full text-mut hover:text-ink"
            >
              <ChevronLeftIcon size={20} />
            </Link>
          ) : back ? (
            <Link
              href={welcomeStepPath(back)}
              aria-label={M.back}
              className="press tap -ml-2 flex size-11 items-center justify-center rounded-full text-mut hover:text-ink"
            >
              <ChevronLeftIcon size={20} />
            </Link>
          ) : (
            <span className="size-11 shrink-0" aria-hidden />
          )}
          <Link
            href={ROUTES.home}
            aria-label={`${SITE.name} 홈`}
            className="press hidden sm:block"
          >
            <BrandSymbol size={24} />
          </Link>
          <Link
            href={editing ? ROUTES.settings : ROUTES.home}
            className="press tap ml-auto -mr-1 flex h-11 items-center rounded-full px-3 text-[13px] text-mut hover:text-ink"
          >
            {editing ? M.edit.exit : M.exit}
            <XIcon size={15} className="ml-1.5" />
          </Link>
        </div>
        {/* 3px 막대. role=progressbar 로 낭독기에도 진행이 전달된다 */}
        {!editing && (
        <div
          role="progressbar"
          aria-label={M.progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="mt-2 h-[3px] w-full bg-surface-2"
        >
          <div
            className="h-full bg-acc transition-[width] duration-slow ease-out-emph"
            style={{ width: `${Math.max(progress * 100, 2)}%` }}
          />
        </div>
        )}
      </div>

      <form action={action} className="flex flex-1 flex-col">
        {editing && <input type="hidden" name={WELCOME_FROM_PARAM} value={WELCOME_FROM_SETTINGS} />}
        <AnswerGate required={requireAnswer} initialAnswered={initialAnswered}>
          {/*
            내용과 바닥 버튼을 **한 덩어리**로 묶는다. 둘을 form 의 형제로 두고 각자 가운데를 잡게 하면
            서로를 민다 — 내용의 my-auto 가 남는 자리를 전부 먹어 버튼이 화면 바닥으로 떨어지고,
            그 사이가 250px 벌어졌다(1440x950 실측).

            세로 가운데는 **margin auto** 로 잡는다. justify-center 는 내용이 칸보다 길어지는 순간
            위쪽이 칸 밖으로 밀려 스크롤로도 못 닿는다(장르 17칸이 정확히 그 경우다).
            margin auto 는 남는 자리가 있을 때만 나누므로 길어지면 그냥 위에서부터 흐른다.

            좁은 화면에서는 가운데로 모으지 않는다 — 질문 화면은 제목이 위에 붙어야 읽는 순서가 맞고,
            덩어리가 화면 높이를 다 받아야(flex-1) 버튼의 mt-auto 가 바닥을 잡는다.
          */}
          <div className="flex flex-1 flex-col sm:my-auto sm:flex-initial">
            <div className="mx-auto flex w-full max-w-[560px] flex-col px-4 py-7 sm:px-6">
              <div className="reveal flex flex-col gap-2" style={stagger(0)}>
                <h1 className="text-[26px] font-extrabold leading-[1.22] tracking-[-0.045em] text-ink sm:text-[32px]">
                  {title.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </h1>
                {subtitle && (
                  <p className="text-[13.5px] leading-[1.7] text-mut">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="reveal mt-7" style={stagger(1)}>
                {children}
              </div>

              {note && (
                <Panel
                  className="reveal mt-5 px-4 py-3.5 text-[13px] leading-[1.6] text-mut"
                  style={stagger(2)}
                >
                  {note}
                </Panel>
              )}
            </div>

            {/*
            바닥 버튼. sticky 라 스크롤이 없으면 그냥 문서 끝에 붙고, 길어지면 화면에 붙는다.
            위쪽 6px 그라데이션은 카드가 버튼 밑으로 잘려 들어갈 때 "더 있다" 를 말한다.
          */}
            <div
              className={cn(
                /*
                 * sticky 는 두 폭 다 쓰고, **자리만** 폭에 따라 다르다.
                 * 좁은 화면: mt-auto 로 자리를 바닥에 두어 카드가 많아도 "다음" 이 늘 손 닿는 곳에 있다.
                 * 넓은 화면: mt-auto 를 끈다. 켜 두면 내용은 가운데, 버튼은 화면 바닥이라 둘 사이가
                 *   250px 벌어졌다(1440x950 실측). 자리는 내용 바로 아래로 돌아오고, 장르처럼 목록이
                 *   길어 넘칠 때만 sticky 가 살아나 버튼이 화면에 붙는다.
                 */
                "sticky bottom-0 mt-auto bg-bg sm:mt-0",
                "before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:from-bg",
              )}
            >
              <div className="mx-auto w-full max-w-[560px] px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-3 sm:px-6">
                <OnboardingSubmit label={editing ? M.edit.save : (submitLabel ?? M.next)} />
                {showSkip && (
                  <button
                    type="submit"
                    name="skip"
                    value="1"
                    formNoValidate
                    className="press tap mx-auto mt-1 flex h-11 items-center justify-center rounded-full px-4 text-[13px] text-mut hover:text-ink"
                  >
                    {M.skip}
                  </button>
                )}
              </div>
            </div>
          </div>
        </AnswerGate>
      </form>
    </div>
  );
}
