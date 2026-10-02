"use client";

// 할 일 판. 칸 셋(할 일, 하는 중, 끝)을 가로로 세우고, 카드를 칸 사이로, 칸 안에서 끌어 옮긴다.
// 작업대기 칸은 2026-10-02 화면에서 뺐다(lib/admin/tasks 의 BOARD_STATUSES).
//
// **좁은 화면은 옆으로 넘기는 줄이다**(2026-10-02, 사용자 지정). 칸 셋을 위아래로 쌓으면 완료 칸까지
// 할 일 칸의 카드를 다 지나야 닿았다. 지금은 칸 하나가 화면 폭의 88% 를 먹고 다음 칸 끝이 비쳐
// "옆에 더 있다" 를 말한다. 위의 칸 이름 줄은 지금 보는 칸을 짚고, 누르면 그 칸으로 넘어간다.
// 칸마다 "모아보기" 가 그 칸을 목록 시트로 연다(task-column-sheet).
//
// 드롭은 **칸 전체**가 받는다 — 카드 사이의 가는 틈을 노리게 하면 빗나가는 일이 잦다.
// 칸 안 자리는 포인터 높이로 정하고, 놓일 자리에 보라 줄을 긋는다(use-board-drag).
// 앞서 칸 안 순서를 맡던 위로/아래로 단추는 걷었다(2026-10-02, 사용자: "위로 아래로 지우고 드래그로").
// 끝 칸은 순서가 끝낸 시각이라 자리 줄을 긋지 않는다.
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
// (moveTask 는 놓은 자리를 카드 id 로 받는다) — 숨은 카드는 제 순서를 지킨다.
import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { TASK_FILTER_MESSAGES, TASK_MESSAGES, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import { BOARD_STATUSES, TASK_STATUSES, unreadNoteCount, type AdminTask, type Board, type TaskAssignee, type TaskStatus } from "@/lib/admin/tasks";
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
import { TaskColumnSheet } from "@/components/admin/task-column-sheet";
import { TaskQuickAdd } from "@/components/admin/task-quick-add";
import { DROP_ATTR, useBoardDrag } from "@/components/admin/use-board-drag";
import { markTaskSeenAction, moveTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

export function TaskBoard({
  board,
  assignees,
  meId,
  initialFilter,
  now,
  seen,
}: {
  board: Board;
  assignees: TaskAssignee[];
  /** 지금 보는 관리자. "내가 올린", "내 담당" 을 가르는 기준이다 */
  meId: string;
  /** 주소에서 읽은 첫 조건. 페이지가 읽어 준다 — useSearchParams 를 쓰면 판 전체가 Suspense 경계를 요구한다 */
  initialFilter: TaskFilter;
  /** 카드의 "3일 전" 기준 시각. 페이지가 판을 읽은 시각이다 */
  now: number;
  /** 내가 카드마다 마지막으로 연 때(ms). "새 기록" 셈의 기준이다 */
  seen: Record<string, number>;
}) {
  /**
   * 지금 열린 카드. **판이 들고 있다** — 카드가 들고 있으면 칸을 옮기는 순간 그 카드가 다른 칸에서
   * 새로 그려지면서 팝업이 닫힌다(실측 2026-09-21). 옮기기는 팝업 안에서 하는 일이라 닫히면 안 된다.
   */
  const [openId, setOpenId] = useState<string | null>(null);
  // 이번 화면에서 연 카드. 서버에 적고 판을 다시 읽지 않으므로(markTaskSeenAction) 표시는 여기서 끈다
  const [seenNow, setSeenNow] = useState<Record<string, number>>({});
  const openCard = (id: string) => {
    setOpenId(id);
    setSeenNow((prev) => ({ ...prev, [id]: Date.now() }));
    void markTaskSeenAction(id);
  };
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
    () => countTaskFilters(BOARD_STATUSES.filter((s) => s !== "done").flatMap((s) => board[s]), meId),
    [board, meId],
  );

  const drag = useBoardDrag((id, to, before) => start(async () => setState(await moveTaskAction(id, to, before))));

  const openTask = openId ? BOARD_STATUSES.flatMap((s) => board[s]).find((t) => t.id === openId) : undefined;
  const unreadOf = (task: AdminTask) => unreadNoteCount(task.notes, meId, seenNow[task.id] ?? seen[task.id]);

  // 모아보기 시트가 연 칸. 팝업(openId)과 따로 쥔다 — 줄을 눌러 팝업이 떠도 목록은 밑에 남는다
  const [listStatus, setListStatus] = useState<TaskStatus | null>(null);

  // 좁은 화면의 넘기는 줄. 지금 보이는 칸은 스크롤 위치로 센다 — 칸 폭이 같아서 나눗셈 하나로 끝난다
  const trackRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(0);
  const onTrackScroll = () => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return;
    setVisible(Math.min(BOARD_STATUSES.length - 1, Math.round(track.scrollLeft / (first.offsetWidth || 1))));
  };
  // scrollIntoView 를 쓰지 않는다 — 칸이 화면보다 길면 문서까지 세로로 끌어내린다(2026-10-02 실측). 줄만 옆으로 민다
  const goColumn = (i: number) => {
    const track = trackRef.current;
    const col = track?.children[i] as HTMLElement | undefined;
    if (track && col) track.scrollTo({ left: col.offsetLeft - track.offsetLeft - track.clientLeft, behavior: "smooth" });
  };

  return (
    <section className="flex flex-col gap-3">
      {/* 판 위에 제목도 버튼도 세우지 않는다 — 끝난 일 치우기는 "할 일 추가" 줄로 갔다(TaskClearDone) */}
      <TaskFilterBar filter={filter} counts={counts} onChange={changeFilter} />
      {state && !state.ok && <p className="text-[13px] text-danger">{state.error}</p>}

      {/* 좁은 화면 전용 칸 이름 줄 — 넓은 화면에서는 칸 셋이 다 보여 짚을 일이 없다 */}
      <div role="group" aria-label={TASK_MESSAGES.columnTabs} className="grid grid-cols-3 gap-0.5 rounded-xl bg-surface-2 p-1 sm:hidden">
        {BOARD_STATUSES.map((status, i) => (
          <button
            key={status}
            type="button"
            aria-pressed={visible === i}
            onClick={() => goColumn(i)}
            className={cn(
              "press tap flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] transition-colors duration-base",
              visible === i ? "bg-surface font-semibold text-ink shadow-1" : "text-mut",
            )}
          >
            <span aria-hidden className={cn("h-2 w-2 rounded-full", STATUS_FILL[status])} />
            {TASK_STATUS_LABEL[status]}
            <span className="text-[12px] tabular-nums text-dim">{shown[status].length}</span>
          </button>
        ))}
      </div>

      {/* 칸 셋. 중간 폭에서는 둘씩 접는다 — 셋을 억지로 세우면 카드 폭이 글자보다 좁아진다.
          좁은 화면에도 grid-cols-1 을 **적어야 한다**(2026-10-02 실측): 틀을 안 적으면 암묵 칸이 auto 라
          카드 제목(truncate 는 한 줄로 편 글자 폭을 최소 폭으로 낸다)만큼 늘어나, 390px 화면에서 칸이 438px 이
          되고 문서가 가로로 밀렸다. grid-cols-1 은 minmax(0, 1fr) 라 칸이 화면 폭을 넘지 않는다 */}
      {/* 좁은 화면: 옆으로 넘기는 줄(snap). 칸이 88% 라 다음 칸 끝이 비친다. 넓은 화면: 격자.
          items-start 는 좁은 화면에만 — 늘이면 빈 칸이 가장 긴 칸만큼 키를 먹어 회색 골이 화면 아래까지 이어졌다 */}
      <div
        ref={trackRef}
        onScroll={onTrackScroll}
        className="-mx-1 flex items-start snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:items-stretch sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
      >
        {BOARD_STATUSES.map((status) => {
          const over = drag.over === status;
          // 끌고 있으면 받을 수 있는 자리다. 원래 칸도 받는다(자리 바꾸기) — 끝 칸만은 제 칸에서 자리가 없다
          const droppable = drag.from !== null && !(drag.from === status && status === "done");
          // 놓일 자리 줄. 이 칸 위에 있고 자리를 받는 칸일 때만 긋는다
          const marking = over && droppable && status !== "done";
          return (
            <div
              key={status}
              {...{ [DROP_ATTR]: status }}
              className={cn(
                // 칸은 흰 본문 판 위의 회색 골이고 카드는 그 위에 다시 뜬 흰 판이다(2026-09-30) —
                // 앞서는 칸, 카드, 바탕이 다 회색 계열이라 셋이 한 면으로 붙어 보였다
                "flex min-h-[140px] w-[88%] min-w-0 shrink-0 snap-start flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors duration-base sm:w-auto",
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
                  <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", STATUS_FILL[status])} />
                  {TASK_STATUS_LABEL[status]}
                </span>
                {/* 모아보기 — 글자 단추. 칸 머리의 무게를 건수보다 앞세우지 않는다 */}
                <button
                  type="button"
                  onClick={() => setListStatus(status)}
                  className="press tap ml-auto mr-2 rounded-md px-1.5 text-[12.5px] font-medium text-acc hover:underline"
                >
                  {TASK_MESSAGES.columnCollect}
                </button>
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
                    <Fragment key={task.id}>
                      {marking && drag.before === task.id && <DropMarker />}
                        <TaskCard
                      task={task}
                      now={now}
                      meId={meId}
                      status={status}
                      unread={unreadOf(task)}
                      onOpen={openCard}
                      onPointerDown={drag.onPointerDown}
                      onClickCapture={drag.swallowClick}
                      />
                    </Fragment>
                  ))}
                  {marking && drag.before === null && <DropMarker />}
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

      {listStatus && (
        <TaskColumnSheet
          status={listStatus}
          tasks={shown[listStatus]}
          now={now}
          meId={meId}
          unreadOf={unreadOf}
          category={filter.category ?? undefined}
          open
          onOpenChange={(v) => !v && setListStatus(null)}
          onOpenTask={openCard}
        />
      )}

      {/* 열린 카드는 판이 다시 그려져도 같은 카드를 가리킨다 — 지워졌으면 팝업도 사라진다 */}
      {openTask && <TaskDialog task={openTask} assignees={assignees} open onOpenChange={(v) => !v && setOpenId(null)} />}
    </section>
  );
}

/**
 * 놓일 자리 줄. 높이 0 에 위아래 음수 여백으로 칸의 gap 을 되갚는다 — 줄이 들어서며 카드를 밀면
 * 카드 가운데 선이 움직여 자리가 다시 바뀌고, 줄이 위아래로 떨린다.
 */
function DropMarker() {
  return (
    <li aria-hidden className="relative -my-1 h-0">
      <span className="absolute inset-x-1 -top-px h-0.5 rounded-full bg-acc" />
    </li>
  );
}
