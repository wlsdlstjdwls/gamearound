// 관리자 영역 공통 레이아웃. proxy 가드만 믿지 않고 여기서도 role 검사(§6). 페이지는 requireRoleOrForbid(), Server Action은 requireAdmin()으로 각각 재검증.
import Link from "next/link";
import { requireRoleOrForbid } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "동기화 대시보드" },
  { href: "/admin/sync-logs", label: "동기화 로그" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoleOrForbid("admin");

  return (
    <div className="space-y-6">
      <nav aria-label="관리자 메뉴" className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-slate-900/60 p-1 text-sm">
        <span className="px-2 text-xs font-semibold uppercase tracking-wide text-amber-300">Admin</span>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-amber-300">
            {n.label}
          </Link>
        ))}
        <span className="ml-auto px-2 text-xs text-slate-500">{user.displayName ?? user.email}</span>
      </nav>
      {children}
    </div>
  );
}
