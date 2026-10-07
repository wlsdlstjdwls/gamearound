// 설정의 개인화 마디 — 받은 취향을 칸마다 보여 주고, 칸마다 고치러 가는 링크를 단다.
//
// 칸마다 링크를 두는 이유(2026-10-07 사용자 요청): 가입 때 건너뛴 칸을 나중에 채울 길이
// "다시 답하기"(일곱 단계를 처음부터) 하나뿐이었다. 장르 하나 고르려고 플랫폼부터 다시 넘기게 하면 안 고친다.
// 고치는 화면은 새로 만들지 않고 온보딩 질문 화면을 편집 모드로 연다(welcomeEditPath) —
// 질문, 선택지, 상한이 이미 거기 있고 두 벌을 두면 한쪽이 뒤처진다.
//
// 상태가 셋이다 — 꺼짐, 켜졌지만 온보딩 중간, 마침. 꺼진 사람은 동의부터 받아야 해서 칸 링크를 주지 않는다.
import Link from "next/link";
import { PersonalizationOff } from "@/components/settings/personalization-off";
import { buttonClass } from "@/components/ui/button";
import { ROWS, SectionHead } from "@/components/ui/page";
import { ONBOARDING_MESSAGES } from "@/lib/onboarding/messages";
import { profileFields, type SummaryInput, type SummaryNames } from "@/lib/onboarding/summary";
import { ROUTES, welcomeEditPath, welcomeStepPath } from "@/lib/routes";

const M = ONBOARDING_MESSAGES.settings;

type Props = {
  profile: SummaryInput & { consentedAt: Date | null; onboardingDoneAt: Date | null };
  names: SummaryNames;
};

export function PersonalizationSection({ profile, names }: Props) {
  if (profile.consentedAt === null) {
    return (
      <section className="flex flex-col gap-3.5">
        <SectionHead title={M.sectionTitle} size="sub" />
        <p className="text-[13px] leading-[1.6] text-mut">{M.offNote}</p>
        <Link href={welcomeStepPath("intro")} className={buttonClass({ size: "sm", className: "self-start" })}>
          {M.start}
        </Link>
      </section>
    );
  }

  const fields = profileFields(profile, names);
  const finished = profile.onboardingDoneAt !== null;
  return (
    <section className="flex flex-col gap-3.5">
      <SectionHead title={M.sectionTitle} size="sub" />
      <dl className={ROWS}>
        {fields.map((f) => (
          <div key={f.step} className="flex items-center justify-between gap-4 py-[9px]">
            <dt className="shrink-0 text-[13px] text-dim">{f.label}</dt>
            <dd className="flex min-w-0 items-center justify-end gap-2 text-right">
              <span className={f.value === null ? "text-[13px] text-dim" : "break-all text-[13.5px] font-semibold text-ink"}>
                {f.value ?? M.unanswered}
              </span>
              {/* 칸 이름을 링크 이름에 넣는다 — "바꾸기" 다섯 개가 낭독기에서 구분되지 않는다 */}
              <Link
                href={welcomeEditPath(f.step)}
                aria-label={`${f.label} ${f.value === null ? M.pick : M.change}`}
                className="press tap flex h-11 shrink-0 items-center rounded-full px-2.5 text-[13px] font-semibold text-acc hover:underline"
              >
                {f.value === null ? M.pick : M.change}
              </Link>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-[11.5px] text-dim">{M.usedFor}</p>
      <div className="flex flex-wrap items-start gap-2">
        {/* 중간에 멈춘 사람에게 처음부터를 주면 답한 칸을 또 넘겨야 해서 재개 지점(/welcome)으로 보낸다 */}
        <Link href={finished ? welcomeStepPath("platforms") : ROUTES.welcome} className={buttonClass({ size: "sm", variant: "secondary" })}>
          {finished ? M.redo : M.resume}
        </Link>
        <PersonalizationOff />
      </div>
    </section>
  );
}
