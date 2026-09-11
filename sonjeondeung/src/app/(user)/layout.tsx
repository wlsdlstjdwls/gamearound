// 로그인 필수 영역 공통 레이아웃 (§5.1: 사용자 데이터 페이지는 dynamic, 캐시 안 함)
import Link from "next/link";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/wishlist", label: "위시리스트" },
  { href: "/alerts", label: "가격 알림" },
  { href: "/settings", label: "설정" },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <nav aria-label="내 메뉴" className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1 text-sm">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-md px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-amber-300"
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
