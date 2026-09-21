"use client";

// 할 일 추가 폼. 판 위에 접어 두고 필요할 때만 편다 —
// 늘 펴 두면 폼이 판 첫 칸만큼 자리를 먹고, 이 화면에서 제일 자주 하는 일은 적기가 아니라 보기다.
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Card } from "@/components/ui/page";
import { TASK_MESSAGES, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import { TASK_STATUSES } from "@/lib/admin/tasks";
import { createTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

const PRIORITIES = ["high", "normal", "low"] as const;
const SELECT = "w-full rounded-[var(--radius-sm)] border border-line-strong bg-bg px-2.5 py-2 text-[16px] text-ink sm:text-[13px]";
const LABEL = "mb-1.5 block text-[12.5px] font-medium text-mut";

export function TaskAddForm({ sources }: { sources: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TaskActionState, FormData>(createTaskAction, null);

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {TASK_MESSAGES.add}
        </Button>
        {state?.ok && state.message && <span className="text-[12px] text-ok">{state.message}</span>}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <form action={action} className="flex flex-col gap-3">
        <TextField
          name="title"
          label={TASK_MESSAGES.titleLabel}
          placeholder={TASK_MESSAGES.titlePlaceholder}
          required
          autoFocus
          error={state && !state.ok ? state.error : null}
        />

        <div>
          <label htmlFor="task-body" className={LABEL}>
            {TASK_MESSAGES.bodyLabel}
          </label>
          <textarea
            id="task-body"
            name="body"
            rows={3}
            placeholder={TASK_MESSAGES.bodyPlaceholder}
            className={`${SELECT} resize-y leading-[1.6]`}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="task-status" className={LABEL}>
              {TASK_MESSAGES.statusLabel}
            </label>
            <select id="task-status" name="status" defaultValue="todo" className={SELECT}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-priority" className={LABEL}>
              {TASK_MESSAGES.priorityLabel}
            </label>
            <select id="task-priority" name="priority" defaultValue="normal" className={SELECT}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>

          {/* 게임은 ID 로 건다. 검색을 붙이는 건 다음 일이다 — 지금은 검수 화면에서 ID 를 복사해 온다 */}
          <TextField name="gameId" label={TASK_MESSAGES.gameLabel} placeholder="uuid" wrapperClassName="min-w-0" />

          <div>
            <label htmlFor="task-source" className={LABEL}>
              {TASK_MESSAGES.sourceLabel}
            </label>
            <select id="task-source" name="source" defaultValue="" className={SELECT}>
              <option value="">없음</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {TASK_MESSAGES.submit}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            닫기
          </Button>
        </div>
      </form>
    </Card>
  );
}
