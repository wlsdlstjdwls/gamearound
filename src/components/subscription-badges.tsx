// 구독 포함 표시 — 기획서 F7.
//
// 게임 위가 아니라 **플랫폼 탭 안**에 둔다(2026-09-15). 이전에는 상세 상단에
// "Game Pass 콘솔 | PC Game Pass 로 플레이할 수 있어요" 를 한 줄로 띄웠는데, Game Pass 는
// Xbox 에서만 유효한 혜택이라 PS 탭을 보는 사람에게도 같은 말이 걸렸다. 구독은 스토어의 성질이다.
//
// 마이크로소프트 로고를 쓰지 않고 텍스트로만 표시한다(상표 문제). 서비스 이름은 subscriptions.label_ko 가 원천이다.
import { subscriptionChipText } from "@/lib/games/messages";
import type { SubscriptionDto } from "@/server/services/games";

/** 한 플랫폼이 포함된 구독들. 없으면 아무것도 그리지 않는다 */
export function SubscriptionChips({ subscriptions }: { subscriptions: SubscriptionDto[] }) {
  if (subscriptions.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="구독 포함">
      {subscriptions.map((s) => (
        <li
          key={s.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-acc/30 bg-acc-soft px-[11px] py-1 text-[12px] font-semibold text-acc"
        >
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-acc" />
          {subscriptionChipText(s.label)}
        </li>
      ))}
    </ul>
  );
}
