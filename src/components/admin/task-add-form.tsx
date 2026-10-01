"use client";

// 할 일 추가 — 판 위에 접어 두던 폼을 팝업으로 옮겼다(2026-09-21).
//
// 왜 옮겼나: 접힌 폼은 펴는 순간 판 첫 칸만큼 자리를 먹어 카드가 아래로 밀렸고, 좁은 칸에 칸 넷을
// 욱여넣느라 입력칸이 한 줄짜리로 납작해졌다. 적는 일은 보는 일과 다른 일이라 다른 자리에서 한다 —
// 팝업은 뒤 화면을 밀지 않고, 폼은 필요한 만큼 세로를 쓴다.
//
// 성공하면 스스로 닫는다. 닫힌 뒤 판은 액션이 revalidate 한 값으로 다시 그려진다.
import { useActionState, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Button, buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { FormSelect } from "@/components/ui/select";
import { TASK_MESSAGES } from "@/lib/admin/messages";
import type { TaskAssignee } from "@/lib/admin/tasks";
import { TaskBasicFields, TaskMetaFields, TaskStatusField } from "@/components/admin/task-fields";
import { TaskGamePicker } from "@/components/admin/task-game-picker";
import { createTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

export function TaskAddForm({ sources, assignees }: { sources: readonly string[]; assignees: TaskAssignee[] }) {
  const [open, setOpen] = useState(false);
  // 넣고 나면 닫는다 — 성공했을 때만. 실패하면 적은 글이 사라지면 안 된다.
  // 닫는 일을 액션 안에서 하는 이유: 결과를 보고 effect 로 닫으면 렌더가 한 번 더 돈다(react-hooks 규칙).
  // 액션은 이미 전환(transition) 안이라 여기서 상태를 바꾸는 것이 제자리다.
  const [state, action, pending] = useActionState<TaskActionState, FormData>(async (prev, form) => {
    const next = await createTaskAction(prev, form);
    if (next?.ok) setOpen(false);
    return next;
  }, null);

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => setOpen(true)} className={buttonClass({ variant: "primary" })}>
        {TASK_MESSAGES.add}
      </button>
      {state?.ok && state.message && <span className="text-[13px] text-ok">{state.message}</span>}

      {/* size="wide": 이 시트는 입력이 주인공이다. 내용이 정하는 폭은 메모 칸을 한 줄 스무 자로 눌러,
          카드 안에서 쓰던 때와 다를 바가 없어진다(2026-09-22 사용자 지적) */}
      <Sheet title={TASK_MESSAGES.addTitle} size="wide" open={open} onOpenChange={setOpen}>
        <ActionForm action={action} state={state} pending={pending} className="flex flex-col gap-4 pb-1 pt-2">
          <TaskBasicFields />
          <TaskMetaFields assignees={assignees} />
          <TaskStatusField />

          <TaskGamePicker />

          {/* 시트 안은 손가락으로 고르는 자리라 lg 다 — 폼의 다른 칸과 높이를 맞춘다 */}
          <FormSelect
            name="source"
            label={TASK_MESSAGES.sourceLabel}
            size="lg"
            defaultValue=""
            options={[{ value: "", label: "없음" }, ...sources.map((s) => ({ value: s, label: s }))]}
          />

          {state && !state.ok && (
            <p role="alert" className="animate-rise text-[13.5px] text-danger">
              {state.error}
            </p>
          )}

          {/* 버튼은 폼 맨 아래에 붙인다 — 시트는 안이 스크롤되므로 떠 있는 바를 만들면 내용이 그 밑에 숨는다 */}
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="lg" loading={pending} className="flex-1">
              {TASK_MESSAGES.submit}
            </Button>
            <Button type="button" variant="secondary" size="lg" onClick={() => setOpen(false)}>
              {TASK_MESSAGES.cancel}
            </Button>
          </div>
        </ActionForm>
      </Sheet>
    </div>
  );
}
