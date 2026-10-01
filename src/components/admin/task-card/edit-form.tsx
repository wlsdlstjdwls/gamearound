"use client";

// 할 일 고치기 — 제목, 메모, 급함, 게임, 담당자를 다룬다. 칸과 순서는 자기 액션이 따로 있다(자취를 남겨야 해서).
//
// 팝업 안에 산다(2026-09-21). 앞서는 카드 자리에서 고쳤는데, 카드 폭이 250px 안팎이라
// 입력칸이 한 줄짜리로 납작해지고 라벨이 전부 sr-only 였다 — 무슨 칸인지 눈으로는 알 수 없었다.
// 칸 모양은 추가 팝업과 같은 것을 쓴다(task-fields) — 같은 값을 두 모양으로 받으면 둘이 어긋난다.
//
// 저장해도 팝업을 닫지 않는다: 여기서 할 일이 고치기 하나가 아니다(기록을 남기러 온 김에 제목도 고친다).
// 대신 저장됐다는 말을 그 자리에 남긴다 — 닫히지 않으면 눌렀는지 아닌지를 알 수 없다.
import { useActionState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { TASK_MESSAGES } from "@/lib/admin/messages";
import { type AdminTask, type TaskAssignee } from "@/lib/admin/tasks";
import { TaskAssigneeField, TaskBasicFields } from "@/components/admin/task-fields";
import { TaskGamePicker } from "@/components/admin/task-game-picker";
import { updateTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

export function TaskEditForm({ task, assignees }: { task: AdminTask; assignees: TaskAssignee[] }) {
  const [state, formAction, pending] = useActionState<TaskActionState, FormData>(updateTaskAction, null);

  return (
    <ActionForm action={formAction} state={state} pending={pending} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={task.id} />

      {/* key 를 카드 id 로 두는 이유: 팝업이 다른 카드로 바뀌어도 같은 폼이 재사용되면
          앞 카드의 글이 남는다(defaultValue 는 첫 렌더에만 읽힌다) */}
      <TaskBasicFields key={task.id} title={task.title} body={task.body} priority={task.priority} category={task.category} />

      {/* key 는 기본 칸과 같은 이유다 — 다른 카드로 바뀌면 고른 담당자도 갈아 끼운다.
          접두어는 아래 게임 칸과 가르려고 단다 — 둘 다 비면 `<id>-none` 으로 같아져 형제 key 가 겹쳤다(2026-10-01) */}
      <TaskAssigneeField key={`assignee-${task.id}-${task.assignee?.id ?? "none"}`} assignees={assignees} defaultValue={task.assignee?.id} />

      {/* 붙인 게임도 여기서 바꾼다(2026-09-22) — 앞서는 만들 때 한 번 걸면 끝이라
          잘못 건 것을 떼려면 할 일을 지우고 다시 만들어야 했다.
          key 는 같은 이유로 카드 id 다: 팝업이 다른 카드로 바뀌면 고른 값도 갈아 끼워야 한다 */}
      <TaskGamePicker
        // 붙인 게임이 바뀌면 칸을 갈아 끼운다 — 저장한 뒤 그 자리에서 "게임 열기" 가 서야 하고,
        // 그 링크는 서버가 준 slug 로만 만들 수 있다(방금 고른 후보에는 slug 가 없다)
        key={`game-${task.id}-${task.game?.id ?? "none"}`}
        initial={task.game ? { id: task.game.id, title: task.game.title, slug: task.game.slug } : null}
      />

      {/* 매장과 소스는 읽기만 한다 — 붙는 자리가 화면이 아니다(매장 할 일은 매장 쪽에서, 소스는 만들 때) */}
      {(task.shop || task.source) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
          {task.shop && <span className="rounded-lg bg-surface-3 px-2 py-1 text-mut">{task.shop.name}</span>}
          {task.source && <span className="rounded-lg bg-surface-3 px-2 py-1 font-mono text-[12px] text-mut">{task.source}</span>}
        </div>
      )}

      {/*
        저장 줄은 폼 바닥에 붙는다(2026-10-01, 사용자: "할일 상세에서 수정하고 저장하는 게 없다").
        앞서는 게임 검색 칸 아래에 테두리 버튼으로 있어서, 팝업을 스크롤해 내려가야 보였고 보여도 버튼으로 안 읽혔다.
        sticky 는 제 부모(이 폼) 안에서만 붙는다 — 아래 기록 마디의 붙박이 입력칸과 겹치지 않는다(notes 와 같은 방식).
      */}
      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-line bg-surface px-4 py-3">
        <Button type="submit" variant="primary" loading={pending}>
          {TASK_MESSAGES.save}
        </Button>
        {state?.ok && state.message && <span className="animate-rise text-[12.5px] text-ok">{state.message}</span>}
        {state && !state.ok && (
          <span role="alert" className="animate-rise text-[12.5px] text-danger">
            {state.error}
          </span>
        )}
      </div>
    </ActionForm>
  );
}
