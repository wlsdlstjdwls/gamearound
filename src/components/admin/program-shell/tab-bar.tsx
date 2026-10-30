"use client";
// 열린 프로그램 탭 줄의 겉모양. 상태와 동작은 program-shell/index 가 쥔다.
// 백오피스 창 머리처럼 고른 탭만 흰 면으로 판과 이어지고, 저장 안 한 값이 있는 탭은 이름 앞에 점이 선다.
//
// 여러 탭 닫기는 탭 우클릭 메뉴(tab-menu)에 있다. 줄 끝 "다른 화면 닫기" 단추는 걷었다(2026-10-30 사용자, SBO 와 같은 손버릇).
//
// 탭이 줄을 넘치면 브라우저 탭 줄처럼 민다(2026-10-30 사용자 "탭에 스크롤이 생기던데, 휠로 가로 이동"). 스크롤바는 숨긴다 —
// 탭 밑에 막대가 서면 판과 이어져야 할 고른 탭이 떨어져 보인다. 대신 세로 휠을 가로로 돌리고, 고른 탭은 늘 보이게 끌어온다.
import { useCallback, useEffect, useRef, useState } from "react";
import { ITEMS } from "@/components/admin/admin-nav-items";
import { XIcon } from "@/components/ui/icons";
import { SCREEN_MESSAGES as SM } from "@/lib/admin/messages";
import { cn } from "@/lib/cn";
import { TabMenu, type TabMenuAction, type TabMenuState } from "./tab-menu";

export type TabView = { key: string; label: string; dirty: boolean; closable: boolean };

export function TabBar({
  tabs,
  active,
  onPick,
  onClose,
  onCloseMany,
}: {
  tabs: TabView[];
  active: string;
  onPick: (key: string) => void;
  onClose: (key: string) => void;
  /** 여러 탭을 닫는다. 지금 탭이 닫히면 fallback 탭으로 간다 */
  onCloseMany: (keys: string[], fallback: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<TabMenuState | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  // 우클릭한 탭 기준으로 각 항목이 닫을 탭. 첫 탭(홈)은 닫히지 않는다
  const targetsOf = (key: string): Record<TabMenuAction, string[]> => {
    const i = tabs.findIndex((t) => t.key === key);
    const closable = (list: TabView[]) => list.filter((t) => t.closable).map((t) => t.key);
    return {
      close: closable([tabs[i]]),
      closeOthers: closable(tabs.filter((t) => t.key !== key)),
      closeRight: closable(tabs.slice(i + 1)),
      closeLeft: closable(tabs.slice(0, i)),
      closeAll: closable(tabs),
    };
  };
  const openMenu = (e: React.MouseEvent<HTMLElement>, key: string) => {
    e.preventDefault();
    const t = targetsOf(key);
    // 키보드(메뉴 키, Shift+F10)로 열면 좌표가 0 이라 탭 아래에 띄운다
    const r = e.currentTarget.getBoundingClientRect();
    const byKey = e.clientX === 0 && e.clientY === 0;
    setMenu({
      key,
      x: byKey ? r.left : e.clientX,
      y: byKey ? r.bottom : e.clientY,
      can: { close: t.close.length > 0, closeOthers: t.closeOthers.length > 0, closeRight: t.closeRight.length > 0, closeLeft: t.closeLeft.length > 0, closeAll: t.closeAll.length > 0 },
    });
  };
  const onMenuAction = (action: TabMenuAction) => {
    if (!menu) return;
    const keys = targetsOf(menu.key)[action];
    if (action === "close") return onClose(menu.key);
    // 지금 탭이 닫히면 우클릭한 탭으로, 모두 닫기면 첫 탭(홈)으로
    onCloseMany(keys, action === "closeAll" ? tabs[0].key : menu.key);
  };

  // React 의 onWheel 은 passive 라 preventDefault 가 안 먹는다 — 직접 건다. 넘칠 때만 가로로 돌린다(안 넘치면 문서가 평소처럼 구른다)
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onWheel = (e: WheelEvent) => {
      if (list.scrollWidth <= list.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      list.scrollLeft += e.deltaY;
    };
    list.addEventListener("wheel", onWheel, { passive: false });
    return () => list.removeEventListener("wheel", onWheel);
  }, []);

  // 고른 탭이 줄 밖에 있으면 끌어온다(메뉴에서 연 화면, 방향키로 옮긴 탭). scrollIntoView 는 쓰지 않는다 —
  // 문서를 내려 둔 채 탭이 바뀌면 문서까지 탭 줄로 끌어올린다. 줄만 가로로 민다(탭 칸의 offsetParent 는 relative 인 이 줄이다)
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector('[aria-selected="true"]')?.parentElement;
    if (!list || !tab) return;
    if (tab.offsetLeft < list.scrollLeft) list.scrollLeft = tab.offsetLeft;
    else if (tab.offsetLeft + tab.offsetWidth > list.scrollLeft + list.clientWidth) list.scrollLeft = tab.offsetLeft + tab.offsetWidth - list.clientWidth;
  }, [active, tabs.length]);

  return (
    <div data-admin-shell className="hidden min-w-0 items-end gap-2 px-3 md:flex">
      <div
        ref={listRef}
        role="tablist"
        aria-label={SM.tabsLabel}
        // 좌우 화살표로 탭을 옮긴다(AGENTS §6 탭은 키보드 이동)
        onKeyDown={(e) => {
          const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!step) return;
          e.preventDefault();
          const list = e.currentTarget;
          const i = tabs.findIndex((t) => t.key === active);
          const next = tabs[(i + step + tabs.length) % tabs.length];
          onPick(next.key);
          requestAnimationFrame(() => list.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
        }}
        className="relative flex min-w-0 flex-1 items-end gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => {
          const on = t.key === active;
          const Icon = ITEMS.find((i) => i.href === t.key)?.Icon;
          return (
            <div
              key={t.key}
              onContextMenu={(e) => openMenu(e, t.key)}
              // 가운데 단추로 닫기 — 브라우저 탭과 같은 손버릇
              onAuxClick={(e) => {
                if (e.button === 1 && t.closable) {
                  e.preventDefault();
                  onClose(t.key);
                }
              }}
              className={cn(
                "flex h-9 max-w-[200px] shrink-0 items-center rounded-t-lg border border-b-0 text-[12.5px] transition-colors duration-fast",
                on ? "border-line-strong bg-surface font-bold text-ink shadow-[inset_0_2px_0_var(--acc)]" : "border-line bg-surface-2 font-medium text-mut hover:bg-surface hover:text-ink",
              )}
            >
              <button type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => onPick(t.key)} className="press flex h-full min-w-0 items-center gap-1.5 pl-3 pr-2">
                {Icon && <Icon size={14} />}
                {t.dirty && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-acc" />}
                <span className="truncate">{t.label}</span>
                {t.dirty && <span className="sr-only">{SM.tabDirty}</span>}
              </button>
              {t.closable && (
                <button type="button" aria-label={SM.closeTab(t.label)} onClick={() => onClose(t.key)} className="press mr-1 grid size-6 shrink-0 place-items-center rounded-md text-dim hover:bg-surface-2 hover:text-ink">
                  <XIcon size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {menu && <TabMenu menu={menu} onAction={onMenuAction} onClose={closeMenu} />}
    </div>
  );
}
