"use client";
// 할 일 카드 끌기 — 포인터 이벤트로 우리가 직접 움직인다.
//
// **왜 네이티브 드래그앤드롭을 버렸나**(2026-09-22, "집었을 때 마우스 집는 모션이 풀린다"):
// HTML5 DnD 가 시작되는 순간 커서를 브라우저가 가져간다. 우리 `.grabbable` 의 grabbing 도,
// `:active` 도 그때 풀리고 dropEffect 가 정하는 기본 모양(이동/금지)이 대신 뜬다. CSS 로 되돌릴 길이 없다 —
// 끄는 동안의 모양을 우리가 정하려면 끄는 일 자체를 우리가 해야 한다.
// 덤: 끌리는 카드가 실제로 손을 따라온다(네이티브는 반투명 스크린샷이 따라왔고 카드는 제자리였다).
//
// **터치는 손잡이에서만 시작한다**(2026-09-22, "터치 드래그앤드랍이 안되네..? 그럼 어떻게 옮기지?!").
// 앞서는 터치를 통째로 막아 두었다. 판을 훑어 내리다 카드가 딸려 오는 일을 막으려던 것인데,
// 그 대가로 **휴대폰에서는 끌 길이 아예 없었다**.
//
// 길게 누르기로 가르지 않은 이유: 손가락이 닿는 순간 브라우저가 스크롤을 시작해 버리면
// 그 뒤에 우리가 취소할 길이 없다. 스크롤을 끄려면 `touch-action: none` 을 미리 걸어야 하는데,
// 카드 전체에 걸면 칸을 훑어 내리지 못한다. 그래서 **손잡이 한 조각에만** 걸었다(card.tsx 의 grip).
// 손잡이에서 시작한 터치는 끌기고, 카드 어디서든 시작한 터치는 스크롤이다 — 둘이 겹치지 않는다.
//
// 칸 옮기기의 본체는 여전히 팝업 안의 칸 단추다(키보드로 되어야 한다). 끌기는 손과 마우스에게
// 얹어 주는 지름길이다(task-card 주석의 a11y 근거와 같다).
//
// 카드 위치는 **DOM 을 직접 만져서** 옮긴다. 손이 움직일 때마다 state 를 바꾸면 판 전체가
// 초당 수십 번 다시 그려진다. 판이 알아야 하는 것은 "어느 칸 위인가" 와 "어느 카드 앞인가" 둘뿐이라
// 그것만 state 로 두고, 값이 실제로 바뀔 때만 고친다(카드 가운데 선을 넘을 때).
//
// **칸 안 순서도 끌어서 바꾼다**(2026-10-02, 사용자: "위로 아래로 지우고 이것도 드래그로").
// 놓을 자리는 포인터 아래 칸의 카드들 가운데 선과 견줘 정한다 — 포인터가 처음으로 가운데 선 위에 있는 카드 앞이다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskStatus } from "@/lib/admin/tasks";

/**
 * 끌기로 치는 최소 거리(px). 이보다 작게 움직인 것은 누른 것으로 보고 카드를 연다.
 * 0 으로 두면 클릭할 때마다 손이 1~2px 흔들려 카드가 잠깐 떠오른다.
 */
const DRAG_START_PX = 5;

/** 칸이 스스로 붙이는 표. 끄는 동안 포인터 밑에 무엇이 있는지 이 값으로 찾는다 */
export const DROP_ATTR = "data-drop-status";

/**
 * 손잡이가 스스로 붙이는 표. **이 조각에는 `touch-action: none` 이 걸려 있어야 한다**(card.tsx) —
 * 그래야 손가락이 여기서 시작할 때 브라우저가 스크롤을 가로채지 않는다.
 */
export const HANDLE_ATTR = "data-drag-handle";

/** 카드가 스스로 붙이는 표(값은 카드 id). 놓을 자리를 셀 때 칸 안의 카드만 골라낸다 — 자리 표시 줄은 세지 않는다 */
export const CARD_ATTR = "data-task-card";

/** 끄는 동안 문서가 입는 표. 커서와 글자 선택 금지는 globals.css 의 `body.dragging-card` 가 맡는다 */
const BODY_CLASS = "dragging-card";

type Session = {
  id: string;
  from: TaskStatus;
  el: HTMLElement;
  startX: number;
  startY: number;
  /** 임계값을 넘겨 실제로 끌기가 시작됐는가. 안 넘었으면 이 누름은 클릭이다 */
  moved: boolean;
  /** 끌기 전 바로 뒤에 있던 카드. 같은 칸에서 이 앞에 놓는 건 제자리라 아무것도 보내지 않는다 */
  nextId: string | null;
};

/** 칸 안에서 놓을 자리 — 이 카드 앞(null 이면 칸 맨 끝) */
function cardBefore(column: HTMLElement, dragged: HTMLElement, y: number): string | null {
  for (const card of column.querySelectorAll<HTMLElement>(`[${CARD_ATTR}]`)) {
    if (card === dragged) continue;
    const r = card.getBoundingClientRect();
    if (y < r.top + r.height / 2) return card.getAttribute(CARD_ATTR);
  }
  return null;
}

export function useBoardDrag(onDrop: (id: string, to: TaskStatus, before: string | null) => void) {
  const session = useRef<Session | null>(null);
  /** 지금 끌고 있는 카드가 원래 있던 칸. null 이면 아무것도 끌고 있지 않다 */
  const [from, setFrom] = useState<TaskStatus | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  /** finish 가 읽어야 하는 값이라 state 와 나란히 ref 로도 둔다 — 클로저가 낡은 값을 보면 엉뚱한 칸에 놓는다 */
  const overRef = useRef<TaskStatus | null>(null);
  /** 놓을 자리(그 카드 앞, null 이면 맨 끝). over 와 같은 이유로 ref 를 같이 둔다 */
  const [before, setBefore] = useState<string | null>(null);
  const beforeRef = useRef<string | null>(null);
  /**
   * 방금 끌기로 끝난 누름인가. 카드의 click 은 pointerup 다음에 오므로,
   * 이 표가 없으면 끌어다 놓은 카드가 놓이자마자 팝업으로 열린다.
   */
  const droppedRef = useRef(false);

  const setOverBoth = useCallback((next: TaskStatus | null, nextBefore: string | null) => {
    if (overRef.current !== next) {
      overRef.current = next;
      setOver(next);
    }
    if (beforeRef.current !== nextBefore) {
      beforeRef.current = nextBefore;
      setBefore(nextBefore);
    }
  }, []);

  /** 끌기를 끝낸다. commit 이면 지금 올라가 있는 칸으로 옮긴다 */
  const finish = useCallback(
    (commit: boolean) => {
      const s = session.current;
      session.current = null;
      document.body.classList.remove(BODY_CLASS);
      setFrom(null);

      const to = overRef.current;
      const at = beforeRef.current;
      setOverBoth(null, null);
      if (!s) return;

      // 카드를 제자리로 돌려놓는 일은 옮기기보다 먼저 한다 — 인라인 transform 이 남으면
      // 판이 다시 그려져도 그 카드만 어긋난 자리에 선다
      s.el.style.transform = "";
      s.el.classList.remove("dragging");

      if (!s.moved) return;
      droppedRef.current = true;
      if (!commit || !to) return;
      // 같은 칸의 제자리(원래 뒤 카드 앞)에 놓은 건 할 일이 없다
      if (to === s.from && at === s.nextId) return;
      onDrop(s.id, to, at);
    },
    [onDrop, setOverBoth],
  );

  /**
   * 카드가 누름을 넘겨 준다. 마우스는 카드 어디서든, 손가락은 손잡이에서만 받는다.
   * 마우스는 왼쪽 버튼만 — 오른쪽 버튼은 메뉴를 여는 일이다.
   */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>, id: string, status: TaskStatus) => {
      const target = e.target as HTMLElement;
      if (e.pointerType === "mouse") {
        if (e.button !== 0) return;
        // 카드 안의 제 일이 있는 버튼에서 시작한 누름은 그 버튼의 일이다
        if (target.closest("button")?.dataset.noDrag === "true") return;
      } else if (!target.closest(`[${HANDLE_ATTR}]`)) {
        // 손가락이 손잡이 밖에 닿았으면 그건 칸을 훑는 일이다 — 건드리지 않는다
        return;
      } else {
        // 손가락은 **암묵 포인터 캡처**가 걸린다(터치 포인터의 기본값). 그대로 두면 끌리는 동안
        // 모든 이벤트가 손잡이로 가는데, 그 손잡이가 든 카드에는 곧 pointer-events:none 이 붙는다
        // (globals.css 의 .grabbable.dragging) — 그러면 손이 움직여도 pointermove 가 끊긴다.
        // 캡처를 놓으면 이벤트가 평소대로 창까지 올라온다. 스크롤은 손잡이의 touch-action 이 이미 막았다.
        try {
          target.releasePointerCapture?.(e.pointerId);
        } catch {
          // 캡처가 안 걸려 있으면 던진다 — 그 경우가 바로 우리가 원하던 상태다
        }
      }
      const el = e.currentTarget;
      // 바로 뒤 카드. 자리 표시 줄은 끌기 전에는 없으므로 형제가 곧 카드다
      const nextId = (el.nextElementSibling as HTMLElement | null)?.getAttribute(CARD_ATTR) ?? null;
      session.current = { id, from: status, el, startX: e.clientX, startY: e.clientY, moved: false, nextId };
      droppedRef.current = false;
    },
    [],
  );

  /** 끌기로 끝난 누름의 click 을 삼킨다. 카드가 열리는 자리에 걸어 둔다 */
  const swallowClick = useCallback((e: React.MouseEvent) => {
    if (!droppedRef.current) return;
    droppedRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 손은 카드 밖으로 나간다 — 그래서 move/up 은 창이 받는다.
  // 누른 카드가 없으면(session 이 비면) 아무 일도 하지 않으므로 늘 붙여 둬도 값이 싸다.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = session.current;
      if (!s) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      if (!s.moved) {
        if (Math.abs(dx) < DRAG_START_PX && Math.abs(dy) < DRAG_START_PX) return;
        s.moved = true;
        s.el.classList.add("dragging");
        document.body.classList.add(BODY_CLASS);
        setFrom(s.from);
      }

      s.el.style.transform = `translate(${dx}px, ${dy}px)`;

      // 끌리는 카드 자신은 포인터를 막지 않는다(globals.css 의 .grabbable.dragging).
      // 그래서 이 자리에서 나오는 것은 늘 카드 밑에 있는 칸이다
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const column = under?.closest?.(`[${DROP_ATTR}]`) as HTMLElement | null;
      setOverBoth((column?.getAttribute(DROP_ATTR) as TaskStatus | undefined) ?? null, column ? cardBefore(column, s.el, e.clientY) : null);
    };

    const up = () => finish(true);
    // 창 밖으로 나가 버튼을 놓으면 up 이 오지 않는다 — 그때는 취소로 끝낸다
    const cancel = () => finish(false);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
    };
  }, [finish, setOverBoth]);

  return { from, over, before, onPointerDown, swallowClick };
}
