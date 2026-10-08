"use client";
// 온보딩 머리의 퀘스트 지도 — 단계가 칸이고, 지나온 칸이 밝아지고, 마지막 칸은 손전등이다(2026-10-08 사용자가 고른 1+2안).
//
// 12칸 게이지(charge-gauge)를 대신한다. 게이지는 "얼마나 왔나" 만 말했고, 지도는 "무엇을 모았나" 까지 말한다 —
// 답한 칸은 그림이 채워지고, 건너뛴 칸은 빈 테두리로 남는다(벌점처럼 보이지 않게 색을 빼기만 한다. quest.ts 주석).
//
// 클라이언트인 이유는 하나다: 지금 칸은 **고르는 순간** 채워져야 한다(answer-gate 의 answered).
// 저장은 "다음" 에서 하지만, 누른 보람은 누른 순간에 보여야 한다.
// 칸 수를 화면에 숫자로 적지 않는다 — 기기 칸 때문에 사람마다 다르다(steps.ts stepProgress 주석). 낭독기에는 몇 번째인지만 읽힌다.
import { cn } from "@/lib/cn";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { isSlotStep, type QuestNode } from "@/lib/onboarding/quest";
import { BrandSymbol } from "@/components/ui/logo";
import { useAnswerGate } from "@/components/onboarding/answer-gate";
import { STEP_ICON } from "@/components/onboarding/quest-icons";

const NODE_CLASS: Record<QuestNode["state"] | "lit", string> = {
  cleared: "bg-acc text-on-ink",
  // 건너뛴 칸 — 테두리만. 빨강이나 X 를 쓰지 않는다(건너뛰기는 허락된 길이다)
  skipped: "bg-transparent text-dim shadow-[inset_0_0_0_1.5px_var(--line-strong)]",
  // 지금 칸 — 손전등 빛(--beam) 고리. 로고의 빛과 같은 색이라 "여기를 비추고 있다" 로 읽힌다
  current: "bg-surface text-acc shadow-[0_0_0_2px_var(--beam),0_0_10px_var(--beam)]",
  // 지금 칸에서 답을 고른 순간
  lit: "animate-pop bg-acc text-on-ink shadow-[0_0_0_2px_var(--beam),0_0_10px_var(--beam)]",
  locked: "bg-surface-2 text-dim",
};

export function QuestMap({ nodes, className }: { nodes: readonly QuestNode[]; className?: string }) {
  const { answered } = useAnswerGate();
  const at = nodes.findIndex((n) => n.state === "current");
  const reached = at === -1 ? nodes.filter((n) => n.state !== "locked").length : at + 1;

  return (
    <div
      role="progressbar"
      aria-label={M.progressLabel}
      aria-valuemin={0}
      aria-valuemax={nodes.length}
      aria-valuenow={reached}
      aria-valuetext={M.quest.stage(reached)}
      className={cn("flex items-center", className)}
    >
      {nodes.map((n, i) => {
        const lit = n.state === "current" && answered && isSlotStep(n.step);
        const state = lit ? "lit" : n.state;
        const Icon = STEP_ICON[n.step];
        return (
          <div key={n.step} className={cn("flex items-center", i > 0 && "min-w-0 flex-1")} aria-hidden>
            {/* 칸 사이 길. 지나온 길만 칠한다 */}
            {i > 0 && <span className={cn("mx-0.5 h-0.5 min-w-1 flex-1", n.state === "locked" ? "bg-surface-2" : "bg-acc")} />}
            <span
              className={cn(
                // 모서리를 덜 굴린다 — 로고 도트와 같은 집안으로 읽혀야 한다
                "flex size-6 shrink-0 items-center justify-center rounded-[6px] transition-[background-color,box-shadow,color] duration-base ease-standard sm:size-7",
                NODE_CLASS[state],
              )}
            >
              {Icon ? (
                <Icon size={13} />
              ) : (
                // 마지막 칸 — 손전등. 머리에 지도가 뜨는 동안은 늘 아직 안 닿은 칸이라 빛 없이 글자색 한 가지로 그린다.
                // 켜진 손전등은 결과 화면의 칭호 카드가 맡는다
                <BrandSymbol size={16} tone="mono" />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
