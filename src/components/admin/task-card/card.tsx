"use client";

// 할 일 카드 한 장 — **보는 자리**다. 적고 고치는 일은 팝업이 맡는다(dialog.tsx).
//
// 왜 갈랐나(2026-09-21): 앞 카드는 250px 폭 안에 선택 상자 하나와 버튼 여섯 개를 11px 글자로
// 두 줄에 깔고 있었다. 그 자리에서 제목을 고치고 기록까지 적으라고 하니 "너무 불편하다" 는 말을 들었다.
// 지금 카드에 남은 건 읽을 것(제목, 급함, 메모, 붙인 대상, 기록 수)뿐이다.
// 순서 바꾸기(위로/아래로 단추)도 있었는데 2026-10-02 걷었다 — 칸 안 자리도 끌어서 바꾼다(use-board-drag).
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
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { raisedClass } from "@/components/ui/page";
import { formatAgo } from "@/lib/format";
import { TASK_ATTACHMENT_MESSAGES, TASK_CATEGORY_LABEL, TASK_MESSAGES, TASK_PRIORITY_LABEL } from "@/lib/admin/messages";
import { staleDays, type AdminTask, type TaskStatus } from "@/lib/admin/tasks";
import { CATEGORY_BADGE, PRIORITY_BADGE, cardStripe } from "@/components/admin/task-tone";
import { CARD_ATTR, HANDLE_ATTR } from "@/components/admin/use-board-drag";

/**
 * 카드 높이는 하나다(2026-10-02, 사용자: "카드 크기는 일정했으면 좋겠다, 어느 정도 내용도 나오고").
 * 앞에는 메모, 기록, 붙임표가 있는 만큼 늘어 한 칸 안에서 카드가 들쭉날쭉했고 눈이 줄을 못 탔다.
 * 324px, 186px, 144px, 124px 를 차례로 "너무 크다" 해서 줄였다. 메모 줄 수를 고정하면(두 줄, 한 줄) 높이가
 * 가장 꽉 찬 카드에 맞춰져야 해서 카드가 커지거나, 한 줄로 눌려 글이 안 읽혔다.
 * 그래서 **메모는 줄 수를 정하지 않는다** — 제목, 최근 기록, 붙임표가 먹고 남은 칸만큼 줄바꿈해 채운다(FillText).
 * 기록도 붙임표도 없는 카드는 메모가 서너 줄, 다 붙은 카드는 한 줄이다. 넘치는 글은 팝업에 있다.
 *
 * 카드 전체가 아니라 본문(여는 버튼)에 건다: 아래 줄은 손가락 기기에서 .tap 으로 44px 까지 커진다.
 * 카드 전체에 걸면 그 화면에서만 본문이 그만큼 잘린다.
 */
const CARD_BODY_HEIGHT = "h-[112px]";

/**
 * 남은 높이를 줄 수로 바꿔 그만큼만 보인다. overflow 로 자르기만 하면 마지막 줄이 허리에서 잘리고 말줄임표도 없다.
 * 줄 수는 칸 높이를 줄 높이로 나눠 정한다 — 칸 높이는 형제(기록, 붙임표)가 있느냐에 따라 카드마다 다르다.
 * 재기 전(서버 렌더)에는 자르기만 한다. 첫 측정은 그리자마자 와서 눈에 띄는 튐이 없다.
 */
function FillText({ text }: { text: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<number | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => {
      const lineHeight = parseFloat(getComputedStyle(box).lineHeight);
      if (lineHeight > 0) setLines(Math.max(1, Math.floor(box.clientHeight / lineHeight)));
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="min-h-0 flex-1 overflow-hidden text-[12.5px] leading-[1.45] text-mut">
      <p className="whitespace-pre-line" style={lines ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: lines, overflow: "hidden" } : undefined}>
        {text}
      </p>
    </div>
  );
}

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
  // 사람이 적은 글 중 가장 최근 것. 칸 이동 자취는 "어디까지 왔나" 를 말해 주지 않아 뺀다(기록은 오래된 것이 앞이다)
  const latestNote = task.notes.findLast((n) => n.kind === "note" && n.body);
  // 첨부 수는 본문 것과 기록 것을 합친다 — 카드에서 궁금한 건 "자료가 붙어 있나" 지 어디 붙었나가 아니다
  const fileCount = task.attachments.length + task.notes.reduce((n, note) => n + note.attachments.length, 0);
  const stale = staleDays(task, now);
  const stripe = cardStripe(task);
  const mine = task.assignee?.id === meId;

  return (
    <li
      {...{ [CARD_ATTR]: task.id }}
      onPointerDown={(e) => onPointerDown?.(e, task.id, status)}
      onClickCapture={onClickCapture}
      className={raisedClass(
        cn(
          "grabbable group relative flex flex-col overflow-hidden transition-[opacity] duration-base",
          // 끝난 일은 흐리게 — 판의 무게는 아직 남은 일에 있어야 한다. 손을 대면 다시 또렷해진다
          status === "done" && "opacity-60 hover:opacity-100 focus-within:opacity-100",
        ),
      )}
    >
      {/* 왼쪽 띠(2026-10-01). 급함 높음은 빨강, 아니면 분류 색이다(task-tone). 배지를 읽기 전에 색으로 먼저 갈린다 */}
      {stripe && <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", stripe)} />}
      {/* 카드 전체가 여는 자리다. 안에 링크를 넣지 않는 이유는 버튼 안의 링크가 못 눌리기 때문이다 —
          붙인 대상으로 가는 길은 팝업 안에 있다 */}
      {/* 카드를 키웠다(2026-10-02, 사용자: "카드가 너무 작다") — 제목 15px, 글자 한 단계, 여백 한 단계. 맥락은 한 줄 그대로다(아래 주석의 10-01 지적). 폭은 칸이 정하니 안쪽을 늘렸다 */}
      <button type="button" onClick={() => onOpen(task.id)} className={cn("flex w-full shrink-0 flex-col gap-1 overflow-hidden px-3 py-2.5 text-left", CARD_BODY_HEIGHT)}>
        {/* 새 기록(2026-10-02, 사용자: "기록 새로 달리면 카드에도 표시"). 판에서 제일 먼저 봐야 할 표시라 맨 위 채운 빨강이다.
            열면 꺼진다 — 기준은 내가 이 카드를 마지막으로 연 때다(admin_task_reads) */}
        <div className="flex shrink-0 items-start justify-between gap-2">
          {/* 제목은 한 줄. 전체 제목은 팝업 머리에 있다 */}
          <p className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-[1.35] text-ink">{task.title}</p>
          {/* 새 기록은 제목 줄 오른쪽에 선다 — 따로 한 줄을 먹으면 그 카드만 내용이 한 줄 덜 보인다 */}
          {unread > 0 && (
            <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-[12px] font-bold text-on-ink">{TASK_MESSAGES.cardUnread(unread)}</span>
          )}
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
          알 수 없어 매번 팝업을 열어야 했다. 지금은 메모가 남는 칸만큼(줄바꿈 그대로), 최근 기록 한 줄 — 기록은 이름표(흐린 굵은 글자)로 메모와 갈라 읽힌다.
          더 긴 글은 팝업에 있다.
        */}
        {task.body ? <FillText text={task.body} /> : <div className="flex-1" />}
        {latestNote && (
          // 이름표와 본문을 한 줄에 눕힌다 — 이름표를 따로 세우면 기록 한 줄에 줄 둘이 든다.
          // 왼쪽 보라 띠와 보라 이름표로 메모와 가른다(2026-10-02, 사용자: "최근 기록이 잘 안 보이고 구분도 안 된다").
          // 흐린 회색 이름표는 메모 글자와 같은 결이라 한 덩어리로 읽혔다. 띠는 높이를 안 먹는다
          <p className="shrink-0 truncate border-l-2 border-acc pl-2 text-[12px] leading-[1.45] text-ink">
            <span className="font-semibold text-acc">
              {TASK_MESSAGES.cardLatestNote}
              {latestNote.authorName && ` | ${latestNote.authorName}`}
            </span>{" "}
            {latestNote.body}
          </p>
        )}

        {/* 붙임표 줄은 붙은 것이 있을 때만 선다 — 빈 줄이 카드마다 높이를 먹었다 */}
        {(stale !== null || task.game || task.shop || task.source) && (
          // 바닥에 붙인다(mt-auto) — 카드마다 붙임표가 같은 높이에 서야 줄이 맞는다. 줄바꿈은 안 한다(높이가 하나다)
          <div className="mt-auto flex min-w-0 shrink-0 items-center gap-1.5 overflow-hidden text-[11.5px] leading-[1.5]">
            {stale !== null && <span className="shrink-0 rounded-[6px] bg-warn-soft px-1.5 font-semibold text-warn">{TASK_MESSAGES.cardStale(stale)}</span>}
            {task.game && <span className="min-w-0 truncate rounded-[6px] bg-surface-3 px-1.5 text-acc">{task.game.title}</span>}
            {task.shop && <span className="min-w-0 truncate rounded-[6px] bg-surface-3 px-1.5 text-mut">{task.shop.name}</span>}
            {task.source && <span className="rounded-[6px] bg-surface-3 px-1.5 font-mono text-mut">{task.source}</span>}
          </div>
        )}
      </button>

      {/* data-no-drag: 이 버튼에서 시작한 누름은 끌기가 아니라 그 버튼의 일이다 */}
      <div className="flex shrink-0 items-center gap-1 px-2.5 pb-1.5">
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

        {/* 고친 때와 기록 수. 상대 시간이라 "오래 멈춘 카드" 가 한눈에 보인다.
            담당자 줄에 얹은 이유: 따로 한 줄을 세우면 카드만 길어진다 */}
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

    </li>
  );
}
