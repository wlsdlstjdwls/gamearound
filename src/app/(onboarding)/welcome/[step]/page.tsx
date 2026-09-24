// 온보딩 한 단계 — 주소 세그먼트 하나가 일곱 화면을 전부 그린다(설계 §7).
//
// 단계마다 폴더를 만들지 않은 이유: 껍데기, 진행 막대, 뒤로, 나가기, 제출 액션이 일곱 벌로 복제되고
// 그중 하나가 뒤처지는 날이 온다. 다른 것은 **질문과 선택지뿐**이라 그 둘만 갈라 준다.
//
// route 는 조회와 렌더만 한다(규약 §1). 저장은 actions.ts, 값은 services/profiles 가 맡는다.
import { redirect } from "next/navigation";
import { ROUTES, welcomeStepPath } from "@/lib/routes";
import { gamesHref } from "@/lib/games-query";
import { DEAL_STYLE_CHOICES, GENRE_PICK_MAX, PLATFORM_CHOICES, PLAY_TIME_CHOICES } from "@/lib/onboarding/constants";
import { summarizeProfile } from "@/lib/onboarding/summary";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { personalQuery } from "@/lib/onboarding/query";
import { isStep, type OnboardingStep, type StepContext } from "@/lib/onboarding/steps";
import { getMyProfile, listGenreChoices, listSubscriptionChoices } from "@/server/services/profiles";
import { listGames } from "@/server/services/games";
import { OnboardingShell } from "@/components/onboarding/shell";
import { PickGroup, type PickOption } from "@/components/onboarding/pick-group";
import { IntroBody } from "@/components/onboarding/intro-body";
import { DoneBody } from "@/components/onboarding/done-body";
import { submitStepAction } from "../actions";

type Props = {
  params: Promise<{ step: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WelcomeStepPage({ params, searchParams }: Props) {
  const { step: raw } = await params;
  if (!isStep(raw)) redirect(welcomeStepPath("intro"));
  const step: OnboardingStep = raw;

  const profile = await getMyProfile();
  // 동의 전에는 어떤 질문도 열지 않는다(설계 §5). 주소를 직접 쳐서 들어와도 같다
  if (step !== "intro" && !profile.consentedAt) redirect(welcomeStepPath("intro"));

  const ctx: StepContext = { platforms: profile.platforms };

  if (step === "done") return <DonePage ctx={ctx} />;

  if (step === "intro") {
    const sp = await searchParams;
    return (
      <OnboardingShell
        step={step}
        ctx={ctx}
        title={M.intro.title}
        action={submitStepAction}
        submitLabel={M.intro.start}
        skippable
      >
        <StepField step={step} />
        <IntroBody error={sp.consent === "required" ? M.intro.consentRequired : undefined} />
      </OnboardingShell>
    );
  }

  const q = await questionFor(step, profile);
  return (
    <OnboardingShell
      step={step}
      ctx={ctx}
      title={q.title}
      subtitle={q.subtitle}
      note={q.note}
      action={submitStepAction}
      requireAnswer={q.requireAnswer}
      initialAnswered={q.selected.length > 0}
    >
      <StepField step={step} />
      <PickGroup name={q.name} options={q.options} multiple={q.multiple} defaultSelected={q.selected} max={q.max} />
    </OnboardingShell>
  );
}

/** 어느 단계에서 온 제출인지 액션에 알린다. 액션 하나가 전 단계를 맡으므로 이 칸이 분기 키다 */
function StepField({ step }: { step: OnboardingStep }) {
  return <input type="hidden" name="step" value={step} />;
}

type Question = {
  title: readonly [string, string];
  subtitle: string;
  note: string;
  name: string;
  options: PickOption[];
  multiple: boolean;
  selected: string[];
  max?: number;
  /** 하나는 골라야 넘어가는 단계인가. 다중선택은 "안 고름" 이 뜻을 가지므로 강제하지 않는다 */
  requireAnswer: boolean;
};

async function questionFor(step: Exclude<OnboardingStep, "intro" | "done">, profile: Awaited<ReturnType<typeof getMyProfile>>): Promise<Question> {
  switch (step) {
    case "platforms":
      return {
        title: M.platforms.title,
        subtitle: M.platforms.subtitle,
        note: M.platforms.note,
        name: "platforms",
        options: PLATFORM_CHOICES.map((c) => ({ value: c.value, label: c.label, note: c.note })),
        multiple: true,
        selected: profile.platforms ?? [],
        requireAnswer: false,
      };
    case "genres": {
      const choices = await listGenreChoices();
      return {
        title: M.genres.title,
        subtitle: M.genres.subtitle,
        note: M.genres.note,
        name: "genreIds",
        options: choices.map((g) => ({ value: String(g.id), label: g.name })),
        multiple: true,
        selected: (profile.favoriteGenreIds ?? []).map(String),
        max: GENRE_PICK_MAX,
        requireAnswer: false,
      };
    }
    case "deal-style":
      return {
        title: M.dealStyle.title,
        subtitle: M.dealStyle.subtitle,
        note: M.dealStyle.note,
        name: "dealStyle",
        options: DEAL_STYLE_CHOICES.map((c) => ({ value: c.value, label: c.label, note: c.note })),
        multiple: false,
        selected: profile.dealStyle ? [profile.dealStyle] : [],
        // 단일선택은 "안 고름" 이 뜻을 갖지 못한다 — 건너뛰기가 그 자리를 이미 맡고 있다
        requireAnswer: true,
      };
    case "play-time":
      return {
        title: M.playTime.title,
        subtitle: M.playTime.subtitle,
        note: M.playTime.note,
        name: "playTimeStyle",
        options: PLAY_TIME_CHOICES.map((c) => ({ value: c.value, label: c.label, note: c.note })),
        multiple: false,
        selected: profile.playTimeStyle ? [profile.playTimeStyle] : [],
        requireAnswer: true,
      };
    case "subscriptions": {
      const choices = await listSubscriptionChoices();
      return {
        title: M.subscriptions.title,
        subtitle: M.subscriptions.subtitle,
        note: M.subscriptions.note,
        name: "subscriptionKeys",
        options: choices.map((s) => ({ value: s.key, label: s.label })),
        multiple: true,
        selected: profile.subscriptionKeys ?? [],
        requireAnswer: false,
      };
    }
  }
}

/**
 * 결과 화면. 세는 질의와 "내 조건으로 보기" 링크가 **같은 personalQuery** 를 본다 —
 * 따로 만들면 "N개라더니 목록은 다르다" 가 된다.
 */
async function DonePage({ ctx }: { ctx: StepContext }) {
  const [profile, genreChoices, subscriptionChoices] = await Promise.all([getMyProfile(), listGenreChoices(), listSubscriptionChoices()]);
  const genreNames = (profile.favoriteGenreIds ?? [])
    .map((id) => genreChoices.find((g) => g.id === id)?.name)
    .filter((n): n is string => Boolean(n));

  const query = personalQuery({ platforms: ctx.platforms, genreNames });
  // 세기에 실패해도 화면은 서야 한다 — 숫자 하나 때문에 온보딩 끝이 에러로 끝나면 안 된다
  const count = await listGames(query)
    .then((r) => r.total)
    .catch(() => null);

  // 설정 화면과 같은 줄이다(summary.ts) — 여기서 본 값이 설정에서 보이는 값이어야 한다
  const summary = summarizeProfile(profile, { genres: genreChoices, subscriptions: subscriptionChoices });

  return <DoneBody count={count} listHref={count === null ? ROUTES.game : gamesHref(query)} summary={summary} />;
}
