// 온보딩 진행 게이지 — 3px 막대 대신 로고 손전등과 같은 12칸 도트가 단계마다 켜진다.
//
// 왜 칸인가(2026-10-08 사용자 요청 "인터랙티브하게"): 이어진 막대는 답을 하나 해도 몇 px 늘 뿐이라
// 눌렀다는 보람이 안 보인다. 칸은 "하나 켜졌다" 가 눈에 박힌다.
// 막 켜진 칸만 빛 색(--beam)으로 튀어 오른다 — 다른 칸까지 움직이면 매 단계 처음부터 충전하는 것처럼 보인다.
//
// 칸 수는 고정이다(GAUGE_CELLS). 단계 수는 사람마다 달라서(기기 단계) 칸을 단계에 1:1 로 매기면
// 플랫폼에서 PC 를 고르는 순간 칸이 하나 늘어난다. 퍼센트를 적지 않는 이유는 steps.ts 의 stepProgress 주석.
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { GAUGE_CELLS } from "@/lib/onboarding/steps";

/** 막 켜진 칸이 튀어 오르는 순번. 제목(0), 본문(1)이 먼저 자리를 잡은 뒤에 켜져야 눈이 따라간다 */
const LIT_STAGGER_INDEX = 2;

export function ChargeGauge({ lit, className }: { lit: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-label={M.progressLabel}
      aria-valuemin={0}
      aria-valuemax={GAUGE_CELLS}
      aria-valuenow={lit}
      className={cn("flex items-center gap-1", className)}
    >
      {Array.from({ length: GAUGE_CELLS }, (_, i) => {
        const on = i < lit;
        const newest = i === lit - 1;
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              // 모서리를 굴리지 않는다 — 로고와 같은 도트로 읽혀야 한다
              "h-2 min-w-0 flex-1",
              newest ? null : on ? "bg-acc" : "bg-surface-2",
              newest && "animate-pop bg-beam shadow-[0_0_8px_var(--beam)] [animation-delay:var(--stagger)]",
            )}
            style={newest ? stagger(LIT_STAGGER_INDEX) : undefined}
          />
        );
      })}
    </div>
  );
}
