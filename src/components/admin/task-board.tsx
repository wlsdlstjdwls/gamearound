"use client";

// 할 일 판. 칸 넷을 가로로 세우고, 카드를 칸 사이로 옮긴다.
//
// 드래그는 여기서 받는다(카드가 보낸다). 드롭은 **칸 전체**가 받는다 — 카드 사이의 가는 틈을 노리게 하면
// 빗나가는 일이 잦고, 이 판은 칸 안 순서를 드래그로 바꾸지 않으므로 정확한 지점이 필요 없다.
// 칸 안 순서는 카드의 위로/아래로 버튼이 맡는다(키보드로도 되어야 하므로).
//
// **끌리는 동안 판이 달라 보여야 한다**(2026-09-21): 앞 판은 끌어도 화면이 그대로여서 "지금 뭔가를
// 끌고 있다" 는 사실을 사람이 스스로 기억해야 했다. 지금은 끄는 동안 모든 칸이 받을 자리로 살아나고
// (테두리가 진해진다), 마우스가 올라간 칸만 브랜드 보라로 채워진다. 끌던 카드가 원래 있던 칸은
// 살리지 않는다 — 제자리에 놓는 건 아무것도 하지 않는 일이라 받을 자리처럼 보이면 안 된다.
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { TASK_MESSAGES, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import { TASK_STATUSES, type Board, type TaskStatus } from "@/lib/admin/tasks";
import { TaskCard } from "@/components/admin/task-card";
import { clearDoneAction, moveTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

export function TaskBoard({ board }: { board: Board }) {
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  /** 지금 끌고 있는 카드가 원래 있던 칸. 없으면 아무것도 끌고 있지 않다 */
  const [dragFrom, setDragFrom] = useState<TaskStatus | null>(null);
  const [pending, start] = useTransition();
  const [state, setState] = useState<TaskActionState>(null);

  const endDrag = () => {
    setDragOver(null);
    setDragFrom(null);
  };

  return (
    <section className="flex flex-col gap-3">
      {/* 판 위에 제목을 세우지 않는다 — 화면 제목이 이미 "할 일" 이고 건수도 그 옆에 선다.
          여기 남는 건 끝난 일 치우기 하나뿐이라 오른쪽 끝에 혼자 선다 */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {board.done.length > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(TASK_MESSAGES.clearDoneConfirm)) return;
              start(async () => setState(await clearDoneAction()));
            }}
            className="press rounded-[7px] border border-line-strong px-2.5 py-1 text-[12px] text-mut transition-colors hover:border-danger hover:text-danger disabled:opacity-60"
          >
            {TASK_MESSAGES.clearDone}
          </button>
        )}
      </div>

      {state && !state.ok && <p className="text-[12px] text-danger">{state.error}</p>}

      {/* 칸이 넷이라 좁은 화면에서는 둘씩 접는다 — 넷을 억지로 세우면 카드 폭이 글자보다 좁아진다 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map((status) => {
          const over = dragOver === status;
          // 끌고 있고, 여기가 그 카드가 있던 칸이 아니면 "받을 수 있는 자리"
          const droppable = dragFrom !== null && dragFrom !== status;
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOver(status);
              }}
              onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                endDrag();
                const id = e.dataTransfer.getData("text/plain");
                if (id) start(async () => setState(await moveTaskAction(id, status)));
              }}
              className={cn(
                "flex min-h-[140px] flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors duration-base",
                over && droppable
                  ? "border-acc bg-acc-soft"
                  : droppable
                    ? "border-line-strong bg-surface-4"
                    : "border-line bg-surface-4/40",
              )}
            >
              <h3 className="flex items-center justify-between px-1 py-0.5 text-[12.5px] font-bold text-mut">
                {TASK_STATUS_LABEL[status]}
                <span className="rounded-full bg-surface-3 px-1.5 text-[11px] font-semibold tabular-nums text-dim">
                  {board[status].length}
                </span>
              </h3>

              {board[status].length === 0 ? (
                <p className="px-1 py-3 text-[11.5px] text-dim">
                  {droppable ? TASK_MESSAGES.dropHere : TASK_MESSAGES.empty}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {board[status].map((task) => (
                    <TaskCard key={task.id} task={task} onDragStart={() => setDragFrom(status)} onDragEnd={endDrag} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
