"use client";

// 할 일 판. 칸 넷을 가로로 세우고, 카드를 칸 사이로 옮긴다.
//
// 드래그는 여기서 받는다(카드가 보낸다). 드롭은 **칸 전체**가 받는다 — 카드 사이의 가는 틈을 노리게 하면
// 빗나가는 일이 잦고, 이 판은 칸 안 순서를 드래그로 바꾸지 않으므로 정확한 지점이 필요 없다.
// 칸 안 순서는 카드의 위로/아래로 버튼이 맡는다(키보드로도 되어야 하므로).
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { SectionHead } from "@/components/ui/page";
import { TASK_MESSAGES, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import { TASK_STATUSES, type Board, type TaskStatus } from "@/lib/admin/tasks";
import { TaskCard } from "@/components/admin/task-card";
import { clearDoneAction, moveTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

export function TaskBoard({ board }: { board: Board }) {
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [pending, start] = useTransition();
  const [state, setState] = useState<TaskActionState>(null);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionHead title="판" note={`${TASK_STATUSES.reduce((n, s) => n + board[s].length, 0)}건`} />
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
        {TASK_STATUSES.map((status) => (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(status);
            }}
            onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) start(async () => setState(await moveTaskAction(id, status)));
            }}
            className={cn(
              "flex min-h-[120px] flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors",
              dragOver === status ? "border-acc bg-surface-2" : "border-line bg-surface-4/40",
            )}
          >
            <h3 className="flex items-center justify-between px-1 text-[12px] font-semibold text-mut">
              {TASK_STATUS_LABEL[status]}
              <span className="text-[11px] font-normal tabular-nums text-dim">{board[status].length}</span>
            </h3>

            {board[status].length === 0 ? (
              <p className="px-1 py-3 text-[11.5px] text-dim">{TASK_MESSAGES.empty}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {board[status].map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
