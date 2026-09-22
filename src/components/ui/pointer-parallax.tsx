"use client";
// 커버가 포인터를 따라 미는 껍데기 — **카드 한 장 전체**가 이걸 쓴다(2026-09-22, 사용자 지정:
// "이미지영역뿐만 아니라 카드 영역에서도 포함이야").
//
// 처음에는 커버 상자에만 붙였다. 그러면 제목이나 값 위에 커서가 있을 때 그림이 제자리로 돌아와,
// 카드 안에서 커서를 움직이는 동안 그림이 붙었다 떨어졌다 했다. 카드가 한 덩어리로 반응해야
// 한 장을 만지고 있다는 느낌이 끊기지 않는다.
//
// 여기서 하는 일은 하나뿐이다: 커서가 상자 안 어디에 있는지를 -1~1 로 재어 --px, --py 에 꽂는다.
// 실제로 그리는 규칙(얼마나 밀리나, 얼마나 커지나, 얼마나 빨리)은 전부 globals.css 의 .parallax 가 갖는다 —
// 컴포넌트에 숫자를 두지 않는 규약(§6)이고, 그래야 prefers-reduced-motion 킬스위치도 한 곳에서 끈다.
//
// **버벅이지 않게 하는 방법이 둘이다**(같은 날 사용자 지적: "지금 좀 버벅이네").
//   1) 상자 크기(getBoundingClientRect)를 움직일 때마다 재지 않는다. 그 호출은 브라우저에
//      레이아웃을 강제로 끝내게 하는데(강제 리플로), 격자에 카드가 40장인 화면에서 그 비용이
//      포인터 이벤트마다 든다. 들어올 때 한 번 재서 들고 있다가 나갈 때 버린다.
//   2) 값을 쓰는 일은 프레임당 한 번으로 묶는다. 포인터 이벤트는 고주사율 화면에서 한 프레임에
//      여러 번 온다(마우스 폴링이 1000Hz 인 것도 있다) — 그때마다 style 을 건드리면 그린 것보다
//      버린 것이 많아진다. requestAnimationFrame 이 마지막 위치 하나만 반영한다.
//
// 상태(useState)를 쓰지 않고 style 에 직접 꽂는 이유도 같다. 리렌더로 흘리면 카드 한 장 위를
// 지나갈 때마다 React 가 수십 번 돈다.
//
// 마우스만 받는다. 터치는 "지나간다" 가 없어서(누르면 곧 이동이다) 그림이 손가락 아래에서
// 한 번 튀었다가 제자리로 돌아오기만 한다.
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export function PointerParallax({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  /** 들어올 때 잰 상자. 나가면 버린다 — 스크롤하는 동안 낡은 값을 들고 있지 않기 위해서다 */
  const rectRef = useRef<DOMRect | null>(null);
  /** 이번 프레임에 반영할 마지막 커서 위치. 프레임이 오면 비운다 */
  const nextRef = useRef<{ x: number; y: number } | null>(null);
  const frameRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    frameRef.current = null;
    const el = ref.current;
    const rect = rectRef.current;
    const next = nextRef.current;
    if (!el || !rect || !next) return;
    nextRef.current = null;
    // 가운데가 0 이어야 커서가 한가운데일 때 그림이 안 움직인다 — 0~1 을 -1~1 로 편다
    el.style.setProperty("--px", String(((next.x - rect.left) / rect.width) * 2 - 1));
    el.style.setProperty("--py", String(((next.y - rect.top) / rect.height) * 2 - 1));
  }, []);

  const enter = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
    if (e.pointerType !== "mouse") return;
    rectRef.current = ref.current?.getBoundingClientRect() ?? null;
  }, []);

  const track = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (e.pointerType !== "mouse" || !rectRef.current) return;
      nextRef.current = { x: e.clientX, y: e.clientY };
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  // 떠날 때 값을 지운다. 0 으로 두지 않고 지우는 이유: 기본값(var 의 fallback)으로 돌아가야
  // hover 가 끝난 뒤 남은 transform 과 다음 hover 의 시작점이 어긋나지 않는다
  const leave = useCallback(() => {
    rectRef.current = null;
    nextRef.current = null;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    const el = ref.current;
    if (!el) return;
    el.style.removeProperty("--px");
    el.style.removeProperty("--py");
  }, []);

  // 예약해 둔 프레임을 들고 언마운트되면(스크롤로 카드가 목록에서 빠지는 일이 흔하다)
  // 콜백이 사라진 노드를 붙든다
  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <span ref={ref} className={cn("parallax", className)} onPointerEnter={enter} onPointerMove={track} onPointerLeave={leave}>
      {children}
    </span>
  );
}
