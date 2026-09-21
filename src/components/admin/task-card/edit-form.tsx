"use client";

// 카드 고치기. 제목, 메모, 급함만 다룬다 — 칸과 순서는 자기 액션이 따로 있다(자취를 남겨야 해서).
//
// 왜 별도 화면이 아니라 카드 자리에서 고치나: 이 판의 카드는 짧다. 고치려고 다른 화면으로 갔다 오면
// 판 전체의 맥락(옆 칸에 무엇이 있는지)을 놓친다. 제자리에서 고치고 제자리에서 닫는다.
import { useActionState, useEffect } from "react";
import { TASK_MESSAGES, TASK_PRIORITY_LABEL } from "@/lib/admin/messages";
import { TASK_PRIORITIES, type AdminTask } from "@/lib/admin/tasks";
import { updateTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

const FIELD = "w-full rounded-[7px] border border-line bg-surface px-2 py-1.5 text-[16px] leading-[1.5] text-ink placeholder:text-dim sm:text-[12.5px]";

export function TaskEditForm({ task, onDone }: { task: AdminTask; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<TaskActionState, FormData>(updateTaskAction, null);

  // 저장이 끝나면 닫는다. 판은 액션이 revalidate 한 값으로 다시 그려진다
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="id" value={task.id} />

      <label className="sr-only" htmlFor={`title-${task.id}`}>
        {TASK_MESSAGES.titleLabel}
      </label>
      <input id={`title-${task.id}`} name="title" defaultValue={task.title} maxLength={200} className={FIELD} />

      <label className="sr-only" htmlFor={`body-${task.id}`}>
        {TASK_MESSAGES.bodyLabel}
      </label>
      <textarea
        id={`body-${task.id}`}
        name="body"
        rows={3}
        defaultValue={task.body ?? ""}
        placeholder={TASK_MESSAGES.bodyPlaceholder}
        className={`${FIELD} resize-y`}
      />

      <div className="flex items-center gap-1.5">
        <label className="sr-only" htmlFor={`priority-${task.id}`}>
          {TASK_MESSAGES.priorityLabel}
        </label>
        <select
          id={`priority-${task.id}`}
          name="priority"
          defaultValue={task.priority}
          className="rounded-[6px] border border-line bg-surface px-1.5 py-1 text-[11.5px] text-mut"
        >
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {TASK_PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={pending}
          className="press ml-auto rounded-[7px] border border-acc px-2.5 py-1 text-[11.5px] text-acc transition-colors hover:bg-surface-2 disabled:opacity-60"
        >
          {TASK_MESSAGES.save}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="press rounded-[7px] border border-line px-2.5 py-1 text-[11.5px] text-mut transition-colors hover:border-line-strong"
        >
          {TASK_MESSAGES.cancel}
        </button>
      </div>

      {state && !state.ok && <p className="text-[11.5px] text-danger">{state.error}</p>}
    </form>
  );
}
