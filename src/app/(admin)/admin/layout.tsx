// 관리자 영역 공통 레이아웃. proxy 가드만 믿지 않고 여기서도 role 검사(§6). 페이지는 requireRoleOrForbid(), Server Action은 requireAdmin()으로 각각 재검증.
import Link from "next/link";
import { Page } from "@/components/ui/page";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { cardClass } from "@/components/ui/page";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "동기화 대시보드" },
  { href: "/admin/sync-logs", label: "동기화 로그" },
  { href: "/admin/companies", label: "회사 검수" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoleOrForbid("admin");

  return (
    <Page gap={22}>
      <nav aria-label="관리자 메뉴" className={cardClass("flex flex-wrap items-center gap-1 p-1.5 text-[12.5px]")}>
        <span className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-dim">Admin</span>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="press rounded-lg px-3 py-1.5 text-mut transition-colors hover:bg-surface-2 hover:text-ink">
            {n.label}
          </Link>
        ))}
        <span className="ml-auto px-2 text-[11.5px] text-dim">{user.displayName ?? user.email}</span>
      </nav>
      {children}
    </Page>
  );
}
