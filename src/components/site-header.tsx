import { Suspense } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import { AuthNav } from "@/components/auth/auth-nav";
import { BrandLockup } from "@/components/ui/logo";
import { SearchBox, SearchBoxFallback } from "@/components/search-box";
import { SiteMenu } from "@/components/site-menu";
import { SiteNavLink } from "@/components/site-nav-link";
import { INDIE_MESSAGES } from "@/lib/indie/messages";
import { BellIcon } from "@/components/ui/icons";

/**
 * 머리띠 — 좁은 화면은 한 줄(심볼 + 검색칸 + 햄버거), 넓은 화면은 한 줄
 * (락업 + 글자 메뉴 | 검색칸 + 개인 자리). 리디자인에서 가르는 기준이 바뀌었다:
 * 왼쪽은 "무엇을 보러 가나"(목록, 출시 예정), 오른쪽은 "내 것"(검색, 알림, 계정)이다.
 *
 * 줄바꿈을 아예 없앤 이유(2026-09-15): flex-wrap 으로 흘려보내면 390px 에서 셋이 각자 줄을 차지해
 * 붙어 있는 머리띠가 161px 까지 자랐다. 화면의 5분의 1이 어느 화면에서나 늘 빠지는 값이다.
 * 좁은 화면에서 자리를 만드는 방법은 둘이다 — 워드마크를 접고(심볼만), 메뉴를 시트로 접는다(site-menu).
 * 검색칸을 남은 자리에 두는 이유: 이 서비스에서 가장 자주 하는 일이고, 접으면 한 번 더 눌러야 한다.
 */
export function SiteHeader() {
  return (
    // 테두리도 흰 판도 없다(2026-09-21 리디자인) — 머리띠는 본문과 같은 바탕에 얹힌 채 따라온다.
    // 선을 지운 자리는 아래 본문의 첫 헤어라인이 대신 받는다. 판이 남아 있으면 스크롤할 때
    // 본문이 흰 띠 밑으로 들어가는 것이 보여, 화면이 두 겹으로 읽힌다.
    // 바탕이 흰색이 된 뒤(2026-09-29 커머스 정보형) 아래 헤어라인 한 줄을 되돌렸다 — 흰 머리띠가 흰 본문 위를
    // 지나갈 때 경계가 없으면 스크롤한 글자가 머리띠 밑으로 사라지는 게 아니라 잘려 보인다
    <header className="sticky top-0 z-40 border-b border-line-soft bg-bg">
      <div className="mx-auto flex w-full max-w-[var(--page-w)] items-center gap-2 px-5 py-2.5 sm:gap-7 sm:px-6 sm:py-3.5">
        {/* 좁은 화면에서는 심볼만 남는다. 글자가 접혀도 링크의 이름은 남아야 하므로 aria-label 로 못 박는다 */}
        {/* tap: 좁은 화면에서는 심볼만 남아 26x32 였다 — 머리띠에서 가장 자주 눌리는 자리인데 손가락보다 작았다 */}
        <Link href={ROUTES.home} aria-label={SITE.name} className="press tap inline-flex shrink-0 items-center text-ink">
          <BrandLockup wordmarkClassName="hidden sm:inline" />
        </Link>

        {/* 글자 메뉴는 로고 바로 옆에 붙는다 — 둘이 한 덩어리로 "이 서비스와 그 안의 갈래" 를 말하고,
            검색칸과 개인 자리(알림, 계정)는 반대쪽 끝으로 민다 */}
        <nav aria-label="주요 메뉴" className="hidden shrink-0 items-center gap-1 text-[15px] font-semibold sm:flex">
          <SiteNavLink href={ROUTES.game}>게임 목록</SiteNavLink>
          <SiteNavLink href={ROUTES.upcoming}>출시 예정</SiteNavLink>
          <SiteNavLink href={ROUTES.indie}>{INDIE_MESSAGES.navLabel}</SiteNavLink>
          {/* "다음 세일" 은 메뉴에서 숨겼다(2026-09-21, 사용자 결정). 화면(/sales)과 자료는 그대로라
              주소로는 열린다 — 되살릴 때는 이 줄과 site-menu 의 LINKS 한 줄을 같이 되돌린다 */}
        </nav>

        {/* useSearchParams 를 쓰는 검색창은 Suspense 경계 안에 둔다 —
            없으면 정적으로 뽑히는 화면(/_not-found 등)이 프리렌더 단계에서 실패한다 */}
        <Suspense fallback={<SearchBoxFallback />}>
          <SearchBox />
        </Suspense>

        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {/* 위시리스트는 메뉴에서 숨겼다(2026-09-21, 사용자 결정). 화면(/wishlist)과 자료는 그대로라
              주소로는 열린다 — 되살릴 때는 이 줄과 site-menu, auth/user-menu, 게임 상세의 찜 버튼을 같이 되돌린다 */}
          <SiteNavLink href={ROUTES.alerts} icon={<BellIcon size={19} />} iconOnly>
            알림
          </SiteNavLink>
          <AuthNav />
        </div>

        <SiteMenu />
      </div>
    </header>
  );
}
