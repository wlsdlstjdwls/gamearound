"use client";

// 할 일 고치기 — 제목, 메모, 급함, 게임, 담당자를 다룬다. 칸과 순서는 자기 액션이 따로 있다(자취를 남겨야 해서).
//
// 팝업 안에 산다(2026-09-21). 앞서는 카드 자리에서 고쳤는데, 카드 폭이 250px 안팎이라
// 입력칸이 한 줄짜리로 납작해지고 라벨이 전부 sr-only 였다 — 무슨 칸인지 눈으로는 알 수 없었다.
// 칸 모양은 추가 팝업과 같은 것을 쓴다(task-fields) — 같은 값을 두 모양으로 받으면 둘이 어긋난다.
//
// 저장해도 팝업을 닫지 않는다: 여기서 할 일이 고치기 하나가 아니다(기록을 남기러 온 김에 제목도 고친다).
// 대신 저장됐다는 말을 저장 버튼 옆(팝업 머리)에 남긴다 — 닫히지 않으면 눌렀는지 아닌지를 알 수 없다.
import { ActionForm } from "@/components/ui/action-form";
import { TASK_MESSAGES } from "@/lib/admin/messages";
import { assigneeValue, type AdminTask, type TaskAssignee } from "@/lib/admin/tasks";
import { TaskAssigneeField, TaskBasicFields, TaskCategoryField, TaskPart, TaskPriorityField } from "@/components/admin/task-fields";
import { TaskGamePicker } from "@/components/admin/task-game-picker";
import type { TaskActionState } from "@/app/(admin)/admin/tasks/actions";

export function TaskEditForm({
  task,
  assignees,
  place,
  formId,
  form,
}: {
  task: AdminTask;
  assignees: TaskAssignee[];
  /**
   * 놓인 칸 고르기(팝업이 그려 넘긴다). 분류와 한 줄에 서야 해서 폼 안으로 들어온다(2026-10-12).
   * 폼 안에 있어도 저장과 묶이지 않는다 — 칸 단추는 type="button" 이고 제 액션(moveTaskAction)을 탄다
   */
  place: React.ReactNode;
  /** 머리의 저장 버튼이 form 속성으로 가리킬 id */
  formId: string;
  /** useActionState 의 세 값. 팝업이 쥔다 — 저장 버튼(머리)과 폼(본문)이 같은 진행 상태를 봐야 한다 */
  form: { state: TaskActionState; action: (formData: FormData) => void; pending: boolean };
}) {
  const { state, action, pending } = form;

  return (
    <ActionForm id={formId} action={action} state={state} pending={pending} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={task.id} />

      {/*
        맨 윗줄: 놓인 칸 | 분류(2026-10-12, 사용자: "놓인 칸 줄었으니 옆에 분류를 두자"). 둘 다 "이 일이 어디에 무엇으로 서 있나" 다.
        좁은 화면은 두 줄로 쌓는다 — 세그먼트 셋과 셀렉트 하나가 390px 한 줄에 들어가면 낱말이 꺾인다.
        key 를 카드 id 로 두는 이유: 팝업이 다른 카드로 바뀌어도 같은 폼이 재사용되면 앞 카드의 값이 남는다(defaultValue 는 첫 렌더에만 읽힌다).
        접두어는 형제 key 가 겹치지 않게 단다(2026-10-01 `<id>-none` 충돌)
      */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-8">
        {place}
        <TaskCategoryField key={`cat-${task.id}`} inline category={task.category} />
      </div>

      <TaskPart title={TASK_MESSAGES.basics}>
        <TaskBasicFields key={task.id} title={task.title} body={task.body} />

        {/*
          우선순위 | 담당자 | 붙일 게임 한 줄(2026-10-12 같은 요청). 좁은 화면은 우선순위와 담당자가 반씩, 게임이 아랫줄 전체다.
          붙인 게임도 여기서 바꾼다(2026-09-22) — 앞서는 만들 때 한 번 걸면 끝이라 잘못 건 것을 떼려면 할 일을 지우고 다시 만들어야 했다
        */}
        <div className="grid grid-cols-2 items-start gap-x-2 gap-y-2.5 sm:grid-cols-3 sm:gap-x-3">
          <TaskPriorityField key={`pri-${task.id}`} priority={task.priority} />
          <TaskAssigneeField key={`who-${task.id}`} assignees={assignees} assigneeId={assigneeValue(task)} />
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <TaskGamePicker
              // 붙인 게임이 바뀌면 칸을 갈아 끼운다 — 저장한 뒤 그 자리에서 "게임 열기" 가 서야 하고,
              // 그 링크는 서버가 준 slug 로만 만들 수 있다(방금 고른 후보에는 slug 가 없다)
              key={`game-${task.id}-${task.game?.id ?? "none"}`}
              initial={task.game ? { id: task.game.id, title: task.game.title, slug: task.game.slug } : null}
            />
          </div>
        </div>
      </TaskPart>

      {/* 매장과 소스는 읽기만 한다 — 붙는 자리가 화면이 아니다(매장 할 일은 매장 쪽에서, 소스는 만들 때) */}
      {(task.shop || task.source) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[13.5px]">
          {task.shop && <span className="rounded-lg bg-surface-3 px-2 py-1 text-mut">{task.shop.name}</span>}
          {task.source && <span className="rounded-lg bg-surface-3 px-2 py-1 font-mono text-[13px] text-mut">{task.source}</span>}
        </div>
      )}

      {/* 저장 버튼은 팝업 머리에 있다(dialog, 2026-10-12). 실패 사유는 고친 칸들 바로 아래 남긴다 — 머리에는 긴 문장이 들어갈 폭이 없다 */}
      {state && !state.ok && (
        <p role="alert" className="animate-rise text-[13.5px] text-danger">
          {state.error}
        </p>
      )}
    </ActionForm>
  );
}
