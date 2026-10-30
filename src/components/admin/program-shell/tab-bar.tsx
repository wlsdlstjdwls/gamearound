"use client";
// 열린 프로그램 탭 줄의 겉모양. 상태와 동작은 program-shell/index 가 쥔다.
// 백오피스 창 머리처럼 고른 탭만 흰 면으로 판과 이어지고, 저장 안 한 값이 있는 탭은 이름 앞에 점이 선다.
//
// 탭이 줄을 넘치면 브라우저 탭 줄처럼 민다(2026-10-30 사용자 "탭에 스크롤이 생기던데, 휠로 가로 이동"). 스크롤바는 숨긴다 —
// 탭 밑에 막대가 서면 판과 이어져야 할 고른 탭이 떨어져 보인다. 대신 세로 휠을 가로로 돌리고, 고른 탭은 늘 보이게 끌어온다.
import { useEffect, useRef } from "react";
import { ITEMS } from "@/components/admin/admin-nav-items";
import { XIcon } from "@/components/ui/icons";
import { SCREEN_MESSAGES as SM } from "@/lib/admin/messages";
import { cn } from "@/lib/cn";

export type TabView = { key: string; label: string; dirty: boolean; closable: boolean };

export function TabBar({
  tabs,
  active,
  onPick,
  onClose,
  onCloseOthers,
}: {
  tabs: TabView[];
  active: string;
  onPick: (key: string) => void;
  onClose: (key: string) => void;
  onCloseOthers: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

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
      {tabs.filter((t) => t.closable).length > 1 && (
        <button type="button" onClick={onCloseOthers} className="press mb-1 shrink-0 rounded-md px-2 py-1 text-[12px] font-medium text-mut hover:bg-surface-2 hover:text-ink">
          {SM.closeOthers}
        </button>
      )}
    </div>
  );
}
