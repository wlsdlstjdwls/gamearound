// 0단계 — "새 게임 시작" 화면(2026-10-08 사용자 요청: 첫 화면도 게임처럼).
//
// 동의를 가입 약관에 끼워 넣지 않고 여기서 따로 받는 이유는 설계 §5 다. 가입에 묶으면
// "가입하려면 취향을 내놔야 한다" 가 되고, 그건 선택 동의가 아니다.
//
// 배치: 손전등(IntroHero)이 제목 위에서 떠 있고, 본문은 약속 세 줄 판 + 동의 키 하나다.
// 동의는 작은 체크박스가 아니라 선택 카드와 같은 게임 키(ChoiceCard)다 — 이 화면에서 사람이 하는 일이
// 이것 하나뿐이라 가장 눈에 띄어야 한다. 기본은 꺼져 있다(미리 켜 두면 고른 적 없는 값이 동의로 기록된다).
// 머리의 지도는 이 화면에서 전부 잠긴 칸으로 보인다 — 앞으로 돌 판을 미리 보여 주는 셈이다(quest.ts).
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { ChoiceCard } from "@/components/ui/choice-card";
import { BrandSymbol } from "@/components/ui/logo";
import { ClockIcon, ShieldIcon, SlidersIcon } from "@/components/ui/icons";

/** 약속 세 줄의 그림 — M.intro.points 와 같은 순서(시간, 설정, 보호) */
const POINT_ICONS = [ClockIcon, SlidersIcon, ShieldIcon] as const;

const CONSENT_ERROR_ID = "onboarding-consent-error";

/** 제목 위 손전등 — 빛 색 후광 위에서 천천히 떠 있다(soon-float). 후광은 그림이라 낭독기에서 숨긴다 */
export function IntroHero() {
  return (
    <div aria-hidden className="relative mb-3 flex h-16 w-24 items-center justify-center sm:mb-4">
      {/* 후광은 그림 칸 안쪽에서만 번진다 — 크게 번지면 좁은 화면 왼쪽 끝에서 잘려 보였다 */}
      <span className="absolute inset-3 rounded-full bg-beam opacity-30 blur-lg" />
      <span className="soon-float relative">
        <BrandSymbol size={72} />
      </span>
    </div>
  );
}

export function IntroBody({ error }: { error?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <section className="key-field rounded-[14px] px-4 py-3.5">
        <h2 className="text-[12px] font-bold text-mut">{M.intro.briefing}</h2>
        <ul className="mt-2.5 flex flex-col gap-2.5">
          {M.intro.points.map((p, i) => {
            const Icon = POINT_ICONS[i];
            return (
              <li key={p} className="flex items-center gap-3 text-[13.5px] leading-[1.5] text-ink-2">
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-acc-soft text-acc">
                  {Icon && <Icon size={16} />}
                </span>
                {p}
              </li>
            );
          })}
        </ul>
      </section>

      <div>
        <ChoiceCard multiple name="consent" value="on" label={M.intro.consent} describedBy={error ? CONSENT_ERROR_ID : undefined} />
        {error && (
          <p id={CONSENT_ERROR_ID} role="alert" className="mt-2 animate-shake text-[12.5px] text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
