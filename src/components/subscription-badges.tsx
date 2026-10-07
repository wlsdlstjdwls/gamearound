// 구독 포함 표시 — 기획서 F7.
//
// 게임 위가 아니라 **플랫폼 탭 안**에 둔다(2026-09-15). 이전에는 상세 상단에
// "Game Pass 콘솔 | PC Game Pass 로 플레이할 수 있어요" 를 한 줄로 띄웠는데, Game Pass 는
// Xbox 에서만 유효한 혜택이라 PS 탭을 보는 사람에게도 같은 말이 걸렸다. 구독은 스토어의 성질이다.
//
// 마이크로소프트 로고를 쓰지 않고 텍스트로만 표시한다(상표 문제). 서비스 이름은 subscriptions.label_ko 가 원천이다.
//
// 색은 --ok(초록)가 아니라 브랜드 악센트다(2026-09-15 교체). 초록은 이 화면에서 "싸다, 최저가" 라는
// 판정을 말하는 색인데, 구독 포함은 판정이 아니라 사실이라 같은 색으로 말하면 가격 판정으로 읽힌다.
// 같은 행의 "최저", 할인율은 꽉 찬 --acc 판이라 여기는 연한 --acc-soft 로 한 단 내린다 — 결론이 아니라 곁가지다.
// 모양도 알약 + 점에서 옆 배지들과 같은 사각 태그(--radius-xs)로 맞춘다. 한 행 안에서 배지가 세 가지 모양으로 서 있었다.
import { subscriptionChipText } from "@/lib/games/messages";
import type { SubscriptionDto } from "@/server/services/games";
import { tagClass } from "@/components/ui/tag";

/** 한 플랫폼이 포함된 구독들. 없으면 아무것도 그리지 않는다 */
export function SubscriptionChips({ subscriptions }: { subscriptions: SubscriptionDto[] }) {
  if (subscriptions.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-baseline gap-1" aria-label="구독 포함">
      {subscriptions.map((s) => (
        <li key={s.key} className={tagClass({ tight: false })}>
          {subscriptionChipText(s.label)}
        </li>
      ))}
    </ul>
  );
}
