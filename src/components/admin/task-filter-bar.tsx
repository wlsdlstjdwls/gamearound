"use client";

// 할 일 판 위의 거르기 줄(2026-10-01).
//
// 한 줄에 셋이다: 보기(하나만 고른다), 분류 드롭다운, 급함만.
// 1차는 칩이 열둘이었고 "복잡해서 불편하지 않을까" 라는 말을 들었다 — 줄인 이유는 lib/admin/task-filter 주석에 있다.
//
// **보기를 세그먼트로 묶었다**(같은 날 3차, 사용자: "필터 기능도 가시성 있게"). 앞 판은 안 고른 칩이 회색 글자뿐이라
// 그게 눌리는 것인지, 넷이 한 묶음인지가 안 보였다. 지금은 한 덩어리 판 위에서 고른 칸만 떠오르고,
// 칸마다 **건수**가 붙는다 — 판을 열자마자 "내 담당 3" 이 읽혀야 거르기를 누를 이유가 생긴다.
// 건수는 끝난 칸을 뺀 남은 일 기준이다(task-board).
//
// 상태는 판(task-board)이 쥔다. 이 줄은 그리기만 한다.
import { cn } from "@/lib/cn";
import { FormSelect } from "@/components/ui/select";
import { TASK_CATEGORY_LABEL, TASK_FILTER_MESSAGES } from "@/lib/admin/messages";
import { TASK_CATEGORIES, type TaskCategory } from "@/lib/admin/tasks";
import { DEFAULT_TASK_FILTER, TASK_VIEWS, isDefaultTaskFilter, type TaskFilter, type TaskFilterCounts } from "@/lib/admin/task-filter";
import { URGENT_FILL } from "@/components/admin/task-tone";

/** 분류 드롭다운의 "거르지 않음" 값. 빈 문자열이라 enum 값과 겹치지 않는다 */
const ANY = "";

/** 건수 알. 고른 칸(보라 면) 위에서는 흰 글자로 뒤집힌다 — 숫자가 칸 이름보다 먼저 읽히면 안 되므로 작게 둔다 */
function Count({ n, on }: { n: number; on: boolean }) {
  return (
    <span
      className={cn(
        "min-w-[18px] rounded-full px-1.5 text-center text-[11.5px] font-semibold tabular-nums leading-[18px]",
        on ? "bg-on-ink/20 text-on-ink" : "bg-surface-3 text-dim",
      )}
    >
      {n}
    </span>
  );
}

export function TaskFilterBar({
  filter,
  counts,
  onChange,
}: {
  filter: TaskFilter;
  counts: TaskFilterCounts;
  onChange: (next: TaskFilter) => void;
}) {
  const set = (patch: Partial<TaskFilter>) => onChange({ ...filter, ...patch });
  const categoryChoices = [
    { value: ANY, label: TASK_FILTER_MESSAGES.categoryAll },
    ...TASK_CATEGORIES.map((c) => ({ value: c, label: TASK_FILTER_MESSAGES.categoryOption(TASK_CATEGORY_LABEL[c], counts.categories[c]) })),
  ];

  return (
    <div role="region" aria-label={TASK_FILTER_MESSAGES.label} className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* 세그먼트 — 한 판 위에 넷이 서고 고른 칸만 흰 면으로 떠오른다.
          좁은 화면에서는 세 칸 격자로 한 줄에 선다 — 줄바꿈에 맡기면 칸이 따로 떨어져 다른 묶음처럼 보였다(390px 실측) */}
      <div
        role="group"
        aria-label={TASK_FILTER_MESSAGES.view}
        className="grid w-full grid-cols-3 gap-0.5 rounded-xl bg-surface-2 p-1 sm:flex sm:w-auto"
      >
        {TASK_VIEWS.map((v) => {
          const on = filter.view === v;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              onClick={() => set({ view: v })}
              className={cn(
                "press tap flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 sm:px-3 text-[13.5px] transition-colors duration-base",
                // 고른 칸은 보라로 채운다 — 흰 면만 띄우면 회색 판 위에서 대비가 약했다(팝업 세그먼트와 같은 모양)
                on ? "bg-acc font-semibold text-on-ink shadow-1" : "text-mut hover:text-ink",
              )}
            >
              {TASK_FILTER_MESSAGES.views[v]}
              <Count n={counts.views[v]} on={on} />
            </button>
          );
        })}
      </div>

      {/* 분류가 걸려 있으면 칸 테두리를 브랜드 색으로 둘러 "지금 걸려 있다" 를 보인다 — 드롭다운은 닫혀 있으면 값이 글자뿐이다 */}
      <FormSelect
        name="cat"
        label={TASK_FILTER_MESSAGES.category}
        hideLabel
        options={categoryChoices}
        value={filter.category ?? ANY}
        onChange={(v) => set({ category: (v || null) as TaskCategory | null })}
        className={cn("w-[150px] rounded-[var(--radius-sm)]", filter.category && "ring-2 ring-acc")}
      />

      {/* 급함만. 급한 일이 하나라도 있으면 빨간 점이 늘 서 있다 — 거르기 전에 "급한 게 있다" 가 보여야 한다 */}
      <button
        type="button"
        aria-pressed={filter.urgent}
        onClick={() => set({ urgent: !filter.urgent })}
        className={cn(
          "press tap flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13.5px] transition-colors duration-base",
          filter.urgent ? "bg-danger-soft font-semibold text-danger" : "bg-surface-2 text-mut hover:text-ink",
        )}
      >
        {counts.urgent > 0 && <span aria-hidden className={cn("h-2 w-2 rounded-full", URGENT_FILL)} />}
        {TASK_FILTER_MESSAGES.urgent}
        <span className="text-[12px] font-semibold tabular-nums">{counts.urgent}</span>
      </button>

      {/* 아무것도 안 걸었으면 풀 것이 없다 — 늘 서 있으면 "뭔가 걸려 있나" 를 매번 확인하게 된다 */}
      {!isDefaultTaskFilter(filter) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_TASK_FILTER)}
          className="press tap ml-auto text-[13px] font-medium text-acc hover:underline"
        >
          {TASK_FILTER_MESSAGES.reset}
        </button>
      )}
    </div>
  );
}
