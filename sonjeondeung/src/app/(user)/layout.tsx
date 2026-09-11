// 로그인 필수 영역 공통 레이아웃 (§5.1: 사용자 데이터 페이지는 dynamic, 캐시 안 함)
// proxy는 쿠키 유무만 보므로 여기서 세션을 실제 검증한다 — 폐기된 쿠키로 들어오면 에러 화면 대신 로그인으로.
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

const NAV = [
  { href: ROUTES.wishlist, label: "위시리스트" },
  { href: ROUTES.alerts, label: "가격 알림" },
  { href: ROUTES.settings, label: "설정" },
];

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  await requireUserOrRedirect();
  return (
    <div className="space-y-6 animate-fade-in">
      <nav aria-label="내 메뉴" className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1 text-sm">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="press rounded-md px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-amber-300"
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
