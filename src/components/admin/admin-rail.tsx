"use client";
// 관리자 넓은 화면 왼쪽 기둥(2026-10-29, 사용자 "왼쪽 메뉴 아예 왼쪽에 붙이고 접었다 펼칠 수 있게, 공간 활용 좀 하자").
//
// 앞 판은 가운데 1440 폭 안에 떠 있는 흰 카드였다 — 넓은 화면에서 좌우 여백과 카드 둘레가 표 폭을 먹었다. 이제 화면 왼쪽 끝에
// 붙은 세로 띠이고 본문은 남은 폭을 다 쓴다. 접으면 그림만 남는 좁은 띠가 된다(이름은 손을 올리면 말풍선, 낭독기는 aria-label).
// 접힘은 쿠키에 둔다 — 서버 레이아웃이 첫 그림부터 같은 폭으로 그려야 펼쳤다 접히는 깜빡임이 없다(localStorage 는 첫 그림 뒤에야 읽힌다).
// 좁은 화면은 이 기둥이 서지 않는다(바닥 띠와 더보기 시트, admin-nav).
//
// 같은 날 둘째 손질(사용자 "접는 단추를 위로, 맨 위 프로필은 필요 없다, 관리자에선 상단 헤더도 필요 없으니 왼쪽 메뉴에 녹여라"):
//  - 넓은 화면에서는 사이트 머리띠를 걷는다(globals.css 의 `body:has([data-admin-rail])`). 기둥 맨 위는 로고(서비스 홈)와 접기 단추다.
//  - 머리띠가 하던 일 넷(테마, 찜, 알림, 계정)은 기둥 바닥 한 줄로 옮긴다. 검색칸과 서비스 메뉴 넷은 옮기지 않는다 —
//    관리자 화면에서 게임을 찾을 일은 각 화면의 검색이 맡고, 서비스로 나가는 길은 로고와 "서비스 화면으로" 가 있다.
//  - 묶음 제목을 누르면 그 묶음이 접힌다(쿠키 admin_groups). 지금 보는 칸은 묶음이 접혀 있어도 남긴다 — 내가 어디 있는지는 늘 보여야 한다.
import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, GROUPS, isActive, ItemBody, type AdminNavCounts, type Item } from "@/components/admin/admin-nav-items";
import { AuthNav } from "@/components/auth/auth-nav";
import { HeaderWishLink } from "@/components/header-wish-link";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeSwitch } from "@/components/theme-switch";
import { PanelLeftIcon } from "@/components/admin/nav-icons";
import { ChevronDownIcon } from "@/components/ui/icons";
import { BrandLockup, BrandSymbol } from "@/components/ui/logo";
import { useTooltip } from "@/components/ui/tooltip";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { ADMIN_GROUPS_COOKIE, ADMIN_RAIL_COOKIE, ADMIN_RAIL_COOKIE_MAX_AGE } from "@/lib/admin/rail";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ADMIN_RAIL_COOKIE_MAX_AGE}; samesite=lax`;
}

/** 접힌 칸 하나 — 그림과 점 배지. 이름은 말풍선과 aria-label 이 맡는다 */
function CollapsedItem({ item, active, counts, onSoon }: { item: Item; active: boolean; counts: Promise<AdminNavCounts | null>; onSoon: (item: Item) => void }) {
  const { triggerProps, tooltip } = useTooltip<HTMLAnchorElement & HTMLButtonElement>(item.label, true);
  const { Icon } = item;
  const cls = cn(
    "press relative mx-auto flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
    active ? "bg-acc text-on-ink" : "text-mut hover:bg-surface-2 hover:text-ink",
  );
  const inner = (
    <>
      <Icon size={18} />
      {item.pick && (
        <Suspense fallback={null}>
          <Badge counts={counts} pick={item.pick} active={active} dot className="absolute right-1.5 top-1.5" />
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

export function AdminRail({
  counts,
  initialCollapsed,
  initialOpened,
  onSoon,
}: {
  counts: Promise<AdminNavCounts | null>;
  initialCollapsed: boolean;
  /** 펼쳐 둔 묶음 열쇠(쿠키, 레이아웃이 읽는다). 적히지 않은 묶음은 접혀 있다(lib/admin/rail 주석) */
  initialOpened: string[];
  onSoon: (item: Item) => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set(initialOpened));
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    writeCookie(ADMIN_RAIL_COOKIE, next ? "1" : "0");
  };
  const toggleGroup = (key: string) => {
    const next = new Set(opened);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpened(next);
    writeCookie(ADMIN_GROUPS_COOKIE, [...next].join(","));
  };
  const itemClass = (active: boolean) =>
    cn(
      // 마우스 화면에서는 36px 칸이다(2026-10-28 컴팩트 회차)
      "press flex min-h-[var(--touch-target)] items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors [@media(pointer:fine)]:min-h-9",
      active ? "bg-acc font-semibold text-on-ink" : "font-medium text-mut hover:bg-surface-2 hover:text-ink",
    );

  return (
    <aside
      data-admin-rail
      data-collapsed={collapsed || undefined}
      className={cn(
        "sticky top-0 z-30 hidden h-svh shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-base md:flex",
        collapsed ? "w-[64px]" : "w-[220px]",
      )}
    >
      {/* 맨 위: 로고(서비스 홈)와 접기 단추. 접으면 둘이 위아래로 선다 */}
      <div className={cn("flex shrink-0 gap-1 pb-2 pt-3", collapsed ? "flex-col items-center px-1.5" : "items-center justify-between pl-4 pr-2")}>
        <Link href={ROUTES.home} aria-label={`${SITE.name} ${ADMIN_NAV.backToSite}`} className="press tap inline-flex items-center gap-2 text-ink">
          {collapsed ? <BrandSymbol /> : <BrandLockup />}
        </Link>
        {/* 접기 단추는 smokespot 데스크톱 사이드바와 같은 꼴이다(2026-10-29 사용자) — 평소엔 패널 그림, 손을 올리면 화살표와 아래 말풍선.
            title 속성 말풍선은 늦게 뜨고 모양이 제각각이라 쓰지 않는다. 낭독기는 aria-label 이 읽으니 말풍선은 aria-hidden */}
        <div className="group relative">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? ADMIN_NAV.railExpand : ADMIN_NAV.railCollapse}
            className="press flex size-8 shrink-0 items-center justify-center rounded-lg text-dim transition-colors duration-fast hover:bg-acc-soft hover:text-acc"
          >
            <PanelLeftIcon size={17} arrow={collapsed ? "expand" : "collapse"} arrowClassName="opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100" />
          </button>
          <span
            aria-hidden
            // 접힌 64px 띠에서는 아래 가운데에 세우면 화면 왼쪽 밖으로 잘린다 — 단추 오른쪽에 세운다
            className={cn(
              "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[12px] font-semibold text-on-ink opacity-0 transition-opacity duration-fast group-hover:opacity-100",
              collapsed ? "left-full top-1/2 ml-2 -translate-y-1/2" : "left-1/2 top-full mt-1.5 -translate-x-1/2",
            )}
          >
            {collapsed ? ADMIN_NAV.railExpand : ADMIN_NAV.railCollapse}
          </span>
        </div>
      </div>

      {/* 기둥이 화면보다 길면 기둥 안에서 굴린다 */}
      <nav
        aria-label={ADMIN_NAV.menuTitle}
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-2 [scrollbar-color:var(--line)_transparent] [scrollbar-width:thin]",
          collapsed ? "gap-2 px-1.5" : "gap-2.5 px-2.5",
        )}
      >
        {GROUPS.map((g) => {
          if (collapsed) {
            return (
              <div key={g.key} className="flex flex-col gap-1 border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
                {g.items.map((item) => (
                  <CollapsedItem key={item.href} item={item} active={isActive(pathname, item.href)} counts={counts} onSoon={onSoon} />
                ))}
              </div>
            );
          }
          // 제목 없는 묶음(업무 현황 한 칸)은 접을 단추가 없으니 늘 펼친다
          const isFolded = Boolean(g.title) && !opened.has(g.key);
          const groupId = `admin-group-${g.key}`;
          // 접힌 묶음에서도 지금 보는 칸은 남긴다(머리 주석)
          const shown = isFolded ? g.items.filter((item) => isActive(pathname, item.href)) : g.items;
          return (
            <div key={g.key} className="flex flex-col gap-px">
              {g.title && (
                <button
                  type="button"
                  onClick={() => toggleGroup(g.key)}
                  aria-expanded={!isFolded}
                  aria-controls={groupId}
                  aria-label={isFolded ? ADMIN_NAV.groupUnfold(g.title) : ADMIN_NAV.groupFold(g.title)}
                  className="press group flex h-7 items-center justify-between rounded-md px-2.5 text-[11px] font-bold tracking-[0.1em] text-dim-2 transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  {g.title}
                  <ChevronDownIcon size={14} className={cn("transition-transform duration-base", isFolded && "-rotate-90")} />
                </button>
              )}
              <div id={groupId} className="flex flex-col gap-px">
                {shown.map((item) => {
                  const active = isActive(pathname, item.href);
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
            </div>
          );
        })}
      </nav>

      {/* 바닥: 머리띠에서 옮겨 온 내 자리(테마, 찜, 알림, 계정). 판은 오른쪽 위로 펴진다(placement "rail") */}
      <div className={cn("flex shrink-0 border-t border-line py-2", collapsed ? "flex-col items-center gap-1 px-1.5" : "items-center justify-between gap-1 px-2.5")}>
        <div className={cn("flex items-center gap-0.5", collapsed && "flex-col")}>
          <ThemeSwitch className="sm:size-9" />
          <HeaderWishLink className="sm:size-9" />
          <NotificationBell placement="rail" />
        </div>
        {/* 이름은 빼고 아바타만 — 220 폭에 단추 셋과 이름 알약이 같이 서면 기둥 밖으로 넘쳤다. 이름은 펼친 판 머리에 있다 */}
        <AuthNav placement="rail" compact />
      </div>
    </aside>
  );
}
