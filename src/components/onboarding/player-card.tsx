// 결과 화면의 칭호 카드 — 지도를 다 돈 끝에 받는 "내 카드"(2026-10-08 사용자가 고른 1+2안의 1).
//
// 잉크 판에 그린 이유: 화면의 나머지가 연한 바탕이라 카드 하나만 어두워야 "받은 물건" 으로 떨어져 보인다.
// 뒤집혀 들어온다(animate-flip-in). 다크 테마에서는 잉크가 밝은 판이 되는데, on-ink 토큰이 같이 뒤집혀 그대로 읽힌다.
//
// 슬롯 다섯 칸은 머리 지도와 같은 그림을 쓴다(quest-icons) — 지도에서 채운 칸이 여기서 같은 모양으로 모여야 이어진다.
// 건너뛴 칸은 흐리게만 둔다. 레벨은 채운 칸 수다(깎이지 않는다, quest.ts 주석).
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { SLOT_STEPS } from "@/lib/onboarding/quest";
import { SUMMARY_LABELS, type ProfileFieldStep } from "@/lib/onboarding/summary";
import { BrandSymbol } from "@/components/ui/logo";
import { STEP_ICON } from "@/components/onboarding/quest-icons";

/** 슬롯 칸 밑 이름. summary 의 줄 이름과 같은 말을 쓴다 — 설정 화면의 칸 이름과 어긋나지 않게 */
const SLOT_LABEL: Record<ProfileFieldStep, string> = {
  platforms: SUMMARY_LABELS.platforms,
  genres: SUMMARY_LABELS.genres,
  "deal-style": SUMMARY_LABELS.dealStyle,
  "play-time": SUMMARY_LABELS.playTime,
  subscriptions: SUMMARY_LABELS.subscriptions,
};

/** 카드가 뒤집혀 들어오는 순번 — 제목이 먼저 자리 잡은 뒤 */
const CARD_STAGGER = 1;

export function PlayerCard({ title, filled }: { title: string; filled: readonly ProfileFieldStep[] }) {
  return (
    <section
      aria-label={M.quest.cardLabel}
      className="animate-flip-in flex flex-col gap-4 rounded-[var(--radius-panel)] bg-ink p-5 text-on-ink shadow-hair [animation-delay:var(--stagger)]"
      style={stagger(CARD_STAGGER)}
    >
      <div className="flex items-center gap-3">
        <BrandSymbol size={44} tone="onInk" />
        <div className="min-w-0">
          <p className="text-[12px] font-medium opacity-70">{M.quest.cardLabel}</p>
          <p className="text-[20px] font-extrabold leading-[1.25] tracking-[-0.03em]">{title}</p>
        </div>
      </div>

      <p className="text-[12.5px] font-bold tracking-[-0.01em] text-acc-on-ink">
        {M.quest.level(filled.length)} | {M.quest.slots(filled.length, SLOT_STEPS.length)}
      </p>

      <ul className="grid grid-cols-5 gap-2">
        {SLOT_STEPS.map((step, i) => {
          const on = filled.includes(step);
          const Icon = STEP_ICON[step];
          return (
            <li key={step} className="flex flex-col items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "flex size-10 items-center justify-center rounded-[8px]",
                  // 채운 칸은 카드 뒤집힘이 끝난 뒤 하나씩 튀어 오른다
                  on ? "animate-pop bg-acc-on-ink text-ink [animation-delay:var(--stagger)]" : "bg-on-ink/10 opacity-50",
                )}
                style={on ? stagger(CARD_STAGGER + 3 + i) : undefined}
              >
                {Icon && <Icon size={18} />}
              </span>
              <span className={cn("text-[11px] leading-none", on ? "opacity-90" : "opacity-45")}>{SLOT_LABEL[step]}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
