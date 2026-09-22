"use client";
// 할 일 카드 끌기 — 포인터 이벤트로 우리가 직접 움직인다.
//
// **왜 네이티브 드래그앤드롭을 버렸나**(2026-09-22, "집었을 때 마우스 집는 모션이 풀린다"):
// HTML5 DnD 가 시작되는 순간 커서를 브라우저가 가져간다. 우리 `.grabbable` 의 grabbing 도,
// `:active` 도 그때 풀리고 dropEffect 가 정하는 기본 모양(이동/금지)이 대신 뜬다. CSS 로 되돌릴 길이 없다 —
// 끄는 동안의 모양을 우리가 정하려면 끄는 일 자체를 우리가 해야 한다.
// 덤: 끌리는 카드가 실제로 손을 따라온다(네이티브는 반투명 스크린샷이 따라왔고 카드는 제자리였다).
//
// **마우스에서만 켠다**: 터치로 카드를 끌려면 세로 스크롤과 가를 길목(길게 누르기)이 필요한데,
// 그러면 판을 훑어 내리다 카드가 딸려 오는 일이 생긴다. 칸 옮기기의 본체는 팝업 안의 칸 단추다 —
// 드래그는 마우스에게만 얹어 주는 지름길이다(task-card 주석의 a11y 근거와 같다).
//
// 카드 위치는 **DOM 을 직접 만져서** 옮긴다. 손이 움직일 때마다 state 를 바꾸면 판 전체가
// 초당 수십 번 다시 그려지고, 그 사이 카드의 위로/아래로 버튼까지 매번 다시 만들어진다.
// 판이 알아야 하는 것은 "지금 어느 칸 위인가" 하나뿐이라 그것만 state 로 둔다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskStatus } from "@/lib/admin/tasks";

/**
 * 끌기로 치는 최소 거리(px). 이보다 작게 움직인 것은 누른 것으로 보고 카드를 연다.
 * 0 으로 두면 클릭할 때마다 손이 1~2px 흔들려 카드가 잠깐 떠오른다.
 */
const DRAG_START_PX = 5;

/** 칸이 스스로 붙이는 표. 끄는 동안 포인터 밑에 무엇이 있는지 이 값으로 찾는다 */
export const DROP_ATTR = "data-drop-status";

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
};

export function useBoardDrag(onDrop: (id: string, to: TaskStatus) => void) {
  const session = useRef<Session | null>(null);
  /** 지금 끌고 있는 카드가 원래 있던 칸. null 이면 아무것도 끌고 있지 않다 */
  const [from, setFrom] = useState<TaskStatus | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  /** finish 가 읽어야 하는 값이라 state 와 나란히 ref 로도 둔다 — 클로저가 낡은 값을 보면 엉뚱한 칸에 놓는다 */
  const overRef = useRef<TaskStatus | null>(null);
  /**
   * 방금 끌기로 끝난 누름인가. 카드의 click 은 pointerup 다음에 오므로,
   * 이 표가 없으면 끌어다 놓은 카드가 놓이자마자 팝업으로 열린다.
   */
  const droppedRef = useRef(false);

  const setOverBoth = useCallback((next: TaskStatus | null) => {
    if (overRef.current === next) return;
    overRef.current = next;
    setOver(next);
  }, []);

  /** 끌기를 끝낸다. commit 이면 지금 올라가 있는 칸으로 옮긴다 */
  const finish = useCallback(
    (commit: boolean) => {
      const s = session.current;
      session.current = null;
      document.body.classList.remove(BODY_CLASS);
      setFrom(null);

      const to = overRef.current;
      setOverBoth(null);
      if (!s) return;

      // 카드를 제자리로 돌려놓는 일은 옮기기보다 먼저 한다 — 인라인 transform 이 남으면
      // 판이 다시 그려져도 그 카드만 어긋난 자리에 선다
      s.el.style.transform = "";
      s.el.classList.remove("dragging");

      if (!s.moved) return;
      droppedRef.current = true;
      if (commit && to && to !== s.from) onDrop(s.id, to);
    },
    [onDrop, setOverBoth],
  );

  /** 카드가 누름을 넘겨 준다. 마우스 왼쪽 버튼만 받는다 */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>, id: string, status: TaskStatus) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      // 카드 안의 버튼(위로, 아래로)에서 시작한 누름은 그 버튼의 일이다
      if ((e.target as HTMLElement).closest("button")?.dataset.noDrag === "true") return;
      session.current = { id, from: status, el: e.currentTarget, startX: e.clientX, startY: e.clientY, moved: false };
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
      setOverBoth((column?.getAttribute(DROP_ATTR) as TaskStatus | undefined) ?? null);
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

  return { from, over, onPointerDown, swallowClick };
}
