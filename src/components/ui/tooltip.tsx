// 잘린 글자(truncate / line-clamp)에 전체 문구를 보여주는 툴팁 + 잘림 감지 래퍼(Clamp).
// 네이티브 title 을 쓰지 않는 이유: 디자인 토큰을 못 쓰고, 뜨는 데 1초 넘게 걸리고, 터치에선 아예 안 뜬다.
// body 로 포털하는 이유: 카드, 메뉴가 overflow-hidden 이라 제자리에 그리면 말풍선이 잘린다.
// 스크린리더에는 감춘다(aria-hidden) — 잘림은 CSS 시각 처리라 전체 문구가 이미 DOM 에 있어 두 번 읽히기만 한다.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/** 열림 지연 — 목록 위를 스치듯 지나갈 때 말풍선이 줄줄이 뜨는 것을 막는다 */
const OPEN_DELAY_MS = 140;
/** 길게 누름 판정 — hover 가 없는 터치 기기에서 툴팁에 닿는 유일한 방법 */
const LONG_PRESS_MS = 420;
/** 트리거와 말풍선 사이 간격(px) */
const GAP = 8;
/** 화면 가장자리 최소 여백(px) */
const EDGE = 8;
/** 잘림 판정 오차 — 소수점 레이아웃에서 1px 미만 차이는 잘린 게 아니다 */
const OVERFLOW_SLACK = 1;

type Pos = { top: number; left: number };

/** 기본은 위, 위쪽 공간이 모자라면 아래. 가로는 화면 안으로 밀어 넣는다(트리거 중앙 기준) */
function place(trigger: DOMRect, tip: DOMRect): Pos {
  const above = trigger.top - tip.height - GAP;
  const top = above < EDGE ? trigger.bottom + GAP : above;
  const half = tip.width / 2;
  const min = EDGE + half;
  const max = Math.max(min, window.innerWidth - EDGE - half);
  const left = Math.min(Math.max(trigger.left + trigger.width / 2, min), max);
  return { top, left };
}

/**
 * 트리거 요소에 붙일 핸들러와 말풍선 노드를 돌려준다.
 * enabled=false 면 아무 일도 하지 않는다 — 글자가 실제로 잘렸을 때만 켜기 위한 스위치.
 */
export function useTooltip<T extends HTMLElement>(label: string, enabled: boolean) {
  const ref = useRef<T | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const openRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const close = useCallback(() => {
    clearTimer();
    openRef.current = false;
    setOpen(false);
    setPos(null);
  }, [clearTimer]);

  const openAfter = useCallback(
    (delay: number) => {
      if (!enabled) return;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        openRef.current = true;
        setOpen(true);
      }, delay);
    },
    [clearTimer, enabled],
  );

  useEffect(() => clearTimer, [clearTimer]);

  // 잘림이 사라지면(창이 넓어지는 등) 떠 있던 말풍선도 같이 사라져야 한다 — 상태를 지우는 대신 파생값으로 끈다
  const visible = open && enabled;

  // 위치는 열린 직후 한 번만 잰다. 스크롤, 리사이즈, Esc, 바깥 누름이면 따라다니지 않고 닫는다.
  useEffect(() => {
    if (!visible) return;
    const el = ref.current;
    const tip = tipRef.current;
    if (el && tip) setPos(place(el.getBoundingClientRect(), tip.getBoundingClientRect()));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [visible, close]);

  // 키보드 사용자: 잘린 글자를 감싼 링크, 버튼이 포커스를 받을 때 함께 띄운다.
  // 감싼 요소가 없으면(그냥 텍스트) 잘렸을 때만 스스로 포커스를 받게 한다.
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const host = el.closest<HTMLElement>("a, button, [tabindex]");
    const target = host ?? el;
    if (!host) el.tabIndex = 0;
    const show = () => openAfter(0);
    target.addEventListener("focus", show);
    target.addEventListener("blur", close);
    return () => {
      target.removeEventListener("focus", show);
      target.removeEventListener("blur", close);
      if (!host) el.removeAttribute("tabindex");
    };
  }, [enabled, openAfter, close]);

  const triggerProps = {
    ref,
    onPointerEnter: (e: React.PointerEvent<T>) => {
      if (e.pointerType === "mouse") openAfter(OPEN_DELAY_MS);
    },
    onPointerLeave: close,
    onPointerCancel: close,
    onPointerDown: (e: React.PointerEvent<T>) => {
      // 마우스 클릭은 닫고, 터치는 길게 누름으로 연다(탭 한 번은 링크 이동이어야 한다)
      if (e.pointerType === "mouse") close();
      else openAfter(LONG_PRESS_MS);
    },
    onPointerUp: () => {
      if (!openRef.current) clearTimer();
    },
  };

  const tooltip =
    visible && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={tipRef}
            aria-hidden
            // z: 헤더 드롭다운(z-50)보다 위. 위치를 재기 전 한 프레임은 감춰 둔다(측정용으로만 그린다)
            className={cn(
              "pointer-events-none fixed z-[60] max-w-[280px] -translate-x-1/2 rounded-[var(--radius-inset)] bg-ink px-2.5 py-1.5 text-[12px] font-medium leading-[1.5] text-on-ink",
              pos ? "animate-fade-in" : "invisible",
            )}
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0 }}
          >
            {label}
          </div>,
          document.body,
        )
      : null;

  return { triggerProps, tooltip };
}

export type ClampLines = 1 | 2 | 3;

const LINE_CLASS: Record<ClampLines, string> = {
  1: "truncate",
  2: "line-clamp-2",
  3: "line-clamp-3",
};

/**
 * 정해진 줄 수로 자르고, 실제로 잘렸을 때만 전체 문구 툴팁을 붙인다.
 * 글자를 그대로 넘기면 그것이 곧 말풍선 문구다. 조각을 넘길 때는 text 로 문구를 따로 준다 —
 * 노드에서 글자를 긁어내지 않는다(중첩이 깊어지면 무엇이 읽히는지 부르는 쪽이 알 수 없다).
 */
export function Clamp({
  lines = 1,
  className,
  text,
  children,
}: {
  lines?: ClampLines;
  className?: string;
  /**
   * 말풍선에 띄울 글자. 조각(ReactNode)을 넘길 때만 필요하다 —
   * 글자 하나만 색을 달리 주려고 span 으로 쪼갠 줄(카드의 장르)이 그 경우다.
   */
  text?: string;
  children: React.ReactNode;
}) {
  const [clipped, setClipped] = useState(false);
  const label = text ?? (typeof children === "string" ? children : "");
  const { triggerProps, tooltip } = useTooltip<HTMLSpanElement>(label, clipped && label.length > 0);
  const { ref } = triggerProps;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () =>
      setClipped(
        el.scrollHeight > el.clientHeight + OVERFLOW_SLACK || el.scrollWidth > el.clientWidth + OVERFLOW_SLACK,
      );
    check();
    // 폭이 바뀌면(반응형, 사이드바 접힘) 잘림 여부도 바뀐다
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, children, lines]);

  return (
    <>
      <span {...triggerProps} className={cn("block", LINE_CLASS[lines], className)}>
        {children}
      </span>
      {tooltip}
    </>
  );
}
