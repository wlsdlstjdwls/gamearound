// 선택 카드 아래 도트 게이지 — 성향(인내심)과 플레이타임(길이)을 칸 수로 보여 준다(2026-10-08 게임처럼 고르기 회차).
//
// 글로 "50% 부터 사요", "50시간 넘게" 를 읽고 비교하는 대신, 네 카드의 칸 수가 눈으로 바로 줄 선다.
// 카드를 고르면 칸이 연보라에서 진한 보라로 켜진다(부모 label 의 group/choice 를 본다 — 상태를 따로 안 쥔다).
// peak: 끝까지 찬 칸을 손전등 빛 색으로 — "끝이 없는 것" 처럼 꼭대기 값이 특별한 줄에만 쓴다.
// 낭독기에는 숨긴다(aria-hidden). 같은 뜻을 카드의 둘째 줄(note)이 이미 글로 말한다.
import { cn } from "@/lib/cn";

export function PixelMeter({ level, max, caption, peak = false }: { level: number; max: number; caption: string; peak?: boolean }) {
  return (
    <span aria-hidden className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-dim">{caption}</span>
      <span className="flex gap-0.5">
        {Array.from({ length: max }, (_, i) => {
          const on = i < level;
          return (
            <span
              key={i}
              className={cn(
                // 모서리를 굴리지 않는다 — 로고 도트와 같은 집안
                "size-2.5 transition-colors duration-base ease-standard",
                !on && "bg-surface-2",
                on && !peak && "bg-acc-3 group-has-[:checked]/choice:bg-acc",
                on && peak && "bg-acc-3 group-has-[:checked]/choice:bg-beam",
              )}
            />
          );
        })}
      </span>
    </span>
  );
}
