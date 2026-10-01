"use client";

// 할 일 판. 칸 넷을 가로로 세우고, 카드를 칸 사이로 옮긴다.
//
// 드롭은 **칸 전체**가 받는다 — 카드 사이의 가는 틈을 노리게 하면 빗나가는 일이 잦고,
// 이 판은 칸 안 순서를 끌어서 바꾸지 않으므로 정확한 지점이 필요 없다.
// 칸 안 순서는 카드의 위로/아래로 버튼이 맡는다(키보드로도 되어야 하므로).
//
// **끌리는 동안 판이 달라 보여야 한다**(2026-09-21): 앞 판은 끌어도 화면이 그대로여서 "지금 뭔가를
// 끌고 있다" 는 사실을 사람이 스스로 기억해야 했다. 지금은 끄는 동안 모든 칸이 받을 자리로 살아나고
// (테두리가 진해진다), 마우스가 올라간 칸만 브랜드 보라로 채워진다. 끌던 카드가 원래 있던 칸은
// 살리지 않는다 — 제자리에 놓는 건 아무것도 하지 않는 일이라 받을 자리처럼 보이면 안 된다.
//
// 끄는 일 자체는 use-board-drag 가 한다(2026-09-22). 네이티브 드래그앤드롭을 버린 이유는 그 파일에 있다.
//
// **거르기**(2026-10-01): 판이 받은 카드를 화면에서 거른다(lib/admin/task-filter 주석에 이유). 조건은 판이 쥐고
// 바뀔 때마다 주소에 적는다. router 로 바꾸지 않고 history.replaceState 를 쓴다 — router 는 서버 컴포넌트를
// 다시 그리러 가서 칩 한 번에 왕복 하나가 붙는다. 거른 판에서 끌어 옮겨도 서버는 칸 전체로 순서를 매긴다
// (moveTask 는 받는 칸의 최솟값만 본다) — 숨은 카드의 순서는 그대로다.
import { useEffect, useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { TASK_FILTER_MESSAGES, TASK_MESSAGES, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import { TASK_STATUSES, type Board, type TaskAssignee } from "@/lib/admin/tasks";
import {
  TASK_FILTER_COOKIE,
  TASK_FILTER_COOKIE_MAX_AGE,
  countTaskFilters,
  isDefaultTaskFilter,
  matchesTaskFilter,
  serializeTaskFilter,
  type TaskFilter,
} from "@/lib/admin/task-filter";
import { STATUS_FILL } from "@/components/admin/task-tone";
import { TaskFilterBar } from "@/components/admin/task-filter-bar";
import { TaskCard } from "@/components/admin/task-card";
import { TaskDialog } from "@/components/admin/task-card/dialog";
import { TaskQuickAdd } from "@/components/admin/task-quick-add";
import { DROP_ATTR, useBoardDrag } from "@/components/admin/use-board-drag";
import { moveTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

export function TaskBoard({
  board,
  assignees,
  meId,
  initialFilter,
  now,
}: {
  board: Board;
  assignees: TaskAssignee[];
  /** 지금 보는 관리자. "내가 올린", "내 담당" 을 가르는 기준이다 */
  meId: string;
  /** 주소에서 읽은 첫 조건. 페이지가 읽어 준다 — useSearchParams 를 쓰면 판 전체가 Suspense 경계를 요구한다 */
  initialFilter: TaskFilter;
  /** 카드의 "3일 전" 기준 시각. 페이지가 판을 읽은 시각이다 */
  now: number;
}) {
  /**
   * 지금 열린 카드. **판이 들고 있다** — 카드가 들고 있으면 칸을 옮기는 순간 그 카드가 다른 칸에서
   * 새로 그려지면서 팝업이 닫힌다(실측 2026-09-21). 옮기기는 팝업 안에서 하는 일이라 닫히면 안 된다.
   */
  const [openId, setOpenId] = useState<string | null>(null);
  const [, start] = useTransition();
  const [state, setState] = useState<TaskActionState>(null);

  const [filter, setFilter] = useState(initialFilter);
  const changeFilter = (next: TaskFilter) => {
    setFilter(next);
    const q = serializeTaskFilter(next).toString();
    window.history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
    // 다음에 맨 주소로 들어와도 이 조건이 서게 남긴다. 기본값으로 풀면 쿠키도 지운다(max-age=0)
    document.cookie = `${TASK_FILTER_COOKIE}=${encodeURIComponent(q)}; path=${window.location.pathname}; max-age=${q ? TASK_FILTER_COOKIE_MAX_AGE : 0}; samesite=lax`;
  };
  // 쿠키로 되살린 조건이면 주소에도 올린다 — 주소창과 판이 다른 조건을 말하면 그 주소를 남에게 줄 때 어긋난다.
  // 상태는 건드리지 않는다(이미 같은 값이다). 첫 그림에서 한 번만 본다
  useEffect(() => {
    const q = serializeTaskFilter(initialFilter).toString();
    if (q && !window.location.search) window.history.replaceState(null, "", `?${q}`);
  }, [initialFilter]);
  const filtered = !isDefaultTaskFilter(filter);
  const shown = useMemo(
    () => Object.fromEntries(TASK_STATUSES.map((s) => [s, board[s].filter((t) => matchesTaskFilter(t, filter, meId))])) as Board,
    [board, filter, meId],
  );
  // 거르기 칩 옆 건수. 끝난 칸은 세지 않는다 — "내 담당 5" 가 끝낸 일까지 세면 남은 몫을 못 읽는다
  const counts = useMemo(
    () => countTaskFilters(TASK_STATUSES.filter((s) => s !== "done").flatMap((s) => board[s]), meId),
    [board, meId],
  );

  const drag = useBoardDrag((id, to) => start(async () => setState(await moveTaskAction(id, to))));

  const openTask = openId ? TASK_STATUSES.flatMap((s) => board[s]).find((t) => t.id === openId) : undefined;

  return (
    <section className="flex flex-col gap-3">
      {/* 판 위에 제목도 버튼도 세우지 않는다 — 끝난 일 치우기는 "할 일 추가" 줄로 갔다(TaskClearDone) */}
      <TaskFilterBar filter={filter} counts={counts} onChange={changeFilter} />
      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}

      {/* 칸이 넷이라 좁은 화면에서는 둘씩 접는다 — 넷을 억지로 세우면 카드 폭이 글자보다 좁아진다 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map((status) => {
          const over = drag.over === status;
          // 끌고 있고, 여기가 그 카드가 있던 칸이 아니면 "받을 수 있는 자리"
          const droppable = drag.from !== null && drag.from !== status;
          return (
            <div
              key={status}
              {...{ [DROP_ATTR]: status }}
              className={cn(
                // 칸은 흰 본문 판 위의 회색 골이고 카드는 그 위에 다시 뜬 흰 판이다(2026-09-30) —
                // 앞서는 칸, 카드, 바탕이 다 회색 계열이라 셋이 한 면으로 붙어 보였다
                "flex min-h-[140px] flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors duration-base",
                over && droppable
                  ? "border-acc bg-acc-soft"
                  : droppable
                    ? "border-line-strong bg-surface-3"
                    : "border-transparent bg-surface-2",
              )}
            >
              <h3 className="flex items-center justify-between px-1 py-0.5 text-[13.5px] font-bold text-mut">
                {/* 칸마다 색 점(2026-10-01) — 넷이 같은 회색 골이라 상태가 글자로만 갈렸다. 색은 메뉴 배지와 같은 짝이다 */}
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className={cn("h-2 w-2 rounded-full", STATUS_FILL[status])} />
                  {TASK_STATUS_LABEL[status]}
                </span>
                {/* 걸러졌으면 "보이는 수 / 전체" — 숨은 카드가 있다는 걸 칸이 스스로 말한다 */}
                <span
                  className="rounded-full bg-surface px-1.5 text-[12px] font-semibold tabular-nums text-mut"
                  aria-label={filtered ? TASK_FILTER_MESSAGES.columnCountLabel(shown[status].length, board[status].length) : undefined}
                >
                  {filtered ? TASK_FILTER_MESSAGES.columnCount(shown[status].length, board[status].length) : board[status].length}
                </span>
              </h3>

              {shown[status].length > 0 && (
                <ul className="flex flex-col gap-2">
                  {shown[status].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      now={now}
                      meId={meId}
                      status={status}
                      onOpen={setOpenId}
                      onPointerDown={drag.onPointerDown}
                      onClickCapture={drag.swallowClick}
                    />
                  ))}
                </ul>
              )}

              {/* 빈 칸에도 적는 자리는 남는다 — 빈 칸일수록 첫 줄을 적기 쉬워야 한다.
                  끌고 있는 동안에는 치우고 "여기에 놓아요" 가 대신 선다(지금 할 일은 적기가 아니다) */}
              {drag.from !== null ? (
                <p className="px-1 py-3 text-[12.5px] text-dim">{droppable ? TASK_MESSAGES.dropHere : TASK_MESSAGES.empty}</p>
              ) : (
                <TaskQuickAdd status={status} category={filter.category ?? undefined} />
              )}
            </div>
          );
        })}
      </div>

      {/* 열린 카드는 판이 다시 그려져도 같은 카드를 가리킨다 — 지워졌으면 팝업도 사라진다 */}
      {openTask && <TaskDialog task={openTask} assignees={assignees} open onOpenChange={(v) => !v && setOpenId(null)} />}
    </section>
  );
}
