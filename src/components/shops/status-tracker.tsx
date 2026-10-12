// 입점 심사 단계 표시 — 세 걸음(신청서, 확인, 열림)을 점과 선으로 잇는다.
//
// 상태 화면이 "심사 중이에요" 한 줄만 말하던 때는 지금이 몇 걸음째인지, 얼마나 남았는지가 안 보였다.
// 걸음 수는 messages 의 trackerSteps 가 정한다. 서버 컴포넌트다 — 움직이는 것이 없다.
import { AlertCircleIcon, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * at: 끝난 걸음 수(0 ~ 걸음 수). tone: at 번째(지금) 걸음의 낯빛.
 * idle 은 아직 시작 전, current 는 진행 중, danger 는 손볼 것이 있음(반려, 정지), done 은 모두 끝.
 */
export type TrackerState = { at: number; tone: "idle" | "current" | "danger" | "done" };

export function StatusTracker({ label, steps, state }: { label: string; steps: readonly string[]; state: TrackerState }) {
  return (
    <ol aria-label={label} className="grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, i) => {
        const done = i < state.at;
        const now = i === state.at && state.tone !== "done";
        const danger = now && state.tone === "danger";
        const active = now && state.tone === "current";
        // 정지는 at=2 에 danger 로 오지만 "매장 열림" 걸음에 경고가 서야 한다 — 마지막 걸음을 넘기지 않는다
        return (
          <li key={step} aria-current={now ? "step" : undefined} className="relative flex flex-col items-center gap-2 text-center">
            {/* 앞 걸음 가운데에서 이 걸음 가운데까지 잇는 선. 점(z-10)이 양 끝을 덮는다. 첫 걸음에는 없다 */}
            {i > 0 && (
              <span aria-hidden className={cn("absolute top-[13px] right-1/2 h-[2px] w-full", i <= state.at ? "bg-ink" : "bg-line-strong")} />
            )}
            <span
              className={cn(
                "relative z-10 flex size-7 items-center justify-center rounded-full text-[12px] font-extrabold",
                done && "bg-ink text-on-ink",
                active && "bg-acc text-on-ink ring-4 ring-acc-soft",
                danger && "bg-danger text-on-ink",
                !done && !active && !danger && "bg-surface-2 text-dim shadow-[inset_0_0_0_1px_var(--line-strong)]",
              )}
            >
              {done ? <CheckIcon size={14} /> : danger ? <AlertCircleIcon size={14} /> : i + 1}
            </span>
            <span className={cn("text-[12.5px] font-semibold", done || now ? "text-ink" : "text-dim")}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
