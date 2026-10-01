"use client";

// 할 일 판 위의 거르기 줄(2026-10-01).
//
// 한 줄에 셋이다: 보기 칩 넷(하나만 고른다), 분류 드롭다운 하나, 급함만 켬끔.
// 1차는 칩이 열둘이었고 "복잡해서 불편하지 않을까" 라는 말을 들었다 — 줄인 이유는 lib/admin/task-filter 주석에 있다.
// 분류를 칩 다섯 대신 드롭다운으로 둔 이유: 보기 칩과 같은 모양으로 나란히 서면 두 줄이 한 덩어리로 읽힌다.
// 보기는 매번 바꾸는 값, 분류는 가끔 거는 값이라 손에 닿는 무게도 다르게 둔다.
//
// 상태는 판(task-board)이 쥔다. 이 줄은 그리기만 한다 — 거른 결과로 칸 수를 세는 것도 판의 일이라서다.
import { ChipButton, ChipCheck } from "@/components/ui/chip";
import { FormSelect } from "@/components/ui/select";
import { TASK_CATEGORY_LABEL, TASK_FILTER_MESSAGES } from "@/lib/admin/messages";
import { TASK_CATEGORIES, type TaskCategory } from "@/lib/admin/tasks";
import { DEFAULT_TASK_FILTER, TASK_VIEWS, isDefaultTaskFilter, type TaskFilter } from "@/lib/admin/task-filter";

/** 분류 드롭다운의 "거르지 않음" 값. 빈 문자열이라 enum 값과 겹치지 않는다 */
const ANY = "";
const CATEGORY_CHOICES = [
  { value: ANY, label: TASK_FILTER_MESSAGES.categoryAll },
  ...TASK_CATEGORIES.map((c) => ({ value: c, label: TASK_CATEGORY_LABEL[c] })),
];

export function TaskFilterBar({ filter, onChange }: { filter: TaskFilter; onChange: (next: TaskFilter) => void }) {
  const set = (patch: Partial<TaskFilter>) => onChange({ ...filter, ...patch });

  return (
    <div role="region" aria-label={TASK_FILTER_MESSAGES.label} className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div role="group" aria-label={TASK_FILTER_MESSAGES.view} className="flex flex-wrap items-center gap-1">
        {TASK_VIEWS.map((v) => (
          <ChipButton key={v} size="sm" className="tap" active={filter.view === v} onClick={() => set({ view: v })}>
            {TASK_FILTER_MESSAGES.views[v]}
          </ChipButton>
        ))}
      </div>

      {/* 폭을 고정한다 — "데이터 정리" 를 고르면 칸이 늘어 옆 칩이 밀리는 걸 막는다 */}
      <FormSelect
        name="cat"
        label={TASK_FILTER_MESSAGES.category}
        hideLabel
        options={CATEGORY_CHOICES}
        value={filter.category ?? ANY}
        onChange={(v) => set({ category: (v || null) as TaskCategory | null })}
        className="w-[132px]"
      />

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
