"use client";

// 할 일 고치기 — 제목, 메모, 급함만 다룬다. 칸과 순서는 자기 액션이 따로 있다(자취를 남겨야 해서).
//
// 팝업 안에 산다(2026-09-21). 앞서는 카드 자리에서 고쳤는데, 카드 폭이 250px 안팎이라
// 입력칸이 한 줄짜리로 납작해지고 라벨이 전부 sr-only 였다 — 무슨 칸인지 눈으로는 알 수 없었다.
// 칸 모양은 추가 팝업과 같은 것을 쓴다(task-fields) — 같은 값을 두 모양으로 받으면 둘이 어긋난다.
//
// 저장해도 팝업을 닫지 않는다: 여기서 할 일이 고치기 하나가 아니다(기록을 남기러 온 김에 제목도 고친다).
// 대신 저장됐다는 말을 그 자리에 남긴다 — 닫히지 않으면 눌렀는지 아닌지를 알 수 없다.
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TASK_MESSAGES } from "@/lib/admin/messages";
import { type AdminTask } from "@/lib/admin/tasks";
import { TaskBasicFields } from "@/components/admin/task-fields";
import { updateTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

export function TaskEditForm({ task }: { task: AdminTask }) {
  const [state, formAction, pending] = useActionState<TaskActionState, FormData>(updateTaskAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={task.id} />

      {/* key 를 카드 id 로 두는 이유: 팝업이 다른 카드로 바뀌어도 같은 폼이 재사용되면
          앞 카드의 글이 남는다(defaultValue 는 첫 렌더에만 읽힌다) */}
      <TaskBasicFields key={task.id} title={task.title} body={task.body} priority={task.priority} />

      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" loading={pending}>
          {TASK_MESSAGES.save}
        </Button>
        {state?.ok && state.message && <span className="animate-rise text-[12.5px] text-ok">{state.message}</span>}
        {state && !state.ok && (
          <span role="alert" className="animate-rise text-[12.5px] text-danger">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
