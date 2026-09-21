"use client";
// 시트 — 모바일은 바닥에서 올라오는 바텀시트(기본), 데스크톱은 가운데 팝업. 마크업 하나로 둘을 낸다.
// side="right" 면 대신 오른쪽에서 나오는 서랍이 된다(전체 메뉴). 다른 것은 미는 축뿐이라
// 판을 따로 만들지 않는다 — 막, 포커스 가두기, 배경 스크롤 잠금, 화면 이동 시 닫기를 두 벌 갖지 않기 위해서다.
//
// 동작은 fitin-app 의 common_bottom_sheet 를 그대로 옮겼다(2026-09-15): 손잡이/머리를 끌어내려 닫기,
// 끌린 만큼 막이 옅어지기, 임계값을 넘지 못하면 제자리로, 열린 직후 유령 클릭 차단, 배경 스크롤 잠금.
// 옮기면서 바꾼 것 둘:
//   - 애니메이션 라이브러리(motion/react)를 들이지 않는다. 손가락을 따라가는 transform 만 JS 가 쓰고,
//     등장/퇴장/되돌림은 globals.css 의 키프레임과 --duration-* 토큰이 맡는다.
//   - 자체 포털 대신 <dialog> + showModal() 을 쓴다. 포커스 가두기, 뒤 화면 비활성화, 최상위 레이어를
//     브라우저가 해 주므로 그 셋을 손으로 다시 만들지 않는다.
//
// 내용(children)은 열기 전에도 DOM 에 있다 — 서버에서 그린 것을 그대로 받으므로 열 때 기다림이 없다.
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { XIcon } from "@/components/ui/icons";

/** 데스크톱 팝업으로 바뀌는 폭. globals.css 의 .sheet 미디어 쿼리와 같은 값이어야 한다 */
const DESKTOP_MIN_WIDTH = 640;

/**
 * 끌어내려 닫는 임계값. 둘 중 하나만 넘으면 닫는다 —
 * 천천히 많이 내린 손과 빠르게 튕긴 손이 둘 다 "닫아라" 이기 때문이다.
 */
const DRAG_CLOSE_OFFSET_PX = 100;
/** px/ms. 500px/s 를 ms 단위로 옮긴 값이다 */
const DRAG_CLOSE_VELOCITY = 0.5;

/** 막이 완전히 투명해지는 지점 — 화면 높이의 이만큼을 내렸을 때 */
const OVERLAY_FADE_RATIO = 0.6;

/**
 * 열린 직후 막 클릭을 무시하는 시간(ms).
 * 버튼을 누른 그 탭이 합성 click 으로 막까지 전달돼 열자마자 닫히는 일을 막는다.
 */
const GHOST_CLICK_BLOCK_MS = 400;

/** 등장(slow 360ms)이 끝나고 조금 더 기다렸다 제스처를 받는다 — 올라오는 중에 잡히면 좌표가 튄다 */
const INTERACTABLE_DELAY_MS = 500;

/** 퇴장 transition 이 끝났다는 신호가 오지 않을 때를 위한 보험(ms). --duration-base 220ms + 여유 */
const EXIT_FALLBACK_MS = 320;

export function Sheet({
  label,
  title,
  children,
  triggerClassName,
  unstyledTrigger = false,
  side = "bottom",
  open: openProp,
  onOpenChange,
}: {
  /**
   * 여는 버튼에 적을 말. **바깥에서 여는 시트(open 을 준 경우)에는 주지 않는다** —
   * 그때는 이 시트가 버튼을 그리지 않는다.
   */
  label?: React.ReactNode;
  /** 시트 머리에 적을 제목. 스크린 리더가 읽는 이름이기도 하다 */
  title: string;
  children: React.ReactNode;
  triggerClassName?: string;
  /**
   * 여는 버튼에서 공용 버튼 모양을 벗긴다(triggerClassName 만 입는다).
   * 필요한 이유: cn 은 단순 이어붙이기라 buttonClass 의 h-8, px-3.5 를 뒤에서 덮어쓸 수 없다.
   * 헤더 햄버거처럼 정사각 아이콘 칸이어야 하는 자리는 아예 처음부터 다른 모양이다.
   */
  unstyledTrigger?: boolean;
  /** 어느 쪽에서 나오는가. 모양은 globals.css 의 .sheet[data-side="right"] 가 맡는다 */
  side?: "bottom" | "right";
  /**
   * 바깥이 여닫는 모드. 주면 이 시트는 **버튼을 그리지 않고** 이 값만 따른다.
   *
   * 왜 필요한가: 여는 자리가 버튼이 아닌 시트가 있다(할 일 카드는 카드 전체가 여는 자리다).
   * 시트가 제 버튼을 직접 그리는 구조만 두면 그런 자리는 시트를 못 쓰고, 그러면 <dialog> 의
   * 포커스 가두기, 배경 스크롤 잠금, 끌어내려 닫기, 화면 이동 시 닫기를 두 벌 갖게 된다.
   */
  open?: boolean;
  /** 안에서 닫혔을 때(X, Esc, 막 클릭, 끌어내리기) 바깥에 알린다 */
  onOpenChange?: (open: boolean) => void;
}) {
  // 미는 방향. 바닥 시트는 아래로, 오른쪽 서랍은 오른쪽으로 — 나온 방향으로 되돌려 보내는 것이 닫기다
  const axis = side === "right" ? "x" : "y";
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  /**
   * 스스로 여닫을 때의 상태. 바깥이 여닫는 모드에서는 openProp 이 곧 답이라 이 값을 보지 않는다 —
   * 같은 사실을 두 곳에 두면 둘이 어긋나고, 맞추려고 effect 안에서 setState 를 하게 된다.
   */
  const [selfOpen, setSelfOpen] = useState(false);
  const open = openProp ?? selfOpen;
  const titleId = useId();

  // 열린 시각과 제스처 허용 여부 — 리렌더를 일으키지 않아야 해서 ref 로 둔다
  const openedAtRef = useRef(0);
  const interactableRef = useRef(false);
  const closingRef = useRef(false);
  // 드래그 한 번의 상태. 포인터가 눌린 동안만 채워진다
  const dragRef = useRef<{ startY: number; lastY: number; lastAt: number; velocity: number } | null>(null);

  const isDesktop = () => typeof window !== "undefined" && window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches;

  /** 판과 막에 걸어 둔 인라인 스타일을 지운다 — 다음에 열 때 CSS 등장 애니메이션이 다시 살아야 한다 */
  const resetStyles = useCallback(() => {
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    if (panel) {
      panel.style.transition = "";
      panel.style.transform = "";
      panel.style.opacity = "";
      delete panel.dataset.dragging;
    }
    if (overlay) {
      overlay.style.transition = "";
      overlay.style.opacity = "";
      delete overlay.dataset.dragging;
    }
  }, []);

  /** 퇴장 모션을 보여 준 뒤 실제로 닫는다. 두 번 불려도 한 번만 닫는다 */
  const close = useCallback(() => {
    const dialog = dialogRef.current;
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    if (!dialog || closingRef.current) return;
    closingRef.current = true;

    const finish = () => {
      resetStyles();
      dialog.close();
    };

    if (!panel || !overlay) {
      finish();
      return;
    }

    const ease = "var(--duration-base) var(--ease-standard)";
    // 등장 애니메이션을 끄고 인라인 값이 자리를 갖게 한다. 막에도 반드시 걸어야 한다 —
    // 애니메이션(fill: both)이 살아 있으면 opacity 인라인 값이 통째로 무시된다(globals.css 주석)
    panel.dataset.dragging = "true";
    overlay.dataset.dragging = "true";
    // 애니메이션을 뗀 상태를 여기서 한 번 확정시킨다(강제 리플로우).
    // 없으면 안 된다: 전환은 "바뀌기 전 값" 과 "바뀐 뒤 값" 을 같은 스타일 계산에서 비교하는데,
    // 같은 틱에 목표값까지 적으면 바뀌기 전 값을 아직 애니메이션이 쥐고 있어 전환이 아예 시작되지 않는다.
    // 그래서 닫기가 모션 없이 대기 시간만 기다렸다 툭 사라졌다(2026-09-16 실측: 판도 막도 제자리).
    void panel.offsetHeight;
    panel.style.transition = `transform ${ease}, opacity ${ease}`;
    overlay.style.transition = `opacity ${ease}`;
    overlay.style.opacity = "0";
    if (isDesktop() && side !== "right") {
      // 가운데 팝업은 아래로 내려가는 대신 그 자리에서 물러난다 — 바닥과 이어져 있지 않은 판이다
      panel.style.opacity = "0";
      panel.style.transform = "scale(0.97)";
    } else {
      const box = panel.getBoundingClientRect();
      panel.style.transform = axis === "x" ? `translateX(${box.width}px)` : `translateY(${box.height}px)`;
    }

    // transitionend 가 오지 않는 경우(모션 축소, 탭 전환)를 위해 시간으로도 끝낸다
    const timer = window.setTimeout(finish, EXIT_FALLBACK_MS);
    panel.addEventListener(
      "transitionend",
      () => {
        window.clearTimeout(timer);
        finish();
      },
      { once: true },
    );
  }, [resetStyles, axis, side]);

  /** 판을 실제로 띄운다. DOM 만 건드린다 — 상태는 부르는 쪽이 정한다 */
  const showDialog = useCallback(() => {
    closingRef.current = false;
    interactableRef.current = false;
    openedAtRef.current = Date.now();
    resetStyles();
    dialogRef.current?.showModal();
    // showModal 은 안쪽 첫 포커스 대상에 포커스를 준다 — 그게 닫기(X)라 열자마자 X 에 링이 서고
    // 스크린 리더도 시트 이름 대신 "닫기" 를 먼저 읽는다. 판 자체를 받게 해 둘 다 막는다.
    // 포커스를 아예 놓지는 않는다 — <dialog> 의 포커스 가두기와 Esc 는 안쪽에 포커스가 있어야 산다
    panelRef.current?.focus({ preventScroll: true });
  }, [resetStyles]);

  const openSheet = () => {
    showDialog();
    setSelfOpen(true);
  };

  /*
   * 바깥이 여닫는 모드. 실제 여닫기는 여전히 이 안에서 한다 — <dialog> 의 showModal 과 퇴장 모션은
   * DOM 을 직접 만져야 하고, 그 일을 바깥으로 넘기면 부르는 자리마다 같은 코드를 갖게 된다.
   * 여기서는 DOM 만 맞춘다(상태는 openProp 이 이미 쥐고 있다). 마지막으로 반영한 값을 ref 로 들고
   * 달라질 때만 움직인다 — 매 렌더마다 showModal 을 다시 부르면 등장 모션이 처음부터 다시 돈다.
   */
  const appliedRef = useRef(false);
  useEffect(() => {
    if (openProp === undefined || openProp === appliedRef.current) return;
    appliedRef.current = openProp;
    if (openProp) showDialog();
    else close();
  }, [openProp, showDialog, close]);

  // 안에 있는 링크를 눌러 화면이 바뀌면 같이 닫는다. 소프트 내비게이션이라 시트는 그대로 떠 있고,
  // 바뀐 화면이 그 뒤에 가려진 채 남는다 — 누른 사람 눈에는 아무 일도 안 일어난 것으로 보인다.
  // 첫 렌더의 경로는 건너뛴다(열지도 않았는데 닫을 일이 없다)
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    if (open) close();
  }, [pathname, open, close]);

  // 등장이 끝난 뒤에야 제스처를 받는다
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      interactableRef.current = true;
    }, INTERACTABLE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      interactableRef.current = false;
    };
  }, [open]);

  // 열려 있는 동안 뒤 화면이 스크롤되지 않게 한다 — showModal 은 클릭만 막고 휠은 막지 않는다.
  // 스크롤 위치는 fixed 로 묶어 두었다가 닫을 때 그대로 돌려놓는다. 안 그러면 닫는 순간 맨 위로 튄다
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const previous = { html: html.style.overflow, overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width };
    const scrollY = window.scrollY;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollY > 0) {
      body.style.position = "fixed";
      body.style.top = `-${scrollY}px`;
      body.style.width = "100%";
    }
    return () => {
      html.style.overflow = previous.html;
      body.style.overflow = previous.overflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      if (scrollY > 0) window.scrollTo(0, scrollY);
    };
  }, [open]);

  /** 이번 축의 좌표. 아래 세 함수는 이 값 하나만 보고 움직인다 */
  const pos = (e: React.PointerEvent) => (axis === "x" ? e.clientX : e.clientY);

  const beginDrag = (e: React.PointerEvent) => {
    if (!interactableRef.current || (isDesktop() && side !== "right") || closingRef.current) return;
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    if (!panel || !overlay) return;
    dragRef.current = { startY: pos(e), lastY: pos(e), lastAt: e.timeStamp, velocity: 0 };
    panel.dataset.dragging = "true";
    // 손가락을 따라 막이 옅어지려면 막도 애니메이션을 놓아야 한다(close 와 같은 이유)
    overlay.dataset.dragging = "true";
    panel.style.transition = "";
    overlay.style.transition = "";
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    if (!drag || !panel || !overlay) return;
    // 나온 방향으로만 끌린다 — 시트는 화면 가장자리에 붙어 있고 그 너머로 갈 자리가 없다
    const dy = Math.max(0, pos(e) - drag.startY);
    const dt = e.timeStamp - drag.lastAt;
    if (dt > 0) drag.velocity = (pos(e) - drag.lastY) / dt;
    drag.lastY = pos(e);
    drag.lastAt = e.timeStamp;

    panel.style.transform = axis === "x" ? `translateX(${dy}px)` : `translateY(${dy}px)`;
    const span = axis === "x" ? panel.getBoundingClientRect().width / OVERLAY_FADE_RATIO : window.innerHeight * OVERLAY_FADE_RATIO;
    overlay.style.opacity = String(Math.max(0, 1 - dy / span));
  };

  const endDrag = () => {
    const drag = dragRef.current;
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    dragRef.current = null;
    if (!drag || !panel || !overlay) return;

    const dy = Math.max(0, drag.lastY - drag.startY);
    if (drag.velocity > DRAG_CLOSE_VELOCITY || (dy > DRAG_CLOSE_OFFSET_PX && drag.velocity >= 0)) {
      close();
      return;
    }
    // 제자리로. 되돌림은 튕기지 않는 곡선을 쓴다 — 던진 손에 스프링을 물리면 판이 가장자리를 친다
    const back = "var(--duration-base) var(--ease-standard)";
    panel.style.transition = `transform ${back}`;
    overlay.style.transition = `opacity ${back}`;
    panel.style.transform = axis === "x" ? "translateX(0)" : "translateY(0)";
    overlay.style.opacity = "1";
  };

  return (
    <>
      {/* 바깥이 여닫는 모드에서는 버튼을 그리지 않는다 — 여는 자리는 이미 바깥에 있다 */}
      {openProp === undefined && (
        <button
          type="button"
          className={unstyledTrigger ? cn("press", triggerClassName) : buttonClass({ variant: "secondary", size: "sm", className: triggerClassName })}
          onClick={openSheet}
        >
          {label}
        </button>
      )}

      <dialog
        ref={dialogRef}
        className="sheet"
        data-side={side}
        aria-labelledby={titleId}
        onClose={() => {
          appliedRef.current = false;
          setSelfOpen(false);
          onOpenChange?.(false);
        }}
        // Esc 는 브라우저가 곧장 닫아 버린다 — 막고 우리 퇴장 모션을 태운다
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div
          ref={overlayRef}
          className="sheet__overlay"
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget) return;
            beginDrag(e);
          }}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            // 열자마자 도착하는 유령 클릭은 버린다
            if (Date.now() - openedAtRef.current < GHOST_CLICK_BLOCK_MS) return;
            close();
          }}
        />

        {/* 포커스 링은 globals.css 의 .sheet__panel:focus-visible 가 뗀다 — 유틸리티 outline-none 으로는 못 덮는다 */}
        <div ref={panelRef} tabIndex={-1} className="sheet__panel">
          {/* 손잡이 — 바 옆 빈 자리까지 한 줄 전체가 끌리는 영역이다 */}
          <div className="sheet__grip-row shrink-0 pb-3 pt-3.5" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
            <div className="sheet__grip" aria-hidden />
          </div>

          <div
            className="sheet__header flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 pb-3 sm:py-3"
            onPointerDown={beginDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <h2 id={titleId} className="min-w-0 text-[15px] font-bold tracking-[-0.02em] text-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={close}
              // 좁은 화면에서는 손가락이 닿는 넓이가 곧 크기다(44px). 넓은 화면은 조밀한 36px 그대로 둔다
              className="press inline-flex size-11 shrink-0 items-center justify-center rounded-full text-mut outline-none hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-ink sm:size-9"
            >
              <XIcon size={18} />
              <span className="sr-only">닫기</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-1">{children}</div>
        </div>
      </dialog>
    </>
  );
}
