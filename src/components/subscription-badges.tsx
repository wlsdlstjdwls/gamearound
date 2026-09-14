// 구독 포함 배지 — 기획서 F7.
// 마이크로소프트 로고를 쓰지 않고 텍스트로만 표시한다(상표 문제). 서비스 이름은 subscriptions.label_ko 가 원천이다.
import { GAME_MESSAGES, subscriptionText } from "@/lib/games/messages";
import type { SubscriptionDto } from "@/server/services/games";

export function SubscriptionBadges({ subscriptions }: { subscriptions: SubscriptionDto[] }) {
  if (subscriptions.length === 0) return null;
  const labels = subscriptions.map((s) => s.label);

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border border-acc/30 bg-acc-soft px-3 py-2"
      aria-label={GAME_MESSAGES.subscriptionHeading}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-acc" />
      <span className="text-[12.5px] font-semibold text-acc">{subscriptionText(labels)}</span>
    </div>
  );
}
