"use client";

// 할 일 하나를 여는 팝업 — 고치기, 칸 옮기기, 기록, 지우기가 전부 여기 있다(2026-09-21).
//
// **왜 카드 안이 아니라 팝업인가**: 카드는 판의 한 칸이라 폭이 250px 안팎이다. 그 안에서 제목을
// 고치고 기록을 적으려니 입력칸이 한 줄짜리로 납작해졌고, 버튼 일곱 개가 11px 글자로 두 줄에 깔렸다.
// 카드는 **보는 자리**고 팝업은 **쓰는 자리**다. 이렇게 가르면 카드에는 읽을 것만 남는다.
//
// 칸 옮기기를 고치기 폼 **밖**에 둔 이유: 칸 이동은 자취를 남기는 일이라 제 액션을 탄다.
// 저장 버튼 안에 묶으면 "제목만 고쳤는데 자취가 남는" 일이 생긴다.
//
// 지우기는 맨 아래 따로 선다. 저장 옆에 두면 손이 미끄러진다.
//
// "붙인 대상" 마디를 없앴다(2026-09-22): 게임을 고르는 칸이 고치기 폼 안에 생기면서 같은 값이
// 한 팝업에 두 번 섰다. 게임 상세로 가는 길은 고른 칩 옆으로 옮겼고, 매장과 소스도 그 아래 붙였다.
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { Sheet } from "@/components/ui/sheet";
import { TASK_MESSAGES, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import { TASK_STATUSES, type AdminTask } from "@/lib/admin/tasks";
import { TaskEditForm } from "@/components/admin/task-card/edit-form";
import { TaskNotes } from "@/components/admin/task-card/notes";
import { deleteTaskAction, moveTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

/** 팝업 안의 마디 제목 — 본문 제목(SectionHead)보다 작다. 여기서 갈리는 건 화면이 아니라 일이다 */
function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[11.5px] font-bold tracking-[0.08em] text-dim-2">{title}</h3>
      {children}
    </section>
  );
}

export function TaskDialog({ task, open, onOpenChange }: { task: AdminTask; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<TaskActionState>(null);

  const run = (fn: () => Promise<TaskActionState>) => start(async () => setState(await fn()));

  // 시트 머리에 **이 할 일의 제목**을 적는다(2026-09-22). "할 일" 이라고만 적혀 있으면
  // 판이 가려진 상태에서 지금 무엇을 보고 있는지 알 길이 제목 입력칸 안뿐이었다.
  return (
    <Sheet title={task.title} size="wide" open={open} onOpenChange={onOpenChange}>
      <div className={cn("flex flex-col gap-6 pb-2 pt-2", pending && "opacity-70")}>
        {/* 칸이 맨 위에 선다 — 팝업을 여는 이유의 절반은 "이걸 다음 칸으로 옮기려고" 다.
            앞서는 고치기 폼 아래라 옮기려면 스크롤을 지나야 했다 */}
        <Part title={TASK_MESSAGES.place}>
          <div className="flex flex-wrap gap-1.5">
            {TASK_STATUSES.map((s) => {
              const here = task.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={pending || here}
                  aria-current={here ? "true" : undefined}
                  onClick={() => run(() => moveTaskAction(task.id, s))}
                  className={cn(
                    "press flex min-h-[var(--touch-target)] flex-1 items-center justify-center rounded-xl px-3 text-[13.5px] transition-colors",
                    here
                      ? "bg-acc font-semibold text-on-ink"
                      : "bg-surface text-mut shadow-[0_0_0_1px_var(--line)] hover:text-ink disabled:opacity-60",
                  )}
                >
                  {TASK_STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
        </Part>

        <Part title={TASK_MESSAGES.basics}>
          <TaskEditForm task={task} />
        </Part>

        <Part title={TASK_MESSAGES.notes}>
          <TaskNotes taskId={task.id} notes={task.notes} />
        </Part>

        {state && !state.ok && (
          <p role="alert" className="animate-rise text-[12.5px] text-danger">
            {state.error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-[11.5px] text-dim">
            {TASK_MESSAGES.updatedAt} {formatDateTime(task.updatedAt)}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(TASK_MESSAGES.removeConfirm)) return;
              onOpenChange(false);
              run(() => deleteTaskAction(task.id));
            }}
            className="press rounded-xl px-3 py-2 text-[12.5px] text-mut transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
          >
            {TASK_MESSAGES.dangerZone}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
