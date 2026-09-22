"use server";
// 온보딩 단계 저장 — 한 액션이 전 단계를 맡는다. 단계마다 액션을 두면 리다이렉트 규칙이
// 일곱 벌로 복제되고, 그중 하나가 다음 단계를 잘못 가리키는 날이 온다.
//
// 저장은 **단계마다 즉시**다(설계 §3). 마지막에 몰아서 저장하면 중간에 창을 닫은 사람의 답이
// 통째로 사라진다 — 재개 지점(onboarding_step)도 같이 여기서 올린다.
import { redirect } from "next/navigation";
import { ROUTES, welcomeStepPath } from "@/lib/routes";
import { dealStyleSchema, genresSchema, platformsSchema, playTimeSchema, stepSchema, subscriptionsSchema } from "@/lib/onboarding/schemas";
import { nextStep, type OnboardingStep, type StepContext } from "@/lib/onboarding/steps";
import { finishOnboarding, getMyProfile, grantConsent, saveStep } from "@/server/services/profiles";
import type { Platform } from "@/server/db/schema";

/** 건너뛰기도 제출이다 — 값을 저장하지 않고 다음 단계로만 넘긴다(그 단계 칸은 null 로 남는다) */
function isSkip(fd: FormData): boolean {
  return fd.get("skip") === "1";
}

export async function submitStepAction(formData: FormData): Promise<void> {
  const parsedStep = stepSchema.safeParse(formData.get("step"));
  if (!parsedStep.success) redirect(welcomeStepPath("intro"));
  const step: OnboardingStep = parsedStep.data;
  const skip = isSkip(formData);

  // 동의 전에는 어떤 값도 저장하지 않는다(설계 §5). intro 가 그 관문이다.
  if (step === "intro") {
    if (skip) redirect(ROUTES.home);
    if (formData.get("consent") !== "on") redirect(`${welcomeStepPath("intro")}?consent=required`);
    await grantConsent();
    redirect(welcomeStepPath("platforms"));
  }

  if (!skip) await saveAnswer(step, formData);

  // 다음 단계 계산은 **저장 뒤에** 한다 — 플랫폼 답이 조건부 단계를 켜고 끄기 때문이다
  const profile = await getMyProfile();
  const ctx: StepContext = { platforms: profile.platforms };
  const next = nextStep(step, ctx);
  if (!next) redirect(ROUTES.home);

  // 결과 화면에 닿는 순간이 "마쳤다" 다 — 결과를 보여 준 뒤 따로 누르게 하면,
  // 그 버튼을 안 누른 사람이 다음 로그인에 온보딩을 처음부터 다시 만난다
  if (next === "done") await finishOnboarding();
  else await saveStep({ onboardingStep: next });
  redirect(welcomeStepPath(next));
}

async function saveAnswer(step: OnboardingStep, fd: FormData): Promise<void> {
  switch (step) {
    case "platforms": {
      const parsed = platformsSchema.safeParse({ platforms: fd.getAll("platforms").map(String) });
      if (!parsed.success) return;
      await saveStep({ platforms: parsed.data.platforms as Platform[] });
      return;
    }
    case "genres": {
      const parsed = genresSchema.safeParse({ genreIds: fd.getAll("genreIds").map(String) });
      if (!parsed.success) return;
      await saveStep({ favoriteGenreIds: parsed.data.genreIds });
      return;
    }
    case "deal-style": {
      const parsed = dealStyleSchema.safeParse({ dealStyle: fd.get("dealStyle") });
      if (!parsed.success) return;
      await saveStep({ dealStyle: parsed.data.dealStyle });
      return;
    }
    case "play-time": {
      const parsed = playTimeSchema.safeParse({ playTimeStyle: fd.get("playTimeStyle") });
      if (!parsed.success) return;
      await saveStep({ playTimeStyle: parsed.data.playTimeStyle });
      return;
    }
    case "subscriptions": {
      const parsed = subscriptionsSchema.safeParse({ subscriptionKeys: fd.getAll("subscriptionKeys").map(String) });
      if (!parsed.success) return;
      await saveStep({ subscriptionKeys: parsed.data.subscriptionKeys });
      return;
    }
    // intro 는 위에서 처리하고, done 은 저장할 답이 없다
    default:
      return;
  }
}

/** 결과 화면에서 누르는 마침. 여기서만 onboarding_done_at 이 찍힌다 */
export async function finishOnboardingAction(): Promise<void> {
  await finishOnboarding();
  redirect(ROUTES.game);
}
