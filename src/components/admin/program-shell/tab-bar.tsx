"use client";
// 열린 프로그램 탭 줄의 겉모양. 상태와 동작은 program-shell/index 가 쥔다.
// 백오피스 창 머리처럼 고른 탭만 흰 면으로 판과 이어지고, 저장 안 한 값이 있는 탭은 이름 앞에 점이 선다.
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
  return (
    <div data-admin-shell className="hidden min-w-0 items-end gap-2 px-3 md:flex">
      <div
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
        className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto overflow-y-hidden"
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
