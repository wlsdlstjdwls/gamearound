"use client";

// 관리자 메뉴 — 넓은 화면은 왼쪽 기둥, 좁은 화면은 가로로 미는 한 줄.
//
// **왜 기둥인가**(2026-09-21 구조 교체): 앞 판은 일곱 칸을 머리 위 한 줄에 늘어놓았다.
// 그 줄은 본문 폭을 그대로 나눠 쓰기 때문에 칸이 늘수록 하나하나가 좁아지고, 늘어난 만큼
// 글자가 작아져 "누를 곳을 찾기 어렵다" 가 됐다. 기둥은 칸이 늘어도 칸 폭이 그대로다 —
// 세로로 한 칸 더 쌓일 뿐이다. 관리자 화면은 앞으로도 칸이 는다(축이 붙을 때마다 검수 자리가 생긴다).
// 구조는 smokespot 관리자 콘솔을 따랐다(넓은 화면 왼쪽 기둥, 묶음 제목, 오른쪽 끝 배지).
//
// 묶은 기준은 화면 이름이 아니라 **관리자가 그 자리에서 하는 일**이다.
// 수집은 읽기만 하는 자리(무엇이 돌았나), 검수는 사람이 판정해야 줄이 줄어드는 자리,
// 매장과 할 일은 각자 혼자 서는 자리다.
//
// **낱말은 ADMIN_NAV 한곳에서만 정한다.** 메뉴에서 본 말과 들어간 화면의 제목이 다르면
// 같은 곳인지 의심하게 된다.
//
// 고른 칸은 **브랜드 보라 면**이다. 앞서 쓰던 --surface-3 은 메뉴가 얹힌 --surface-2 와 한 단
// 차이라 훑어서는 어느 칸이 켜져 있는지 보이지 않았다. 칩과 같은 짝(bg-acc + text-on-ink)이다.
//
// 남은 일 수는 **약속(Promise)으로 받아 배지 자리에서만 기다린다.** 회사 검수 수를 뽑는 질의가
// games 전수 훑기(실측 27ms, 왕복까지 두 번)라서, 그 값을 메뉴가 기다리면 관리자가 누르는
// 모든 화면이 그만큼 늦게 뜬다. 메뉴는 먼저 그리고 숫자만 나중에 앉힌다.
import { Suspense, use, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { panelClass } from "@/components/ui/page";
import { ADMIN_NAV, ADMIN_SOON } from "@/lib/admin/messages";
import { COMING_SOON } from "@/lib/messages/coming-soon";
import { ROUTES } from "@/lib/routes";
import { BoxIcon, BuildingIcon, CheckListIcon, LinkIcon, LogIcon, PulseIcon, StoreIcon } from "@/components/admin/nav-icons";
import { ComingSoon } from "@/components/ui/coming-soon";

export interface AdminNavCounts {
  matches: number;
  products: number;
  shops: number;
  companies: number;
  companiesCapped: boolean;
}

type Pick = { n: number; capped?: boolean };

type Item = {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
  /** 이 칸에 남은 일 수를 뽑는 함수. 없으면 배지를 달지 않는다(읽기 전용 화면) */
  pick?: (c: AdminNavCounts) => Pick;
  /**
   * 아직 열지 않은 칸. 주면 링크가 아니라 사유를 말하는 판을 여는 버튼이 된다.
   * 화면은 그대로 살아 있어 주소로는 열린다 — 막는 건 이 한 줄뿐이다.
   */
  soon?: { lead: string; body: string };
};

/** 묶음 제목이 없는 묶음은 칸 하나짜리다 — 제목이 곧 칸 이름이라 두 번 적지 않는다 */
const GROUPS: Array<{ key: string; title?: string; items: Item[] }> = [
  {
    key: "sync",
    title: ADMIN_NAV.groupSync,
    items: [
      { href: ROUTES.admin, label: ADMIN_NAV.overview, Icon: PulseIcon },
      { href: ROUTES.adminSyncLogs, label: ADMIN_NAV.logs, Icon: LogIcon },
    ],
  },
  {
    key: "review",
    title: ADMIN_NAV.groupReview,
    items: [
      { href: ROUTES.adminMatches, label: ADMIN_NAV.matches, Icon: LinkIcon, pick: (c) => ({ n: c.matches }) },
      {
        href: ROUTES.adminCompanies,
        label: ADMIN_NAV.companies,
        Icon: BuildingIcon,
        pick: (c) => ({ n: c.companies, capped: c.companiesCapped }),
      },
      { href: ROUTES.adminProducts, label: ADMIN_NAV.products, Icon: BoxIcon, soon: ADMIN_SOON.products },
    ],
  },
  {
    key: "etc",
    title: ADMIN_NAV.groupEtc,
    items: [
      { href: ROUTES.shopsAdmin, label: ADMIN_NAV.shops, Icon: StoreIcon, soon: ADMIN_SOON.shops },
      { href: ROUTES.adminTasks, label: ADMIN_NAV.tasks, Icon: CheckListIcon },
    ],
  },
];

const ITEMS = GROUPS.flatMap((g) => g.items);

/**
 * 지금 화면인지. 대시보드(`/admin`)만 정확히 일치로 본다 —
 * 접두사로 보면 하위 화면이 전부 대시보드로 표시돼 표시가 의미를 잃는다.
 */
function isActive(pathname: string, href: string): boolean {
  return href === ROUTES.admin ? pathname === href : pathname.startsWith(href);
}

function Badge({
  counts,
  pick,
  active,
  className,
}: {
  counts: Promise<AdminNavCounts | null>;
  pick: (c: AdminNavCounts) => Pick;
  active: boolean;
  className?: string;
}) {
  const c = use(counts);
  if (!c) return null;
  const { n, capped } = pick(c);
  if (n <= 0) return null;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-px text-[11.5px] font-semibold tabular-nums",
        // 고른 칸은 이미 보라 면이다 — 그 위에 주황 배지를 얹으면 색이 둘 다 소리친다.
        // 같은 면 안에서 한 겹 밝은 자리로만 말한다
        active ? "bg-on-ink/20 text-on-ink" : "bg-warn-soft text-warn",
        className,
      )}
    >
      {n}
      {capped ? "+" : ""}
      {/* 숫자만 있으면 남은 일인지 처리한 일인지 모른다 — 읽는 기계에는 뜻을 붙여 준다 */}
      <span className="sr-only"> {ADMIN_NAV.badgeSuffix}</span>
    </span>
  );
}

/** 칸 하나의 속. 링크든 버튼이든 안은 같아야 한다 — 다르면 둘 중 하나가 슬금슬금 어긋난다 */
function ItemBody({
  item,
  active,
  counts,
  iconSize,
  badgeClassName,
}: {
  item: Item;
  active: boolean;
  counts: Promise<AdminNavCounts | null>;
  iconSize: number;
  badgeClassName?: string;
}) {
  const { Icon } = item;
  return (
    <>
      <Icon size={iconSize} />
      {item.label}
      {item.pick && (
        // 숫자가 늦어도 메뉴는 이미 눌리는 상태여야 한다 — 그래서 배지만 따로 기다린다
        <Suspense fallback={null}>
          <Badge counts={counts} pick={item.pick} active={active} className={badgeClassName} />
        </Suspense>
      )}
      {/* 아직 열지 않은 칸은 그렇게 보여야 한다 — 눌러 보고 알게 하면 매번 같은 실망을 한다 */}
      {item.soon && (
        <span
          className={cn(
            "rounded-full px-1.5 py-px text-[10.5px] font-semibold",
            badgeClassName,
            active ? "bg-on-ink/20 text-on-ink" : "bg-surface-3 text-dim",
          )}
        >
          {COMING_SOON.badge}
        </span>
      )}
    </>
  );
}

export function AdminNav({ user, counts }: { user: string; counts: Promise<AdminNavCounts | null> }) {
  const pathname = usePathname();
  /** 지금 사유를 말하고 있는 칸. 한 번에 하나만 뜬다 */
  const [soon, setSoon] = useState<Item | null>(null);

  /** 링크와 버튼이 같은 모양이어야 한다. 아직 열지 않은 칸만 버튼이고 나머지는 전부 링크다 */
  const itemClass = (active: boolean, wide: boolean) =>
    cn(
      "press flex min-h-[var(--touch-target)] items-center rounded-lg transition-colors",
      wide ? "gap-2.5 px-3 text-[14px]" : "shrink-0 gap-1.5 px-3 text-[13.5px] whitespace-nowrap",
      active ? "bg-acc font-semibold text-on-ink" : cn("font-medium text-mut", wide && "hover:bg-surface-2 hover:text-ink"),
    );

  const render = (item: Item, wide: boolean) => {
    const active = isActive(pathname, item.href);
    const body = (
      <ItemBody item={item} active={active} counts={counts} iconSize={wide ? 18 : 16} badgeClassName={wide ? "ml-auto" : undefined} />
    );
    return item.soon ? (
      <button key={item.href} type="button" onClick={() => setSoon(item)} className={cn(itemClass(active, wide), "w-full text-left")}>
        {body}
      </button>
    ) : (
      <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={itemClass(active, wide)}>
        {body}
      </Link>
    );
  };

  return (
    <>
      {/* 넓은 화면 — 왼쪽 기둥. 본문이 길어도 메뉴는 따라온다 */}
      <aside className="sticky top-[84px] hidden w-[196px] shrink-0 flex-col gap-5 md:flex">
        <div className="px-3">
          <p className="text-[15px] font-bold tracking-[-0.02em] text-ink">{ADMIN_NAV.consoleTitle}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-dim">{user}</p>
        </div>

        <nav aria-label="관리자 메뉴" className="flex flex-col gap-4">
          {GROUPS.map((g) => (
            <div key={g.key} className="flex flex-col gap-0.5">
              {g.title && <p className="px-3 pb-1 text-[11px] font-bold tracking-[0.1em] text-dim-2">{g.title}</p>}
              {g.items.map((item) => render(item, true))}
            </div>
          ))}
        </nav>

        <Link href={ROUTES.home} className="press mt-1 rounded-lg px-3 py-2 text-[12.5px] text-dim transition-colors hover:text-ink">
          {ADMIN_NAV.backToSite}
        </Link>
      </aside>

      {/* 좁은 화면 — 가로로 미는 한 줄. 기둥을 세울 폭이 없고, 관리자 화면을 손에서 보는 일은 드물다.
          묶음 제목은 싣지 않는다(제목까지 세우면 한 줄이 두 배로 길어져 미는 거리가 그만큼 는다) */}
      <nav
        aria-label="관리자 메뉴"
        className={panelClass("-mx-1 flex gap-1 overflow-x-auto px-1 py-1 md:hidden [scrollbar-width:none]")}
      >
        {ITEMS.map((item) => render(item, false))}
      </nav>

      {/* 판은 메뉴 바깥에 하나만 둔다 — 칸마다 두면 안 열린 판이 일곱 개 떠 있게 된다 */}
      <ComingSoon
        title={soon?.label ?? ""}
        lead={soon?.soon?.lead ?? ""}
        body={soon?.soon?.body ?? ""}
        open={soon !== null}
        onOpenChange={(v) => !v && setSoon(null)}
      />
    </>
  );
}
