"use client";

// 할 일 카드 한 장 — **보는 자리**다. 적고 고치는 일은 팝업이 맡는다(dialog.tsx).
//
// 왜 갈랐나(2026-09-21): 앞 카드는 250px 폭 안에 선택 상자 하나와 버튼 여섯 개를 11px 글자로
// 두 줄에 깔고 있었다. 그 자리에서 제목을 고치고 기록까지 적으라고 하니 "너무 불편하다" 는 말을 들었다.
// 지금 카드에 남은 건 읽을 것(제목, 급함, 메모 첫 줄, 붙인 대상, 기록 수)과 **순서 바꾸기 둘**뿐이다.
// 순서만 카드에 남긴 이유: 순서는 옆 카드와 견줘서 정하는 값이라 판을 보면서 눌러야 한다.
//
// **드래그만 두지 않는 이유**(AGENTS §6 a11y): 드래그는 포인터 기기에만 있는 길이다.
// 칸 옮기기는 팝업 안의 칸 단추가 맡고(키보드로 된다), 드래그는 그 위에 얹어 주는 지름길이다.
//
// **손잡이**(2026-09-22): 손가락으로도 끌 수 있게 카드 아래에 잡는 자리를 하나 냈다.
// 카드 전체를 손가락 끌기의 시작점으로 삼을 수는 없다 — 그러려면 카드에 touch-action: none 을
// 걸어야 하고, 그러면 카드 위에서 칸을 훑어 내리지 못한다. 손잡이에서 시작하면 끌기,
// 카드 어디서든 시작하면 스크롤이다(use-board-drag 주석).
//
// **끌리는 느낌**: 커서는 평소 grab, 누르는 순간과 끄는 동안 grabbing 이다(globals.css 의 .grabbable).
// 끄는 일은 판이 쥔 훅(use-board-drag)이 한다 — 네이티브 드래그앤드롭을 쓰면 시작하는 순간
// 커서가 브라우저 것이 되어 우리가 정한 모양이 통째로 풀린다(2026-09-22 사용자 지적).
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { raisedClass } from "@/components/ui/page";
import { formatAgo } from "@/lib/format";
import { TASK_ATTACHMENT_MESSAGES, TASK_CATEGORY_LABEL, TASK_MESSAGES, TASK_PRIORITY_LABEL } from "@/lib/admin/messages";
import { staleDays, type AdminTask, type TaskStatus } from "@/lib/admin/tasks";
import { CATEGORY_BADGE, PRIORITY_BADGE, cardStripe } from "@/components/admin/task-tone";
import { HANDLE_ATTR } from "@/components/admin/use-board-drag";
import { reorderTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

/**
 * 순서 단추. hover 전에는 흐리게 둔다 — 카드에서 먼저 읽혀야 하는 건 제목이다.
 *
 * 손가락 기기에서는 처음부터 보인다(2026-09-22): hover 가 없는 화면에서 이 단추는 **영영 안 떴고**,
 * 끌기까지 마우스 전용이라(use-board-drag) 휴대폰에서는 순서를 바꿀 길이 아예 없었다.
 * `tap` 으로 높이도 44px 로 벌린다 — 11px 글자 한 줄은 손가락 목표가 못 된다.
 *
 * 평소에는 폭이 0 이다(2026-10-01): 투명한 단추도 폭을 먹어서, 같은 줄의 담당자 이름과
 * "23시간 전 | 기록 2" 가 좁은 카드에서 두 줄로 꺾였다. 그렇다고 display 로 껐다 켜면 hover 때 줄이 툭 튀었다
 * (사용자: "딱딱하게 움직인다"). 그래서 감싼 칸(ORDER_SLOT)의 최대 폭과 투명도를 함께 풀어 미끄러지듯 연다.
 */
/** 순서 단추 둘을 감싼 칸. 열린 폭(max-w-24)은 "위로", "아래로" 두 단추가 들어가는 만큼이다 */
const ORDER_SLOT =
  "flex max-w-0 items-center overflow-hidden opacity-0 transition-[max-width,opacity] duration-base ease-standard group-focus-within:max-w-24 group-focus-within:opacity-100 group-hover:max-w-24 group-hover:opacity-100 [@media(hover:none)]:max-w-24 [@media(hover:none)]:opacity-100";

const ORDER_BTN =
  "press tap inline-flex shrink-0 items-center rounded-[6px] px-1.5 py-0.5 text-[12px] text-dim hover:text-ink disabled:opacity-40";

export function TaskCard({
  task,
  now,
  unread,
  meId,
  status,
  onOpen,
  onPointerDown,
  onClickCapture,
}: {
  task: AdminTask;
  /** "3일 전" 의 기준 시각. 서버가 정해 내려 준다 — 카드에서 Date.now() 를 부르면 서버와 브라우저 값이 갈려 하이드레이션이 어긋난다 */
  now: number;
  /** 내가 이 카드를 연 뒤 남이 단 기록 수(lib/admin/tasks 의 unreadNoteCount). 0 이면 표시가 없다 */
  unread: number;
  /** 지금 보는 관리자. 내 담당 카드는 아바타를 채워 칠한다 — 판에서 "내 일" 이 먼저 보이게 */
  meId: string;
  /** 이 카드가 놓인 칸. 끌기를 시작할 때 "어디서 떠났는가" 가 필요하다 */
  status: TaskStatus;
  /**
   * 카드를 연다. 팝업 자체는 **판이 들고 있다**(task-board) — 카드가 들고 있으면 칸을 옮기는 순간
   * 카드가 다른 칸에서 새로 그려지면서 열려 있던 팝업이 닫힌다(실측). 옮기는 일은 팝업 안에서 하는 일이다.
   */
  onOpen: (id: string) => void;
  /** 끌기의 시작. 판이 쥔 훅이 받는다 */
  onPointerDown?: (e: React.PointerEvent<HTMLElement>, id: string, status: TaskStatus) => void;
  /** 끌어다 놓은 뒤 따라오는 click 을 삼킨다 — 없으면 놓자마자 팝업이 열린다 */
  onClickCapture?: (e: React.MouseEvent) => void;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<TaskActionState>(null);

  const run = (fn: () => Promise<TaskActionState>) => start(async () => setState(await fn()));
  // 사람이 적은 글 중 가장 최근 것. 칸 이동 자취는 "어디까지 왔나" 를 말해 주지 않아 뺀다(기록은 오래된 것이 앞이다)
  const latestNote = task.notes.findLast((n) => n.kind === "note" && n.body);
  // 첨부 수는 본문 것과 기록 것을 합친다 — 카드에서 궁금한 건 "자료가 붙어 있나" 지 어디 붙었나가 아니다
  const fileCount = task.attachments.length + task.notes.reduce((n, note) => n + note.attachments.length, 0);
  const stale = staleDays(task, now);
  const stripe = cardStripe(task);
  const mine = task.assignee?.id === meId;

  return (
    <li
      onPointerDown={(e) => onPointerDown?.(e, task.id, status)}
      onClickCapture={onClickCapture}
      className={raisedClass(
        cn(
          "grabbable group relative flex flex-col overflow-hidden transition-[opacity] duration-base",
          // 끝난 일은 흐리게 — 판의 무게는 아직 남은 일에 있어야 한다. 손을 대면 다시 또렷해진다
          status === "done" && "opacity-60 hover:opacity-100 focus-within:opacity-100",
          pending && "opacity-60",
        ),
      )}
    >
      {/* 왼쪽 띠(2026-10-01). 급함 높음은 빨강, 아니면 분류 색이다(task-tone). 배지를 읽기 전에 색으로 먼저 갈린다 */}
      {stripe && <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", stripe)} />}
      {/* 카드 전체가 여는 자리다. 안에 링크를 넣지 않는 이유는 버튼 안의 링크가 못 눌리기 때문이다 —
          붙인 대상으로 가는 길은 팝업 안에 있다 */}
      {/* 카드를 키웠다(2026-10-02, 사용자: "카드가 너무 작다") — 제목 15px, 글자 한 단계, 여백 한 단계. 맥락은 한 줄 그대로다(아래 주석의 10-01 지적). 폭은 칸이 정하니 안쪽을 늘렸다 */}
      <button type="button" onClick={() => onOpen(task.id)} className="flex w-full flex-col gap-2.5 p-3.5 text-left">
        {/* 새 기록(2026-10-02, 사용자: "기록 새로 달리면 카드에도 표시"). 판에서 제일 먼저 봐야 할 표시라 맨 위 채운 빨강이다.
            열면 꺼진다 — 기준은 내가 이 카드를 마지막으로 연 때다(admin_task_reads) */}
        {unread > 0 && (
          <span className="w-fit rounded-full bg-danger px-2 py-0.5 text-[12px] font-bold text-on-ink">{TASK_MESSAGES.cardUnread(unread)}</span>
        )}
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-[15px] font-semibold leading-[1.45] text-ink">{task.title}</p>
          {task.category !== "task" && (
            <span className={cn("shrink-0 rounded-[6px] px-1.5 py-0.5 text-[12px] font-semibold", CATEGORY_BADGE[task.category])}>
              {TASK_CATEGORY_LABEL[task.category]}
            </span>
          )}
          {task.priority !== "normal" && (
            <span className={cn("shrink-0 rounded-[6px] px-1.5 py-0.5 text-[12px] font-semibold", PRIORITY_BADGE[task.priority])}>
              {TASK_PRIORITY_LABEL[task.priority]}
            </span>
          )}
        </div>

        {/*
          메모와 최근 기록을 **둘 다** 보인다(2026-10-02, 사용자: "내용도 더 보이면 좋겠다").
          10-01 에는 "메모 두 줄이 카드 절반을 먹는다" 해서 둘 중 하나를 한 줄로 줄였는데, 그러자 카드만 보고는 무슨 일인지
          알 수 없어 매번 팝업을 열어야 했다. 지금은 메모 세 줄, 최근 기록 두 줄까지 — 기록은 옅은 면에 넣어 메모와 갈라 읽힌다.
          더 긴 글은 팝업에 있다.
        */}
        {task.body && <p className="line-clamp-3 whitespace-pre-line text-[13.5px] leading-[1.55] text-mut">{task.body}</p>}
        {latestNote && (
          <div className="rounded-lg bg-surface-2 px-2.5 py-2">
            <p className="text-[12px] font-semibold text-dim">
              {TASK_MESSAGES.cardLatestNote}
              {latestNote.authorName && ` | ${latestNote.authorName}`}
            </p>
            <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-[13px] leading-[1.5] text-ink">{latestNote.body}</p>
          </div>
        )}

        {/* 붙임표 줄은 붙은 것이 있을 때만 선다 — 빈 줄이 카드마다 높이를 먹었다 */}
        {(stale !== null || task.game || task.shop || task.source) && (
          <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
            {stale !== null && <span className="rounded-[6px] bg-warn-soft px-1.5 py-0.5 font-semibold text-warn">{TASK_MESSAGES.cardStale(stale)}</span>}
            {task.game && <span className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 text-acc">{task.game.title}</span>}
            {task.shop && <span className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 text-mut">{task.shop.name}</span>}
            {task.source && <span className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 font-mono text-mut">{task.source}</span>}
          </div>
        )}
      </button>

      {/* data-no-drag: 이 버튼에서 시작한 누름은 끌기가 아니라 그 버튼의 일이다 */}
      <div className="flex items-center gap-1 px-2.5 pb-2">
        {/*
          담당자 이름(2026-10-01). 첫 글자 동그라미로 줄였다가 사용자가 "그냥 이름 나오게" 해서 되돌렸다 — 둘뿐이라도 글자 하나로는 누군지 다시 읽어야 했다.
          내 담당은 채워 칠하고 남의 담당은 옅게. 담당이 없으면 흐린 글자만 둔다(테두리 칩은 카드마다 반복돼 소음이었다).
          올린 사람은 카드에 없다 — 사용자: "올린 사람보단 담당자".
          맨 아래 줄에 두는 이유: 따로 줄을 세우면 카드마다 한 줄씩 길어진다.
        */}
        {task.assignee ? (
          <span
            className={cn(
              "ml-1 min-w-0 max-w-[50%] truncate whitespace-nowrap rounded-[6px] px-1.5 py-0.5 text-[12px] font-semibold",
              mine ? "bg-acc text-on-ink" : "bg-acc-soft text-acc",
            )}
          >
            {task.assignee.name}
          </span>
        ) : (
          <span className="ml-1 whitespace-nowrap text-[12px] text-dim">{TASK_MESSAGES.cardNoAssignee}</span>
        )}
        <span className={ORDER_SLOT}>
          <button
            type="button"
            data-no-drag="true"
            className={ORDER_BTN}
            disabled={pending}
            onClick={() => run(() => reorderTaskAction(task.id, "up"))}
          >
            {TASK_MESSAGES.up}
          </button>
          <button
            type="button"
            data-no-drag="true"
            className={ORDER_BTN}
            disabled={pending}
            onClick={() => run(() => reorderTaskAction(task.id, "down"))}
          >
            {TASK_MESSAGES.down}
          </button>
        </span>

        {/* 고친 때와 기록 수. 상대 시간이라 "오래 멈춘 카드" 가 한눈에 보인다.
            순서 단추 줄에 얹은 이유: 그 줄은 평소 비어 있다(단추가 hover 에만 뜬다) — 따로 한 줄을 세우면 카드만 길어진다 */}
        <span className="ml-auto whitespace-nowrap text-[12px] tabular-nums text-dim">
          {formatAgo(task.updatedAt, now)}
          {task.notes.length > 0 && ` | ${TASK_MESSAGES.noteCount(task.notes.length)}`}
          {fileCount > 0 && ` | ${TASK_ATTACHMENT_MESSAGES.count(fileCount)}`}
        </span>

        {/*
          끄는 손잡이. touch-none 이 여기에만 걸린다 — 손가락이 이 위에서 시작하면 브라우저가
          스크롤을 가져가지 않아 끌기가 된다(use-board-drag 의 HANDLE_ATTR 주석).
          버튼이 아니라 span 인 이유: 눌러서 일어나는 일이 없다. 키보드로 칸을 옮기는 길은 팝업 안에 있고,
          이것은 손에게만 있는 지름길이라 탭 순서에 끼면 "눌러도 아무 일도 안 일어나는 칸" 이 된다.
        */}
        <span
          {...{ [HANDLE_ATTR]: "true" }}
          aria-hidden
          className="tap flex cursor-grab touch-none items-center px-1.5 text-dim opacity-60 transition-opacity hover:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <svg viewBox="0 0 12 12" className="w-3" fill="currentColor">
            <circle cx="4" cy="2.5" r="1" />
            <circle cx="8" cy="2.5" r="1" />
            <circle cx="4" cy="6" r="1" />
            <circle cx="8" cy="6" r="1" />
            <circle cx="4" cy="9.5" r="1" />
            <circle cx="8" cy="9.5" r="1" />
          </svg>
        </span>
      </div>

      {state && !state.ok && (
        <p role="alert" className="px-3 pb-2 text-[12.5px] text-danger">
          {state.error}
        </p>
      )}
    </li>
  );
}
