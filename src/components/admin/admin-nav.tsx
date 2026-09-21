"use client";

// 관리자 메뉴. 다섯 칸을 한 줄로 늘어놓던 자리를 하는 일로 묶었다.
//
// 묶은 기준은 화면 이름이 아니라 **관리자가 그 자리에서 하는 일**이다.
// 수집은 읽기만 하는 자리(무엇이 돌았나), 검수는 사람이 판정해야 줄이 줄어드는 자리,
// 매장은 바깥에서 들어온 신청을 받는 자리다. 셋은 보는 주기가 서로 다르다.
//
// 지금 어디인지를 표시한다. 앞서는 네 칸이 모두 같은 회색이라 화면을 옮기고도
// 어디 있는지 메뉴로는 알 수 없었고, 그래서 이미 열어 둔 화면을 다시 누르는 일이 생겼다.
//
// 남은 일 수는 **약속(Promise)으로 받아 배지 자리에서만 기다린다.** 회사 검수 수를 뽑는 질의가
// games 전수 훑기(실측 27ms, 왕복까지 두 번)라서, 그 값을 메뉴가 기다리면 관리자가 누르는
// 모든 화면이 그만큼 늦게 뜬다. 메뉴는 먼저 그리고 숫자만 나중에 앉힌다.
import { Suspense, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { cardClass } from "@/components/ui/page";
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
    title: "수집",
    items: [
      { href: ROUTES.admin, label: "대시보드" },
      { href: "/admin/sync-logs", label: "로그" },
    ],
  },
  {
    title: "할 일",
    items: [{ href: ROUTES.adminTasks, label: "판" }],
  },
  {
    title: "검수",
    items: [
      { href: "/admin/companies", label: "회사", pick: (c) => ({ n: c.companies, capped: c.companiesCapped }) },
      { href: ROUTES.adminProducts, label: "상품 매핑", pick: (c) => ({ n: c.products }) },
    ],
  },
  {
    title: "매장",
    items: [{ href: ROUTES.shopsAdmin, label: "입점 심사", pick: (c) => ({ n: c.shops }) }],
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
  return (
    <span className="ml-1.5 rounded-full bg-warn-soft px-1.5 py-px text-[10.5px] font-semibold tabular-nums text-warn">
      {n}
      {capped ? "+" : ""}
    </span>
  );
}

export function AdminNav({ user, counts }: { user: string; counts: Promise<AdminNavCounts | null> }) {
  const pathname = usePathname();

  return (
    <nav aria-label="관리자 메뉴" className={cardClass("flex flex-wrap items-center gap-x-1 gap-y-1.5 p-1.5 text-[12.5px]")}>
      {GROUPS.map((g, gi) => (
        <div key={g.title} className="flex items-center gap-1">
          {/* 묶음 사이 세로선. 첫 묶음 앞에는 두지 않는다 */}
          {gi > 0 && <span aria-hidden className="mx-1 h-4 w-px bg-line" />}
          <span className="px-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-dim">{g.title}</span>
          {g.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press flex items-center rounded-lg px-3 py-1.5 transition-colors",
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
      <span className="ml-auto px-2 text-[11.5px] text-dim">{user}</span>
    </nav>
  );
}
