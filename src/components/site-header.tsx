import { Suspense } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import { AuthNav } from "@/components/auth/auth-nav";
import { BrandLockup } from "@/components/ui/logo";
import { SearchBox, SearchBoxFallback } from "@/components/search-box";
import { SiteMenu } from "@/components/site-menu";
import { SiteNav, SiteNavFallback } from "@/components/site-nav";
import { SiteTabbar, SiteTabbarFallback } from "@/components/site-tabbar";
import { NotificationBell } from "@/components/notification-bell";
import { HeaderWishLink } from "@/components/header-wish-link";
import { SubNav } from "@/components/sub-nav";
import { PageTrail } from "@/components/page-trail";
import { InstallBanner } from "@/components/app-shell/install-banner";
import { UpdateNotice } from "@/components/app-shell/update-notice";

/**
 * 머리띠 + 하위 메뉴 띠(2026-10-26 개편, 기획서 v2.0 3.1, 4.3).
 * 머리띠 한 줄: 락업 + 검색칸 + 상단 메뉴 넷 | 개인 자리(찜, 알림, 계정). 왼쪽은 "무엇을 찾나, 어디로 가나", 오른쪽은 "내 것" 이다.
 * 그 아래 하위 메뉴 띠는 머리띠 밖에 둔다 — 이유는 sub-nav 머리 주석(머리띠 높이 토큰).
 *
 * 폭마다 메뉴 넷의 자리(기획서 v2.0 4.1, 목업의 1023, 650 미디어쿼리):
 *  - 1024 부터: 로고 옆 한 줄.
 *  - 651~1023(태블릿): 머리띠 둘째 줄. 메뉴 넷의 글자가 옛 셋보다 길어 한 줄에 세우면 검색칸이 눌려 사라지던 폭이다 —
 *    그래서 한때는 햄버거 시트로 접었는데, 기획서는 "메뉴가 두 줄로 내려감" 이다. 줄을 **통째로 따로** 주면 검색칸은 첫 줄 폭을 다 쓴다.
 *  - 650 까지(모바일): 바닥 탭바(site-tabbar). 머리띠는 한 줄 그대로다.
 * 2026-09-15 에 줄바꿈을 막은 이유(flex-wrap 으로 흘리니 390px 에서 머리띠가 161px 까지 자랐다)는 모바일 폭의 이야기라
 * 그 폭에서는 여전히 접지 않는다. 태블릿에서 둘째 줄이 서는 만큼 머리띠 높이 토큰(--header-h)도 globals.css 에서 같이 올린다.
 *
 * 계정 자리도 폭마다 하나만 선다: 651 부터는 사용자 메뉴 드롭다운(auth-nav), 그 밑은 계정 시트(site-menu).
 */
export function SiteHeader() {
  return (
    <>
      {/* 휴대폰 웹의 "홈 화면에 추가" 띠. 머리띠 위 흐름에 서서 스크롤하면 같이 올라간다(app-shell/install-banner 머리말).
          새 버전 안내는 바닥에 뜨는 고정 띠라 자리는 상관없다 — 루트 레이아웃이 모든 화면에 한 번 세우는 머리띠 묶음에 같이 둔다 */}
      <InstallBanner />
      <UpdateNotice />
      {/* 유리 면(--header-glass): 반투명 바탕 + 뒤 흐림. 스크롤한 본문이 머리띠 밑으로 비쳐 "떠 있다" 를 말하고,
          그림자는 스크롤한 뒤에만 뜬다(.header-lift) — 맨 위에서는 본문과 한 장으로 읽힌다 */}
      <header data-site-header className="header-lift sticky top-0 z-40 border-b border-line-soft bg-[var(--header-glass)] backdrop-blur-[var(--header-blur)]">
        <div className="mx-auto flex w-full max-w-[var(--page-w)] flex-wrap items-center gap-x-2 gap-y-1 px-5 py-2.5 sm:gap-x-5 sm:px-6 sm:py-3.5 tab:max-lg:pb-1.5 lg:flex-nowrap lg:gap-x-7">
          {/* 좁은 화면에서는 심볼만 남는다. 글자가 접혀도 링크의 이름은 남아야 하므로 aria-label 로 못 박는다 */}
          <Link href={ROUTES.home} aria-label={SITE.name} className="press tap inline-flex shrink-0 items-center text-ink">
            <BrandLockup wordmarkClassName="hidden sm:inline" />
          </Link>

          {/* 검색칸이 로고 바로 옆, 메뉴가 그 오른쪽이다(2026-10-30 사용자 "검색창을 왼쪽으로, 메뉴를 검색창 오른쪽으로").
              태블릿에서는 메뉴가 어차피 둘째 줄로 내려가므로(site-nav 의 max-lg:order-last) 이 순서는 넓은 화면에서만 보인다.
              useSearchParams 를 쓰는 칸은 Suspense 안에 둔다 — 없으면 정적으로 뽑히는 화면이 프리렌더 단계에서 실패한다 */}
          <Suspense fallback={<SearchBoxFallback />}>
            <SearchBox />
          </Suspense>

          <Suspense fallback={<SiteNavFallback />}>
            <SiteNav />
          </Suspense>

          {/* 머리띠 테마 단추는 걷었다(2026-10-30 사용자). 테마는 설정 화면과 좁은 화면 계정 시트(site-menu)에서 고른다 */}

          {/* 종은 알림함 팝오버다(기획서 v2.0 M-03). 가격 알림 관리로 가는 길은 팝오버 맨 아래에 있다.
              좁은 화면에서도 남긴다(2026-10-26) — 테마, 계정 단추와 함께 숨겼더니 휴대폰에서는 알림함에 갈 길이 없었다.
              목업 390 도 종을 머리띠에 둔다 */}
          <div className="flex shrink-0 items-center gap-1.5">
            {/* 찜 목록 하트(2026-10-28 사용자 지시). 종과 짝으로 선다 */}
            <HeaderWishLink />
            <NotificationBell />
            <div className="hidden tab:contents">
              <AuthNav />
            </div>
          </div>

          <SiteMenu />
        </div>
      </header>
      <Suspense fallback={<SiteTabbarFallback />}>
        <SiteTabbar />
      </Suspense>
      <Suspense fallback={null}>
        <SubNav />
        {/* 하위 화면 맨 위 "이전 화면" 과 경로(목업 crumb). 띠와 같은 표를 읽는다(page-trail 머리 주석) */}
        <PageTrail />
      </Suspense>
    </>
  );
}
