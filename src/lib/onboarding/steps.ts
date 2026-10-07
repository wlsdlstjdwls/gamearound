// 온보딩 단계 정의와 순서 계산 — 순수 함수만. DB, 네트워크를 모른다(그래서 테스트가 붙는다).
// 설계는 docs/기획_첫로그인_온보딩_개인화_2026-09-22.md.
//
// 단계를 **주소로** 가르는 이유: 한 화면에서 상태만 바꾸면 브라우저 뒤로가기와 손가락 스와이프가
// 온보딩 전체를 빠져나간다. 사람은 좌상단 뒤로와 같은 동작을 기대한다.
import type { Platform } from "@/server/db/schema";

/** 주소 세그먼트이자 재개 지점(user_profiles.onboarding_step)에 저장되는 값 */
// notify(웹푸시 권한)는 맨 끝에 둔다(설계 §2 의 7번). 브라우저 권한 창은 한 번 거절하면 다시 못 띄운다 —
// 앞의 질문으로 "무엇을 알려 줄지" 가 정해진 뒤에 물어야 허락받을 확률이 높다.
export const ONBOARDING_STEPS = ["intro", "platforms", "device", "genres", "deal-style", "play-time", "subscriptions", "notify", "done"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** 지금까지 받은 답 — 다음 단계를 정하는 데 필요한 것만 */
export type StepContext = {
  platforms: Platform[] | null;
};

/**
 * PC 로 치는 플랫폼. 기기 사양 단계가 이 답에 걸린다 —
 * 콘솔만 쓰는 사람에게 CPU, GPU 를 묻는 것은 답이 없는 질문이다.
 */
export const PC_PLATFORMS: readonly Platform[] = ["steam", "epic"];

/** 고른 플랫폼에 PC 가 하나라도 있는가 */
export function playsOnPc(platforms: Platform[] | null): boolean {
  return (platforms ?? []).some((p) => PC_PLATFORMS.includes(p));
}

/**
 * 그 단계를 보여줄지. 규칙을 여기 한 곳에 둔다 — 조건이 화면 컴포넌트로 흩어지면 진행률이 거짓말을 시작한다.
 *
 * 기기 단계는 PC 를 **골랐을 때만** 연다. 플랫폼을 건너뛴 사람(null)도 닫는다 — 모르는 사람에게
 * 사양을 묻는 것보다, PC 를 쓰는 사람이 설정의 기기 화면에서 스스로 적는 편이 덜 성가시다.
 */
const VISIBLE_WHEN: Partial<Record<OnboardingStep, (ctx: StepContext) => boolean>> = {
  device: (ctx) => playsOnPc(ctx.platforms),
};

export function isStep(value: string): value is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(value);
}

/** 지금 맥락에서 실제로 거치는 단계 목록. 진행 막대의 분모가 이 길이다 */
export function visibleSteps(ctx: StepContext): OnboardingStep[] {
  return ONBOARDING_STEPS.filter((s) => VISIBLE_WHEN[s]?.(ctx) ?? true);
}

/** 다음 단계. 마지막이면 null */
export function nextStep(current: OnboardingStep, ctx: StepContext): OnboardingStep | null {
  const list = visibleSteps(ctx);
  const i = list.indexOf(current);
  // 지금 맥락에서 안 보이는 단계에 서 있다면(답을 바꿔 조건이 꺼진 경우) 뒤로 물러서지 말고 앞으로 보낸다
  if (i === -1) return list.find((s) => ONBOARDING_STEPS.indexOf(s) > ONBOARDING_STEPS.indexOf(current)) ?? null;
  return list[i + 1] ?? null;
}

/** 이전 단계. 첫 단계면 null */
export function prevStep(current: OnboardingStep, ctx: StepContext): OnboardingStep | null {
  const list = visibleSteps(ctx);
  const i = list.indexOf(current);
  if (i === -1) {
    const earlier = list.filter((s) => ONBOARDING_STEPS.indexOf(s) < ONBOARDING_STEPS.indexOf(current));
    return earlier.at(-1) ?? null;
  }
  return i > 0 ? list[i - 1] : null;
}

/**
 * 진행 막대 비율(0~1). 숫자로 적지 않고 막대만 채우는 이유는 설계 §3 에 있다 —
 * 조건부 건너뛰기 때문에 전체 칸수가 사람마다 다르고, 퍼센트가 뒤로 가면 신뢰를 잃는다.
 * intro 는 0 에서 시작하고 done 은 1 이다.
 */
export function stepProgress(current: OnboardingStep, ctx: StepContext): number {
  const list = visibleSteps(ctx);
  const i = list.indexOf(current);
  if (i <= 0) return 0;
  return i / (list.length - 1);
}
