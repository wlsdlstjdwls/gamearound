"use client";
// 관리자 메뉴의 "전체 메뉴 | 즐겨찾기" 탭(2026-11-04, 사용자 "즐겨찾기 메뉴랑 본 메뉴랑 동시에 보이니까 헷갈린다").
// 기둥(admin-rail)과 휴대폰 더보기 시트(admin-nav)가 같이 쓴다. 고른 쪽은 쿠키에 남긴다(lib/admin/rail 의 ADMIN_MENU_VIEW_COOKIE).
//
// 패널을 role=tabpanel 로 감싸지 않는 이유: 두 목록이 같은 nav 안에서 갈아 끼워질 뿐이고, 닫힌 쪽을 hidden 으로 들고 있을 까닭이 없다
// (ui/tabs 는 패널 안 접힘 상태를 지키려고 남겨 둔다). 그래서 탭 꼴의 aria-pressed 토글 둘로 세운다 — 낭독기는 "눌림" 으로 읽는다.
// 접힌 64px 기둥에서는 글자가 들어가지 않으니 그림 둘이 위아래로 선다(이름은 말풍선).
import { useState } from "react";
import { StarIcon } from "@/components/admin/nav-icons";
import { MenuIcon } from "@/components/ui/icons";
import { useTooltip } from "@/components/ui/tooltip";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { ADMIN_MENU_VIEW_COOKIE, ADMIN_RAIL_COOKIE_MAX_AGE, type AdminMenuView } from "@/lib/admin/rail";
import { cn } from "@/lib/cn";

/** 고른 목록. 누른 순간 바꾸고 쿠키는 뒤에 쓴다(서버 왕복 없음) */
export function useMenuView(initial: AdminMenuView): [AdminMenuView, (v: AdminMenuView) => void] {
  const [view, setView] = useState(initial);
  const change = (v: AdminMenuView) => {
    setView(v);
    document.cookie = `${ADMIN_MENU_VIEW_COOKIE}=${v}; path=/; max-age=${ADMIN_RAIL_COOKIE_MAX_AGE}; samesite=lax`;
  };
  return [view, change];
}

const TABS: { key: AdminMenuView; label: string; Icon: typeof MenuIcon }[] = [
  { key: "all", label: ADMIN_NAV.viewAll, Icon: MenuIcon },
  { key: "favorites", label: ADMIN_NAV.groupFavorites, Icon: (p) => <StarIcon {...p} filled /> },
];

function IconTab({ tab, on, onPick }: { tab: (typeof TABS)[number]; on: boolean; onPick: () => void }) {
  const { triggerProps, tooltip } = useTooltip<HTMLButtonElement>(tab.label, true);
  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={tab.label}
        onClick={onPick}
        className={cn(
          "press mx-auto flex size-9 items-center justify-center rounded-md transition-colors duration-fast",
          on ? "bg-surface text-acc shadow-hair" : "text-dim hover:text-ink",
        )}
        {...triggerProps}
      >
        <tab.Icon size={16} />
      </button>
      {tooltip}
    </>
  );
}

export function MenuViewTabs({ view, onChange, collapsed = false }: { view: AdminMenuView; onChange: (v: AdminMenuView) => void; collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div role="group" aria-label={ADMIN_NAV.menuView} className="flex flex-col gap-0.5 rounded-lg bg-surface-2 p-0.5">
        {TABS.map((t) => (
          <IconTab key={t.key} tab={t} on={view === t.key} onPick={() => onChange(t.key)} />
        ))}
      </div>
    );
  }
  return (
    <div role="group" aria-label={ADMIN_NAV.menuView} className="grid grid-cols-2 gap-0.5 rounded-lg bg-surface-2 p-0.5">
      {TABS.map((t) => {
        const on = view === t.key;
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(t.key)}
            className={cn(
              "press flex min-h-[var(--touch-target)] items-center justify-center gap-1.5 rounded-md text-[13px] transition-colors duration-fast [@media(pointer:fine)]:min-h-8",
              on ? "bg-surface font-bold text-ink shadow-hair" : "font-medium text-mut hover:text-ink",
            )}
          >
            <t.Icon size={14} className={cn("shrink-0", on && t.key === "favorites" && "text-acc")} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** 즐겨찾기 탭이 비었을 때 한 줄 */
export function FavoritesEmpty({ className }: { className?: string }) {
  return <p className={cn("px-2.5 py-3 text-[12.5px] leading-relaxed text-dim", className)}>{ADMIN_NAV.favoritesEmpty}</p>;
}
