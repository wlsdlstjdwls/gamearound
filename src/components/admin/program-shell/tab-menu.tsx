"use client";
// 프로그램 탭 우클릭 메뉴(2026-10-30 사용자 "다른 화면 닫기 단추 대신 우클릭 메뉴로 모두 닫기, 다른 화면 모두 닫기 등", SBO 탭 줄과 같은 손버릇).
// 무엇을 닫을지는 우클릭한 탭을 기준으로 정한다 — 고른 탭이 아니다. 브라우저 탭 메뉴와 같다.
// 항목은 할 일이 없으면(오른쪽에 탭이 없는데 "오른쪽 닫기") 흐리게 두고 빼지 않는다 — 자리가 바뀌면 손이 헷갈린다.
// 마우스 자리에 뜨고, 키보드(메뉴 키, Shift+F10)로 열면 탭 아래에 뜬다. 판이 화면 밖으로 나가면 안으로 당긴다.
import { useEffect, useLayoutEffect, useRef } from "react";
import { SCREEN_MESSAGES as SM } from "@/lib/admin/messages";

export type TabMenuAction = "close" | "closeOthers" | "closeRight" | "closeLeft" | "closeAll";

export type TabMenuState = { key: string; x: number; y: number; can: Record<TabMenuAction, boolean> };

const ITEMS: { action: TabMenuAction; label: string; divide?: boolean }[] = [
  { action: "close", label: SM.tabMenuClose },
  { action: "closeOthers", label: SM.tabMenuCloseOthers, divide: true },
  { action: "closeRight", label: SM.tabMenuCloseRight },
  { action: "closeLeft", label: SM.tabMenuCloseLeft },
  { action: "closeAll", label: SM.tabMenuCloseAll, divide: true },
];

/** 판과 화면 가장자리 사이 여백 */
const EDGE_GAP = 8;

export function TabMenu({ menu, onAction, onClose }: { menu: TabMenuState; onAction: (a: TabMenuAction) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // 화면 밖으로 나가면 안으로 당긴다. 그리기 전에 자리를 잡아야 튀지 않는다
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.left = `${Math.max(EDGE_GAP, Math.min(menu.x, innerWidth - r.width - EDGE_GAP))}px`;
    el.style.top = `${Math.max(EDGE_GAP, Math.min(menu.y, innerHeight - r.height - EDGE_GAP))}px`;
    el.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
  }, [menu]);

  // 바깥 누름(mousedown + touchstart, AGENTS §6), 굴림, 창 크기 바뀜, 창 떠남에 닫는다
  useEffect(() => {
    const onDown = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    const i = list.indexOf(document.activeElement as HTMLElement);
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key];
    if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      onClose();
    } else if (to !== undefined) {
      e.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    }
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={SM.tabMenu}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: menu.x, top: menu.y }}
      className="fixed z-50 min-w-44 animate-scale-in overflow-hidden rounded-[var(--radius-md)] border border-line-strong bg-surface py-1 shadow-2"
    >
      {ITEMS.map((it) => {
        const off = !menu.can[it.action];
        return (
          <div key={it.action}>
            {it.divide && <div role="separator" className="my-1 h-px bg-line" />}
            <button
              type="button"
              role="menuitem"
              aria-disabled={off || undefined}
              tabIndex={-1}
              onClick={() => {
                if (off) return;
                onClose();
                onAction(it.action);
              }}
              className="flex h-8 w-full items-center px-3 text-left text-[12.5px] text-ink outline-none transition-colors duration-fast hover:bg-surface-2 focus-visible:bg-surface-2 aria-disabled:cursor-default aria-disabled:text-dim aria-disabled:hover:bg-transparent"
            >
              {it.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
