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
import { SEGMENT, SEGMENT_ITEM, SEGMENT_ITEM_ON } from "@/components/admin/task-fields";
import { formatLongDateTime } from "@/lib/format";
import { Sheet } from "@/components/ui/sheet";
import { TASK_MESSAGES, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import { TASK_STATUSES, type AdminTask, type TaskAssignee } from "@/lib/admin/tasks";
import { TaskEditForm } from "@/components/admin/task-card/edit-form";
import { TaskNotes } from "@/components/admin/task-card/notes";
import { deleteTaskAction, moveTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

/**
 * 팝업 안의 마디 — 본문 제목(SectionHead)보다 작다. 여기서 갈리는 건 화면이 아니라 일이다.
 * 마디 사이에 헤어라인을 긋고 제목을 잉크로 세운다(2026-10-01) — 앞서는 11.5px 흐린 제목뿐이라
 * 놓인 칸, 내용, 기록이 한 덩어리로 흘러 "어디까지가 무엇인지" 가 안 갈렸다.
 */
function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-[14px] font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}

export function TaskDialog({
  task,
  assignees,
  open,
  onOpenChange,
}: {
  task: AdminTask;
  assignees: TaskAssignee[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<TaskActionState>(null);

  const run = (fn: () => Promise<TaskActionState>) => start(async () => setState(await fn()));

  // 시트 머리에 **이 할 일의 제목**을 적는다(2026-09-22). "할 일" 이라고만 적혀 있으면
  // 판이 가려진 상태에서 지금 무엇을 보고 있는지 알 길이 제목 입력칸 안뿐이었다.
  return (
    <Sheet title={task.title} size="wide" open={open} onOpenChange={onOpenChange}>
      <div className={cn("flex flex-col gap-5 pb-2 pt-2", pending && "opacity-70")}>
        {/* 칸이 맨 위에 선다 — 팝업을 여는 이유의 절반은 "이걸 다음 칸으로 옮기려고" 다.
            앞서는 고치기 폼 아래라 옮기려면 스크롤을 지나야 했다 */}
        <Part title={TASK_MESSAGES.place}>
          {/* 고치기 폼의 급함 칸과 같은 세그먼트다(task-fields). 앞서는 44px 큰 버튼 넷이 한 줄을 통째로 먹었다 */}
          <div className={SEGMENT}>
            {TASK_STATUSES.map((s) => {
              const here = task.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={pending || here}
                  aria-current={here ? "true" : undefined}
                  onClick={() => run(() => moveTaskAction(task.id, s))}
                  className={cn(SEGMENT_ITEM, here ? SEGMENT_ITEM_ON : "disabled:opacity-60")}
                >
                  {TASK_STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
        </Part>

        <Part title={TASK_MESSAGES.basics}>
          <TaskEditForm task={task} assignees={assignees} />
        </Part>

        <Part title={task.notes.length > 0 ? TASK_MESSAGES.noteCount(task.notes.length) : TASK_MESSAGES.notes}>
          <TaskNotes taskId={task.id} notes={task.notes} />
        </Part>

        {state && !state.ok && (
          <p role="alert" className="animate-rise text-[13.5px] text-danger">
            {state.error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          {/* 올린 사람은 고친 때와 한 줄에 선다 — 둘 다 "이 카드의 내력" 이라 고치는 칸들과 떼어 둔다 */}
          <span className="text-[12.5px] text-dim">
            {TASK_MESSAGES.author} {task.author?.name ?? TASK_MESSAGES.authorUnknown} | {TASK_MESSAGES.updatedAt}{" "}
            {formatLongDateTime(task.updatedAt)}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(TASK_MESSAGES.removeConfirm)) return;
              onOpenChange(false);
              run(() => deleteTaskAction(task.id));
            }}
            className="press rounded-xl px-3 py-2 text-[13.5px] text-mut transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-60"
          >
            {TASK_MESSAGES.dangerZone}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
