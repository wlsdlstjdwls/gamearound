"use client";

// 할 일 카드 한 장 — **보는 자리**다. 적고 고치는 일은 팝업이 맡는다(dialog.tsx).
//
// 왜 갈랐나(2026-09-21): 앞 카드는 250px 폭 안에 선택 상자 하나와 버튼 여섯 개를 11px 글자로
// 두 줄에 깔고 있었다. 그 자리에서 제목을 고치고 기록까지 적으라고 하니 "너무 불편하다" 는 말을 들었다.
// 지금 카드에 남은 건 읽을 것(제목, 급함, 메모 첫 줄, 붙인 대상, 기록 수)과 **순서 바꾸기 둘**뿐이다.
// 순서만 카드에 남긴 이유: 순서는 옆 카드와 견줘서 정하는 값이라 판을 보면서 눌러야 한다.
//
// **드래그만 두지 않는 이유**(AGENTS §6 a11y): 드래그는 포인터 기기에만 있는 길이다.
// 칸 옮기기는 팝업 안의 칸 단추가 맡고(키보드로 된다), 드래그는 마우스에게만 얹어 주는 지름길이다.
//
// **끌리는 느낌**: 커서는 평소 grab, 누르는 순간과 끄는 동안 grabbing 이다(globals.css 의 .grabbable).
// 커서를 전역 규칙으로 뺀 이유는 끄는 동안 포인터가 카드 밖으로 나가기 때문이다 — 그때는 문서가 커서를 받아야 한다.
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { panelClass } from "@/components/ui/page";
import { TASK_MESSAGES, TASK_PRIORITY_LABEL } from "@/lib/admin/messages";
import { type AdminTask } from "@/lib/admin/tasks";
import { reorderTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

/** 급함 표시. 보통은 아무 표시도 하지 않는다 — 전부 표시하면 어느 것도 눈에 띄지 않는다 */
const PRIORITY_STYLE: Record<AdminTask["priority"], string> = {
  high: "bg-danger-soft text-danger",
  normal: "",
  low: "bg-surface-3 text-dim",
};

/** 순서 단추. hover 전에는 흐리게 둔다 — 카드에서 먼저 읽혀야 하는 건 제목이다 */
const ORDER_BTN =
  "press rounded-[6px] px-1.5 py-0.5 text-[11px] text-dim opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-40";

export function TaskCard({
  task,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  task: AdminTask;
  /**
   * 카드를 연다. 팝업 자체는 **판이 들고 있다**(task-board) — 카드가 들고 있으면 칸을 옮기는 순간
   * 카드가 다른 칸에서 새로 그려지면서 열려 있던 팝업이 닫힌다(실측). 옮기는 일은 팝업 안에서 하는 일이다.
   */
  onOpen: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<TaskActionState>(null);
  const [dragging, setDragging] = useState(false);

  const run = (fn: () => Promise<TaskActionState>) => start(async () => setState(await fn()));

  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
        onDragStart?.(task.id);
      }}
      onDragEnd={() => {
        setDragging(false);
        onDragEnd?.();
      }}
      className={panelClass(
        cn(
          "grabbable group flex flex-col transition-[opacity,transform] duration-base",
          dragging && "dragging rotate-[1.5deg] opacity-50",
          pending && "opacity-60",
        ),
      )}
    >
      {/* 카드 전체가 여는 자리다. 안에 링크를 넣지 않는 이유는 버튼 안의 링크가 못 눌리기 때문이다 —
          붙인 대상으로 가는 길은 팝업 안에 있다 */}
      <button type="button" onClick={() => onOpen(task.id)} className="flex w-full flex-col gap-2 p-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-[13px] font-semibold leading-[1.45] text-ink">{task.title}</p>
          {task.priority !== "normal" && (
            <span className={cn("shrink-0 rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-semibold", PRIORITY_STYLE[task.priority])}>
              {TASK_PRIORITY_LABEL[task.priority]}
            </span>
          )}
        </div>

        {/* 메모는 두 줄까지만. 카드가 길어지면 네 칸을 한 화면에 세운다는 판의 목적이 깨진다 */}
        {task.body && <p className="line-clamp-2 whitespace-pre-wrap text-[12px] leading-[1.6] text-mut">{task.body}</p>}

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {task.game && <span className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 text-acc">{task.game.title}</span>}
          {task.shop && <span className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 text-mut">{task.shop.name}</span>}
          {task.source && <span className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 font-mono text-mut">{task.source}</span>}
          {task.notes.length > 0 && <span className="text-dim">{TASK_MESSAGES.noteCount(task.notes.length)}</span>}
        </div>
      </button>

      <div className="flex items-center gap-1 px-2 pb-1.5">
        <button type="button" className={ORDER_BTN} disabled={pending} onClick={() => run(() => reorderTaskAction(task.id, "up"))}>
          {TASK_MESSAGES.up}
        </button>
        <button type="button" className={ORDER_BTN} disabled={pending} onClick={() => run(() => reorderTaskAction(task.id, "down"))}>
          {TASK_MESSAGES.down}
        </button>
        <span className="ml-auto text-[10.5px] text-dim opacity-0 transition-opacity group-hover:opacity-100">
          {TASK_MESSAGES.openHint}
        </span>
      </div>

      {state && !state.ok && (
        <p role="alert" className="px-3 pb-2 text-[11.5px] text-danger">
          {state.error}
        </p>
      )}
    </li>
  );
}
