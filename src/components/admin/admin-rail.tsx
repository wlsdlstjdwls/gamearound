"use client";
// 관리자 넓은 화면 왼쪽 기둥(2026-10-29, 사용자 "왼쪽 메뉴 아예 왼쪽에 붙이고 접었다 펼칠 수 있게, 공간 활용 좀 하자").
//
// 앞 판은 가운데 1440 폭 안에 떠 있는 흰 카드였다 — 넓은 화면에서 좌우 여백과 카드 둘레가 표 폭을 먹었다. 이제 화면 왼쪽 끝,
// 머리띠 바로 아래에 붙은 세로 띠이고 본문은 남은 폭을 다 쓴다. 접으면 그림만 남는 좁은 띠가 된다(이름은 손을 올리면 말풍선, 낭독기는 aria-label).
// 접힘은 쿠키에 둔다 — 서버 레이아웃이 첫 그림부터 같은 폭으로 그려야 펼쳤다 접히는 깜빡임이 없다(localStorage 는 첫 그림 뒤에야 읽힌다).
// 좁은 화면은 이 기둥이 서지 않는다(바닥 띠와 더보기 시트, admin-nav).
import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, GROUPS, isActive, ItemBody, type AdminNavCounts, type Item } from "@/components/admin/admin-nav-items";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { useTooltip } from "@/components/ui/tooltip";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { ADMIN_RAIL_COOKIE, ADMIN_RAIL_COOKIE_MAX_AGE } from "@/lib/admin/rail";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";

/** 접힌 칸 하나 — 그림과 배지 점. 이름은 말풍선과 aria-label 이 맡는다 */
function CollapsedItem({ item, active, counts, onSoon }: { item: Item; active: boolean; counts: Promise<AdminNavCounts | null>; onSoon: (item: Item) => void }) {
  const { triggerProps, tooltip } = useTooltip<HTMLAnchorElement & HTMLButtonElement>(item.label, true);
  const { Icon } = item;
  const cls = cn(
    "press relative mx-auto flex size-10 items-center justify-center rounded-lg transition-colors",
    active ? "bg-acc text-on-ink" : "text-mut hover:bg-surface-2 hover:text-ink",
  );
  const inner = (
    <>
      <Icon size={18} />
      {item.pick && (
        <Suspense fallback={null}>
          <Badge counts={counts} pick={item.pick} active={active} className="absolute -right-1 -top-1 px-1 text-[10px]" />
        </Suspense>
      )}
    </>
  );
  return (
    <>
      {item.soon ? (
        <button type="button" aria-label={item.label} onClick={() => onSoon(item)} className={cls} {...triggerProps}>
          {inner}
        </button>
      ) : (
        <Link href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined} className={cls} {...triggerProps}>
          {inner}
        </Link>
      )}
      {tooltip}
    </>
  );
}

export function AdminRail({ user, counts, initialCollapsed, onSoon }: { user: string; counts: Promise<AdminNavCounts | null>; initialCollapsed: boolean; onSoon: (item: Item) => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${ADMIN_RAIL_COOKIE}=${next ? "1" : "0"}; path=/; max-age=${ADMIN_RAIL_COOKIE_MAX_AGE}; samesite=lax`;
  };
  const itemClass = (active: boolean) =>
    cn(
      // 마우스 화면에서는 36px 칸이다(2026-10-28 컴팩트 회차)
      "press flex min-h-[var(--touch-target)] items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors [@media(pointer:fine)]:min-h-9",
      active ? "bg-acc font-semibold text-on-ink" : "font-medium text-mut hover:bg-surface-2 hover:text-ink",
    );

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "sticky top-[var(--header-h)] hidden h-[calc(100svh-var(--header-h))] shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-base md:flex",
        collapsed ? "w-[64px]" : "w-[216px]",
      )}
    >
      <div className={cn("flex items-center gap-2.5 pb-2 pt-4", collapsed ? "justify-center px-2" : "px-4")}>
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-acc text-[13px] font-bold text-on-ink">
          {user.slice(0, 1)}
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold leading-tight text-ink">{ADMIN_NAV.consoleTitle}</p>
            <p className="truncate text-[11.5px] leading-tight text-dim">{user}</p>
          </div>
        )}
      </div>

      {/* 기둥이 화면보다 길면 기둥 안에서 굴린다 */}
      <nav aria-label={ADMIN_NAV.menuTitle} className={cn("flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain py-2 [scrollbar-color:var(--line)_transparent] [scrollbar-width:thin]", collapsed ? "px-1.5" : "px-2.5")}>
        {GROUPS.map((g) => (
          <div key={g.key} className={cn("flex flex-col", collapsed ? "gap-1 border-t border-line-soft pt-3 first:border-t-0 first:pt-0" : "gap-px")}>
            {g.title && !collapsed && <p className="px-2.5 pb-1 text-[11px] font-bold tracking-[0.1em] text-dim-2">{g.title}</p>}
            {g.items.map((item) => {
              const active = isActive(pathname, item.href);
              if (collapsed) return <CollapsedItem key={item.href} item={item} active={active} counts={counts} onSoon={onSoon} />;
              const body = <ItemBody item={item} active={active} counts={counts} iconSize={16} badgeClassName="ml-auto" />;
              return item.soon ? (
                <button key={item.href} type="button" onClick={() => onSoon(item)} className={cn(itemClass(active), "w-full text-left")}>
                  {body}
                </button>
              ) : (
                <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={itemClass(active)}>
                  {body}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={cn("flex flex-col gap-1 border-t border-line py-2", collapsed ? "items-center px-1.5" : "px-2.5")}>
        {!collapsed && (
          <Link href={ROUTES.home} className="press tap flex items-center rounded-lg px-2.5 text-[12.5px] text-dim transition-colors hover:text-ink">
            {ADMIN_NAV.backToSite}
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? ADMIN_NAV.railExpand : ADMIN_NAV.railCollapse}
          className={cn("press tap flex items-center gap-2 rounded-lg text-[12.5px] text-dim transition-colors hover:bg-surface-2 hover:text-ink", collapsed ? "size-10 justify-center" : "px-2.5")}
        >
          <ChevronLeftIcon size={16} className={cn("shrink-0 transition-transform duration-base", collapsed && "rotate-180")} />
          {!collapsed && ADMIN_NAV.railCollapse}
        </button>
      </div>
    </aside>
  );
}
