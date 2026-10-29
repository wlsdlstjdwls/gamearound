"use client";
// 머리띠 사용자 메뉴의 열고 닫기, 키보드 이동 — 로그인 전 메뉴(auth-nav)와 로그인 후 메뉴(user-menu)가 같이 쓴다.
// 바깥 클릭(mousedown + touchstart), Esc, Tab 으로 닫히고 위아래 화살표, Home, End 로 항목을 옮긴다.
// Esc 로 닫으면 포커스를 단추로 돌려 키보드 사용자가 자리를 잃지 않게 한다. Tab 은 다음 칸으로 가려는 뜻이라 돌려놓지 않는다.
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

const ITEM_SELECTOR = '[role="menuitem"]';

export function useDropdownMenu() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((focusBack = true) => {
    setOpen(false);
    if (focusBack) btnRef.current?.focus();
  }, []);

  // 바깥 클릭 — 터치 기기는 mousedown 이 늦게 오므로 touchstart 도 함께
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // 열리면 첫 항목으로 포커스
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus();
  }, [open]);

  const onMenuKey = (e: KeyboardEvent) => {
    const list = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    const idx = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); list[(idx + 1) % list.length]?.focus(); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); list[(idx - 1 + list.length) % list.length]?.focus(); return; }
    if (e.key === "Home") { e.preventDefault(); list[0]?.focus(); return; }
    if (e.key === "End") { e.preventDefault(); list[list.length - 1]?.focus(); }
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
    }
  };

  return {
    open,
    close,
    wrapRef,
    menuRef,
    buttonProps: {
      ref: btnRef,
      type: "button" as const,
      onClick: () => setOpen((v) => !v),
      onKeyDown: onButtonKey,
      "aria-haspopup": "menu" as const,
      "aria-expanded": open,
      "aria-controls": open ? id : undefined,
    },
    menuProps: { ref: menuRef, id, role: "menu", onKeyDown: onMenuKey },
  };
}

/** 메뉴 판과 항목의 모양 — 두 메뉴가 같은 판으로 읽혀야 로그인 전후가 한 메뉴로 이어진다 */
const MENU_PANEL_BASE = "absolute z-50 w-60 animate-scale-in overflow-hidden rounded-[var(--radius-md)] border border-line-strong bg-surface";
export const MENU_PANEL_CLASS = `${MENU_PANEL_BASE} right-0 top-[calc(100%+8px)] origin-top-right`;
/**
 * 메뉴 단추가 어디 서 있나. "rail" 은 관리자 왼쪽 기둥 바닥이다(2026-10-29 머리띠를 걷고 그 기능을 기둥에 옮겼다) —
 * 화면 왼쪽 끝, 바닥에서 열리니 판이 오른쪽 위로 펴져야 화면 안에 든다
 */
export type MenuPlacement = "header" | "rail";
export const MENU_PANEL_RAIL_CLASS = `${MENU_PANEL_BASE} left-0 bottom-[calc(100%+8px)] origin-bottom-left`;
export const MENU_ITEM_CLASS =
  "flex min-h-[var(--touch-target)] items-center px-4 text-[13px] text-mut outline-none transition-colors hover:bg-surface-2 hover:text-ink focus-visible:bg-surface-2 focus-visible:text-ink";
