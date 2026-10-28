// 등록현황 줄의 진행 단계 셋 — 등록 신청, 운영진 확인, 등록 완료(반려면 마지막 칸이 반려).
// 2026-10-28(사용자: "등록현황이 너무 밋밋하다"). 상태 알약 하나로는 "어디까지 왔고 무엇을 기다리는지" 가 안 보였다.
// 지금 머무는 칸은 브랜드색 고리가 천천히 번진다(.step-live, 줄이기 설정에서는 전역 킬스위치가 멈춘다). 지난 칸은 채운 원 + 체크.
// 점 사이 선은 다음 칸의 상태 색을 따른다 — "여기까지 왔다" 가 선 길이로 읽힌다. 서버 컴포넌트다.
import { Fragment } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { INDIE_REVIEW_MESSAGES as RV } from "@/lib/indie/messages";
import type { IndieReview } from "@/server/db/schema";

type StepState = "done" | "live" | "todo" | "fail";

const LINE: Record<StepState, string> = { done: "bg-acc", live: "bg-acc", todo: "bg-line", fail: "bg-danger" };

function Dot({ state }: { state: StepState }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-6 shrink-0 place-items-center rounded-full text-on-ink",
        (state === "done" || state === "live") && "bg-acc",
        state === "live" && "step-live",
        state === "todo" && "bg-surface shadow-[inset_0_0_0_2px_var(--line-strong)]",
        state === "fail" && "bg-danger",
      )}
    >
      {state === "done" && <CheckIcon size={13} strokeWidth={3} />}
      {state === "fail" && <XIcon size={13} strokeWidth={3} />}
      {state === "live" && <span className="size-2 rounded-full bg-on-ink" />}
    </span>
  );
}

export function ReviewSteps({ review, className }: { review: IndieReview; className?: string }) {
  const steps: Array<{ label: string; state: StepState }> = [
    { label: RV.stepApplied, state: "done" },
    { label: RV.stepReview, state: review === "pending" ? "live" : "done" },
    review === "rejected" ? { label: RV.stepRejected, state: "fail" } : { label: RV.stepDone, state: review === "approved" ? "done" : "todo" },
  ];
  return (
    <div role="list" aria-label={RV.stepsLabel} className={cn("grid grid-cols-[auto_minmax(16px,1fr)_auto_minmax(16px,1fr)_auto] items-start gap-x-1.5", className)}>
      {steps.map((s, i) => (
        <Fragment key={s.label}>
          {i > 0 && <span aria-hidden className={cn("mt-[11px] h-0.5 rounded-full", LINE[s.state])} />}
          <span role="listitem" className="flex flex-col items-center gap-1.5">
            <Dot state={s.state} />
            <span className={cn("whitespace-nowrap text-[12px] font-semibold", s.state === "todo" ? "text-dim" : s.state === "fail" ? "text-danger" : "text-ink")}>
              {s.label}
              {s.state === "live" && <span className="sr-only"> {RV.stepLiveSr}</span>}
              {s.state === "done" && <span className="sr-only"> {RV.stepDoneSr}</span>}
            </span>
          </span>
        </Fragment>
      ))}
    </div>
  );
}
