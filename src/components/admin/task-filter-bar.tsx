"use client";

// 할 일 판 위의 거르기 줄(2026-10-01).
//
// 묶음은 넷이고 성격이 다르다 — 그래서 칩 모양도 다르다.
// - 올린 사람: **켬끔 둘**(내가 올린, 남이 올린). 하나만 고르는 라디오가 아니다 — 사용자 요청이
//   "각각 보이게 가리게" 였다. 그래서 체크 네모(ChipCheck)를 단다. 둘 다 끄면 판이 비는 것도 그대로 둔다
//   (스스로 끈 것이고, 칸마다 "0 / n" 이 무엇이 숨었는지 말한다).
// - 담당: 하나만 고른다(전체, 내 담당, 담당 없음). 내 담당과 담당 없음은 동시에 참일 수 없다.
// - 분류: 여럿을 고른다. 하나도 안 고르면 거르지 않는다.
// - 급함만: 켬끔 하나.
//
// 상태는 판(task-board)이 쥔다. 이 줄은 그리기만 한다 — 거른 결과로 칸 수를 세는 것도 판의 일이라서다.
import { ChipButton, ChipCheck } from "@/components/ui/chip";
import { TASK_CATEGORY_LABEL, TASK_FILTER_MESSAGES } from "@/lib/admin/messages";
import { TASK_CATEGORIES, type TaskCategory } from "@/lib/admin/tasks";
import { DEFAULT_TASK_FILTER, TASK_ASSIGNEE_SCOPES, isDefaultTaskFilter, type TaskFilter } from "@/lib/admin/task-filter";

/** 묶음 하나: 앞에 짧은 이름, 뒤에 칩. 좁은 화면에서는 칩이 다음 줄로 접힌다 */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1">
      <span aria-hidden className="mr-1 text-[11.5px] font-medium text-dim">
        {label}
      </span>
      {children}
    </div>
  );
}

export function TaskFilterBar({ filter, onChange }: { filter: TaskFilter; onChange: (next: TaskFilter) => void }) {
  const set = (patch: Partial<TaskFilter>) => onChange({ ...filter, ...patch });
  const toggleCategory = (c: TaskCategory) =>
    set({ categories: filter.categories.includes(c) ? filter.categories.filter((x) => x !== c) : [...filter.categories, c] });

  return (
    <div
      role="region"
      aria-label={TASK_FILTER_MESSAGES.label}
      className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-surface-2 px-3 py-2"
    >
      <Group label={TASK_FILTER_MESSAGES.author}>
        <ChipButton size="sm" className="tap" active={filter.mine} onClick={() => set({ mine: !filter.mine })}>
          <ChipCheck on={filter.mine} />
          {TASK_FILTER_MESSAGES.mine}
        </ChipButton>
        <ChipButton size="sm" className="tap" active={filter.others} onClick={() => set({ others: !filter.others })}>
          <ChipCheck on={filter.others} />
          {TASK_FILTER_MESSAGES.others}
        </ChipButton>
      </Group>

      <Group label={TASK_FILTER_MESSAGES.assignee}>
        {TASK_ASSIGNEE_SCOPES.map((scope) => (
          <ChipButton key={scope} size="sm" className="tap" active={filter.assignee === scope} onClick={() => set({ assignee: scope })}>
            {TASK_FILTER_MESSAGES.assigneeScope[scope]}
          </ChipButton>
        ))}
      </Group>

      <Group label={TASK_FILTER_MESSAGES.category}>
        {TASK_CATEGORIES.map((c) => (
          <ChipButton key={c} size="sm" className="tap" active={filter.categories.includes(c)} onClick={() => toggleCategory(c)}>
            {TASK_CATEGORY_LABEL[c]}
          </ChipButton>
        ))}
      </Group>

      <ChipButton size="sm" className="tap" active={filter.urgent} onClick={() => set({ urgent: !filter.urgent })}>
        <ChipCheck on={filter.urgent} />
        {TASK_FILTER_MESSAGES.urgent}
      </ChipButton>

      {/* 아무것도 안 걸었으면 풀 것이 없다 — 늘 서 있으면 "뭔가 걸려 있나" 를 매번 확인하게 된다 */}
      {!isDefaultTaskFilter(filter) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_TASK_FILTER)}
          className="press tap ml-auto text-[12px] font-medium text-acc hover:underline"
        >
          {TASK_FILTER_MESSAGES.reset}
        </button>
      )}
    </div>
  );
}
