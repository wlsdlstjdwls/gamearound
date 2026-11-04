"use client";
// 업무관리 보기 전환(2026-11-04): 칸반 | 일정(WBS).
//
// 누르면 서버를 거치지 않고 그 자리에서 바뀐다(사용자 "탭 누르면 화면 먼저 이동, 좀 느리다"). 페이지가 처음 열 때 두 보기의 자료를
// 나란히 읽어(page.tsx) 둘 다 RSC 로 실어 보내고, 여기서는 어느 쪽을 세울지만 고른다. 주소는 history.replaceState 로만 맞춘다 —
// router.push 면 서버가 같은 자료를 다시 읽느라 1초 남짓 옛 화면이 서 있었다(Neon 왕복, neon-roundtrip-cost).
// 앞서는 경로가 달라(/admin/tasks/plan) 전환마다 loading.tsx 뼈대가 끼어 깜빡였다.
// 보기를 내리면 그 보기의 저장 안 한 값(일정 끌기, 고치기)이 사라지므로 내리기 전에 묻는다(program-shell store 의 dirty).
// 모양은 칸반 거르기 줄의 세그먼트와 같다(task-fields SEGMENT) — 같은 화면 안의 고르기라 같은 손맛이어야 한다.
import { createContext, use, useState } from "react";
import { reportDirty, useDirty } from "@/components/admin/program-shell/store";
import { SEGMENT_ITEM_ON } from "@/components/admin/task-fields";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { PLAN_MESSAGES as M, SCREEN_MESSAGES as SM } from "@/lib/admin/messages";
import { cn } from "@/lib/cn";
import { TASK_VIEW_PARAM, TASK_VIEW_PLAN } from "@/lib/routes";

export type TaskView = "board" | "plan";

/**
 * 낮은 세그먼트(2026-11-04, 사용자 "칸반, 일정, 담당자별, WBS, 일 주 월 영역 세로 높이 좀 줄여도"). 판 여백 p-1 → p-0.5, 칸 36 → 32px.
 * 터치 기기는 .tap 이 44px 를 지킨다. 일정 화면의 고르기 줄(묶어 보기, 눈금)도 이 모양을 쓴다
 */
export const SEGMENT_SM = "flex gap-0.5 rounded-lg bg-surface-2 p-0.5";
// SEGMENT_ITEM 에 덧붙이지 않고 따로 적는다 — cn 은 충돌을 풀지 않아 h-9 와 h-8 중 이기는 쪽이 CSS 생성 순서에 달린다(ui/tag 머리 주석)
export const SEGMENT_SM_ITEM =
  "press tap flex h-8 min-w-0 flex-none cursor-pointer items-center justify-center whitespace-nowrap rounded-md px-3 text-[13px] text-mut transition-colors duration-base hover:text-ink";

const ViewContext = createContext<{ view: TaskView; go: (v: TaskView) => void } | null>(null);

export function TaskViews({ initial, board, plan }: { initial: TaskView; board: React.ReactNode; plan: React.ReactNode }) {
  const [view, setView] = useState(initial);
  const dirty = useDirty();
  const go = async (next: TaskView) => {
    if (next === view) return;
    if (dirty && !(await askConfirm(M.viewLeaveConfirm, { title: SM.dirtyTitle, confirmLabel: M.viewLeave, tone: "danger" }))) return;
    reportDirty(false);
    setView(next);
    const url = new URL(location.href);
    if (next === "plan") url.searchParams.set(TASK_VIEW_PARAM, TASK_VIEW_PLAN);
    else url.searchParams.delete(TASK_VIEW_PARAM);
    history.replaceState(history.state, "", url);
  };
  return <ViewContext value={{ view, go: (v) => void go(v) }}>{view === "plan" ? plan : board}</ViewContext>;
}

const VIEWS: { key: TaskView; label: string }[] = [
  { key: "board", label: M.viewBoard },
  { key: "plan", label: M.viewPlan },
];

export function TaskViewSwitch() {
  const ctx = use(ViewContext);
  return (
    <div role="tablist" aria-label={M.viewLabel} className={cn(SEGMENT_SM, "w-fit")}>
      {VIEWS.map((v) => {
        const on = ctx?.view === v.key;
        return (
          <button key={v.key} type="button" role="tab" aria-selected={on} onClick={() => ctx?.go(v.key)} className={cn(SEGMENT_SM_ITEM, on && SEGMENT_ITEM_ON)}>
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
