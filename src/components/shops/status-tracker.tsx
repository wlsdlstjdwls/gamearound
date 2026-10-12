// 입점 심사 단계 표시 — 세 걸음(신청서, 확인, 열림)을 굵은 진행 막대와 큰 점으로 잇는다.
//
// 상태 화면이 "심사 중이에요" 한 줄만 말하던 때는 지금이 몇 걸음째인지, 얼마나 남았는지가 안 보였다.
// 첫 판(가는 선 + 28px 회색 점)은 "눈에 안 띈다, 효과도 없다"(2026-10-12 사용자)였다. 그래서:
//  - 판 자체를 보라 틴트 띠로 세우고, 끝난 걸음은 브랜드 보라로 채운다(먹색은 본문 글자와 겹쳐 안 튄다)
//  - 막대는 열릴 때 bar-grow 로 차오른다 — 어디까지 왔는지를 움직임으로 한 번 말한다
//  - 지금 걸음은 soon-ripple 물결이 퍼진다 — "여기서 무엇인가 진행 중" 이라는 뜻. 반려, 정지는 빨간 물결
// 키프레임은 globals.css 에 이미 있는 것만 쓴다. 모션 축소는 전역 킬스위치가 끈다.
// 걸음 수는 messages 의 trackerSteps 가 정한다. 서버 컴포넌트다 — 상태가 없다.
import type { CSSProperties } from "react";
import { AlertCircleIcon, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";

/**
 * at: 끝난 걸음 수(0 ~ 걸음 수). tone: at 번째(지금) 걸음의 낯빛.
 * idle 은 아직 시작 전, current 는 진행 중, danger 는 손볼 것이 있음(반려, 정지), done 은 모두 끝.
 */
export type TrackerState = { at: number; tone: "idle" | "current" | "danger" | "done" };

/** 물결 둘의 시작 어긋남 — coming-soon 판과 같은 값(한 물결이 반쯤 퍼졌을 때 다음이 태어난다) */
const RIPPLE_DELAYS = [0, 1400];

export function StatusTracker({ label, steps, state }: { label: string; steps: readonly string[]; state: TrackerState }) {
  const last = steps.length - 1;
  // 막대는 첫 점 가운데에서 지금 점 가운데까지 찬다. 모두 끝나면 끝까지
  const reach = Math.min(state.at, last);
  const fill = last > 0 ? (reach / last) * 100 : 0;
  // 막대는 칸 가운데에서 가운데까지라 양 끝을 반 칸씩 들인다
  const inset = `${50 / steps.length}%`;

  return (
    <div className="rounded-[var(--radius-md)] bg-[linear-gradient(180deg,var(--acc-soft),transparent)] px-2 pt-6 pb-4 sm:px-4">
      <ol aria-label={label} className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        <span aria-hidden className="absolute top-[20px] h-1.5 rounded-full bg-line-strong" style={{ left: inset, right: inset }}>
          <span
            className="bar-grow block h-full rounded-full bg-acc"
            style={{ "--bar-w": `${fill}%` } as CSSProperties}
          />
        </span>

        {steps.map((step, i) => {
          const done = i < state.at;
          const now = i === state.at && state.tone !== "done";
          const danger = now && state.tone === "danger";
          const active = now && state.tone === "current";
          return (
            <li
              key={step}
              aria-current={now ? "step" : undefined}
              className="enter-item relative flex flex-col items-center gap-2.5 text-center"
              style={stagger(i)}
            >
              <span className="relative flex size-[46px] items-center justify-center">
                {(active || danger) &&
                  RIPPLE_DELAYS.map((delay) => (
                    <span
                      key={delay}
                      aria-hidden
                      className={cn("soon-ripple absolute inset-0 rounded-full", danger ? "bg-danger" : "bg-acc")}
                      style={{ "--stagger": `${delay}ms` } as CSSProperties}
                    />
                  ))}
                <span
                  className={cn(
                    "relative z-10 flex size-[46px] items-center justify-center rounded-full text-[15px] font-extrabold",
                    done && "bg-acc text-on-ink shadow-2",
                    active && "bg-surface text-acc shadow-[0_0_0_3px_var(--acc)]",
                    danger && "bg-danger text-on-ink shadow-2",
                    !done && !now && "bg-surface text-dim shadow-[0_0_0_2px_var(--line-strong)]",
                    now && !active && !danger && "bg-surface text-ink shadow-[0_0_0_3px_var(--ink)]",
                  )}
                >
                  {done ? <CheckIcon size={20} /> : danger ? <AlertCircleIcon size={20} /> : i + 1}
                </span>
              </span>
              <span
                className={cn(
                  "text-[13.5px] font-bold tracking-[-0.02em]",
                  danger ? "text-danger" : active ? "text-acc" : done || now ? "text-ink" : "text-dim",
                )}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
