import { Suspense } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import { AuthNav } from "@/components/auth/auth-nav";
import { BrandLockup } from "@/components/ui/logo";
import { SearchBox, SearchBoxFallback } from "@/components/search-box";
import { SiteMenu } from "@/components/site-menu";
import { SiteNavLink } from "@/components/site-nav-link";
import { BellIcon, HeartIcon } from "@/components/ui/icons";

/**
 * 머리띠 — 좁은 화면은 한 줄(심볼 + 검색칸 + 햄버거), 넓은 화면은 한 줄(락업 + 검색칸 + 펼친 메뉴).
 *
 * 줄바꿈을 아예 없앤 이유(2026-09-15): flex-wrap 으로 흘려보내면 390px 에서 셋이 각자 줄을 차지해
 * 붙어 있는 머리띠가 161px 까지 자랐다. 화면의 5분의 1이 어느 화면에서나 늘 빠지는 값이다.
 * 좁은 화면에서 자리를 만드는 방법은 둘이다 — 워드마크를 접고(심볼만), 메뉴를 시트로 접는다(site-menu).
 * 검색칸을 남은 자리에 두는 이유: 이 서비스에서 가장 자주 하는 일이고, 접으면 한 번 더 눌러야 한다.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[var(--page-w)] items-center gap-2 px-5 py-2.5 sm:gap-4 sm:px-7 sm:py-4">
        {/* 좁은 화면에서는 심볼만 남는다. 글자가 접혀도 링크의 이름은 남아야 하므로 aria-label 로 못 박는다 */}
        {/* tap: 좁은 화면에서는 심볼만 남아 26x32 였다 — 머리띠에서 가장 자주 눌리는 자리인데 손가락보다 작았다 */}
        <Link href={ROUTES.home} aria-label={SITE.name} className="press tap inline-flex shrink-0 items-center text-ink">
          <BrandLockup wordmarkClassName="hidden sm:inline" />
        </Link>

        {/* useSearchParams 를 쓰는 검색창은 Suspense 경계 안에 둔다 —
            없으면 정적으로 뽑히는 화면(/_not-found 등)이 프리렌더 단계에서 실패한다 */}
        <Suspense fallback={<SearchBoxFallback />}>
          <SearchBox />
        </Suspense>

        <nav aria-label="주요 메뉴" className="hidden shrink-0 items-center gap-1 text-[13px] sm:flex">
          <SiteNavLink href={ROUTES.game}>게임 목록</SiteNavLink>
          <SiteNavLink href={ROUTES.sales}>다음 세일</SiteNavLink>
          <SiteNavLink href={ROUTES.wishlist} icon={<HeartIcon size={19} />}>
            위시리스트
          </SiteNavLink>
          <SiteNavLink href={ROUTES.alerts} icon={<BellIcon size={19} />}>
            알림
          </SiteNavLink>
          <AuthNav />
        </nav>

        <SiteMenu />
      </div>
    </header>
  );
}
