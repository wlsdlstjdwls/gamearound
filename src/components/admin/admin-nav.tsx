"use client";

// 관리자 메뉴. 다섯 칸을 한 줄로 늘어놓던 자리를 하는 일로 묶었다.
//
// 묶은 기준은 화면 이름이 아니라 **관리자가 그 자리에서 하는 일**이다.
// 수집은 읽기만 하는 자리(무엇이 돌았나), 검수는 사람이 판정해야 줄이 줄어드는 자리,
// 매장은 바깥에서 들어온 신청을 받는 자리다. 셋은 보는 주기가 서로 다르다.
//
// **낱말은 ADMIN_NAV 한곳에서만 정한다.** 메뉴에서 본 말과 들어간 화면의 제목이 다르면
// 같은 곳인지 의심하게 된다 — 앞서 "판" 을 눌러 "할 일 판" 이 뜨던 자리가 그랬다.
// "대시보드", "판", "회사" 처럼 눌러 보기 전에는 무엇을 하는 자리인지 알 수 없는 이름을 버렸다.
//
// 글자는 14px, 칸 높이는 40px 이다. 앞서 12.5px 에 30px 이던 자리는 규약의 터치 타깃(44px)에
// 한참 못 미쳤고, 묶음 제목과 링크가 같은 크기라 어디까지가 제목이고 어디부터 누를 수 있는지
// 눈으로 갈리지 않았다. 제목은 더 작고 흐리게 눌러 **누를 수 없는 말**로 보이게 한다.
//
// 남은 일 수는 **약속(Promise)으로 받아 배지 자리에서만 기다린다.** 회사 검수 수를 뽑는 질의가
// games 전수 훑기(실측 27ms, 왕복까지 두 번)라서, 그 값을 메뉴가 기다리면 관리자가 누르는
// 모든 화면이 그만큼 늦게 뜬다. 메뉴는 먼저 그리고 숫자만 나중에 앉힌다.
import { Suspense, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { cardClass } from "@/components/ui/page";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";

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
  /** 이 칸에 남은 일 수를 뽑는 함수. 없으면 배지를 달지 않는다(읽기 전용 화면) */
  pick?: (c: AdminNavCounts) => Pick;
};

const GROUPS: Array<{ title: string; items: Item[] }> = [
  {
    title: ADMIN_NAV.groupSync,
    items: [
      { href: ROUTES.admin, label: ADMIN_NAV.overview },
      { href: ROUTES.adminSyncLogs, label: ADMIN_NAV.logs },
    ],
  },
  {
    title: ADMIN_NAV.groupReview,
    items: [
      { href: ROUTES.adminMatches, label: ADMIN_NAV.matches, pick: (c) => ({ n: c.matches }) },
      { href: ROUTES.adminCompanies, label: ADMIN_NAV.companies, pick: (c) => ({ n: c.companies, capped: c.companiesCapped }) },
      { href: ROUTES.adminProducts, label: ADMIN_NAV.products, pick: (c) => ({ n: c.products }) },
    ],
  },
  {
    title: ADMIN_NAV.groupShops,
    items: [{ href: ROUTES.shopsAdmin, label: ADMIN_NAV.shops, pick: (c) => ({ n: c.shops }) }],
  },
  {
    title: ADMIN_NAV.groupTasks,
    items: [{ href: ROUTES.adminTasks, label: ADMIN_NAV.tasks }],
  },
];

/**
 * 지금 화면인지. 대시보드(`/admin`)만 정확히 일치로 본다 —
 * 접두사로 보면 하위 화면이 전부 대시보드로 표시돼 표시가 의미를 잃는다.
 */
function isActive(pathname: string, href: string): boolean {
  return href === ROUTES.admin ? pathname === href : pathname.startsWith(href);
}

function Badge({ counts, pick }: { counts: Promise<AdminNavCounts | null>; pick: (c: AdminNavCounts) => Pick }) {
  const c = use(counts);
  if (!c) return null;
  const { n, capped } = pick(c);
  if (n <= 0) return null;
  const text = `${n}${capped ? "+" : ""}`;
  return (
    <span className="ml-2 rounded-full bg-warn-soft px-2 py-px text-[11.5px] font-semibold tabular-nums text-warn">
      {text}
      {/* 숫자만 있으면 남은 일인지 처리한 일인지 모른다 — 읽는 기계에는 뜻을 붙여 준다 */}
      <span className="sr-only"> {ADMIN_NAV.badgeSuffix}</span>
    </span>
  );
}

export function AdminNav({ user, counts }: { user: string; counts: Promise<AdminNavCounts | null> }) {
  const pathname = usePathname();

  return (
    <nav aria-label="관리자 메뉴" className={cardClass("flex flex-wrap items-center gap-x-1 gap-y-1 p-2 text-sm")}>
      {GROUPS.map((g, gi) => (
        <div key={g.title} className="flex items-center gap-1">
          {/* 묶음 사이 세로선. 첫 묶음 앞에는 두지 않는다 */}
          {gi > 0 && <span aria-hidden className="mx-1.5 h-5 w-px bg-line" />}
          <span className="px-1.5 text-[11px] font-semibold tracking-[0.08em] text-dim-2">{g.title}</span>
          {g.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press flex min-h-[40px] items-center rounded-lg px-3 transition-colors",
                  active ? "bg-surface-3 font-semibold text-ink" : "text-mut hover:bg-surface-2 hover:text-ink",
                )}
              >
                {item.label}
                {item.pick && (
                  // 숫자가 늦어도 메뉴는 이미 눌리는 상태여야 한다 — 그래서 배지만 따로 기다린다
                  <Suspense fallback={null}>
                    <Badge counts={counts} pick={item.pick} />
                  </Suspense>
                )}
              </Link>
            );
          })}
        </div>
      ))}
      <span className="ml-auto px-2 text-[12px] text-dim">{user}</span>
    </nav>
  );
}
