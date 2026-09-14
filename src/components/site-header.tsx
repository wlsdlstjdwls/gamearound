import { Suspense } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { AuthNav } from "@/components/auth/auth-nav";
import { BrandLockup } from "@/components/ui/logo";
import { SearchBox, SearchBoxFallback } from "@/components/search-box";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[var(--page-w)] flex-wrap items-center gap-x-4 gap-y-3 px-7 py-4">
        <Link href={ROUTES.home} className="press shrink-0 text-ink">
          <BrandLockup />
        </Link>

        {/* useSearchParams 를 쓰는 검색창은 Suspense 경계 안에 둔다 —
            없으면 정적으로 뽑히는 화면(/_not-found 등)이 프리렌더 단계에서 실패한다 */}
        <Suspense fallback={<SearchBoxFallback />}>
          <SearchBox />
        </Suspense>

        <nav aria-label="주요 메뉴" className="ml-auto flex shrink-0 items-center gap-1 text-[13px]">
          <Link href={ROUTES.game} className="press rounded-lg px-3 py-[7px] text-mut transition-colors hover:text-ink">
            게임 목록
          </Link>
          <Link href={ROUTES.wishlist} className="press hidden rounded-lg px-3 py-[7px] text-mut transition-colors hover:text-ink sm:block">
            위시리스트
          </Link>
          <Link href={ROUTES.alerts} className="press hidden rounded-lg px-3 py-[7px] text-mut transition-colors hover:text-ink sm:block">
            알림
          </Link>
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
