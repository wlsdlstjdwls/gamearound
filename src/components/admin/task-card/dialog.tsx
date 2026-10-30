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
import { useCodes } from "@/components/code-book";
import { useActionState, useId, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { INLINE_LABEL, SEGMENT, SEGMENT_ITEM, SEGMENT_ITEM_ON, TaskPart } from "@/components/admin/task-fields";
import { formatLongDateTime } from "@/lib/format";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TASK_ATTACHMENT_MESSAGES, TASK_MESSAGES } from "@/lib/admin/messages";
import { BOARD_STATUSES, type AdminTask, type TaskAssignee } from "@/lib/admin/tasks";
import { TaskEditForm } from "@/components/admin/task-card/edit-form";
import { TaskNotes } from "@/components/admin/task-card/notes";
import { TaskAttachmentsPart } from "@/components/admin/task-attachments";
import { deleteTaskAction, moveTaskAction, updateTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { CONFIRM_MESSAGES } from "@/lib/messages/confirm";

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
  const { name } = useCodes();
  const [pending, start] = useTransition();
  const [state, setState] = useState<TaskActionState>(null);

  const run = (fn: () => Promise<TaskActionState>) => start(async () => setState(await fn()));
  // 고치기 폼의 상태는 팝업이 쥔다 — 저장 버튼이 머리에 서서(2026-10-12, 사용자 요청) 폼 밖이 됐다
  const formId = useId();
  const [saveState, saveAction, saving] = useActionState<TaskActionState, FormData>(updateTaskAction, null);

  // 칸이 맨 위에 선다 — 팝업을 여는 이유의 절반은 "이걸 다음 칸으로 옮기려고" 다.
  // 앞서는 고치기 폼 아래라 옮기려면 스크롤을 지나야 했다
  // 이름과 세그먼트를 한 줄에 눕힌다(2026-10-12, 사용자: "놓인 칸 영역도 너무 크다") — 앞에는 제목 한 줄, 창 폭 전체 세그먼트 한 줄로
  // 두 줄을 먹었다. 값이 셋뿐이라 칸 폭은 300px 이면 충분하다
  const placeRow = (
    <div className="flex min-w-0 items-center gap-3">
      <span className={INLINE_LABEL}>{TASK_MESSAGES.place}</span>
      {/* 고치기 폼의 급함 칸과 같은 세그먼트다(task-fields). 앞서는 44px 큰 버튼 넷이 한 줄을 통째로 먹었다 */}
      <div className={cn(SEGMENT, "min-w-0 flex-1 sm:w-[300px] sm:flex-none")}>
        {BOARD_STATUSES.map((s) => {
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
              {name("TASK_STATUS", s)}
            </button>
          );
        })}
      </div>
    </div>
  );

  // 시트 머리에 **이 할 일의 제목**을 적는다(2026-09-22). "할 일" 이라고만 적혀 있으면
  // 판이 가려진 상태에서 지금 무엇을 보고 있는지 알 길이 제목 입력칸 안뿐이었다.
  return (
    <Sheet
      title={task.title}
      size="wide"
      open={open}
      onOpenChange={onOpenChange}
      actions={
        <>
          {/* 저장 완료는 버튼 옆 짧은 말이다. 제목이 길면 제목 쪽이 말줄임으로 물러난다(sheet 머리) */}
          {saveState?.ok && saveState.message && !saving && <span className="animate-rise whitespace-nowrap text-[13px] text-acc">{saveState.message}</span>}
          <Button type="submit" form={formId} size="sm" loading={saving}>
            {TASK_MESSAGES.save}
          </Button>
        </>
      }
    >
      {/* 마디 사이를 좁은 화면 값으로 맞췄다(2026-10-12, 사용자: "창이 좀 더 컴팩트해도 될 듯") — 넓은 화면만 한 단계씩 더 벌어져 있었다 */}
      <div className={cn("flex flex-col gap-3.5 pb-2 pt-1", pending && "opacity-70")}>
        {/* 놓인 칸은 고치기 폼 맨 윗줄에 분류와 함께 선다(edit-form 의 place). 칸 옮기기 자체는 여전히 저장과 따로 간다 */}
        <TaskEditForm
          task={task}
          assignees={assignees}
          place={placeRow}
          formId={formId}
          form={{ state: saveState, action: saveAction, pending: saving }}
        />

        {/* 본문 첨부는 내용과 기록 사이다 — "이 일이 무엇인가" 에 딸린 자료라 내용 바로 밑, 쌓이는 기록보다 위에 선다 */}
        <TaskPart title={task.attachments.length > 0 ? TASK_ATTACHMENT_MESSAGES.count(task.attachments.length) : TASK_ATTACHMENT_MESSAGES.part}>
          <TaskAttachmentsPart taskId={task.id} items={task.attachments} />
        </TaskPart>

        <TaskPart title={task.notes.length > 0 ? TASK_MESSAGES.noteCount(task.notes.length) : TASK_MESSAGES.notes}>
          <TaskNotes taskId={task.id} notes={task.notes} />
        </TaskPart>

        {state && !state.ok && (
          <p role="alert" className="animate-rise text-[13.5px] text-danger">
            {state.error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-3">
          {/* 올린 사람은 고친 때와 한 줄에 선다 — 둘 다 "이 카드의 내력" 이라 고치는 칸들과 떼어 둔다 */}
          <span className="text-[12.5px] text-dim">
            {TASK_MESSAGES.author} {task.author?.name ?? TASK_MESSAGES.authorUnknown} | {TASK_MESSAGES.updatedAt}{" "}
            {formatLongDateTime(task.updatedAt)}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              if (!(await askConfirm(TASK_MESSAGES.removeConfirm, { confirmLabel: CONFIRM_MESSAGES.delete, tone: "danger" }))) return;
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
