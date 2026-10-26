import { Suspense } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import { AuthNav } from "@/components/auth/auth-nav";
import { BrandLockup } from "@/components/ui/logo";
import { SearchBox, SearchBoxFallback } from "@/components/search-box";
import { SiteMenu } from "@/components/site-menu";
import { SiteNav, SiteNavFallback } from "@/components/site-nav";
import { NotificationBell } from "@/components/notification-bell";
import { SubNav } from "@/components/sub-nav";
import { PageTrail } from "@/components/page-trail";
import { ThemeSwitch } from "@/components/theme-switch";

/**
 * 머리띠 + 하위 메뉴 띠(2026-10-26 개편, 기획서 v2.0 3.1, 4.3).
 * 머리띠 한 줄: 락업 + 상단 메뉴 넷 | 검색칸 + 개인 자리(알림, 계정). 왼쪽은 "무엇을 보러 가나", 오른쪽은 "내 것" 이다.
 * 그 아래 하위 메뉴 띠는 머리띠 밖에 둔다 — 이유는 sub-nav 머리 주석(머리띠 높이 토큰).
 *
 * 상단 메뉴가 lg(1024px)부터 펴지는 이유: 메뉴 넷의 글자가 옛 셋보다 길어 640~1023 에서는 검색칸이 눌려 사라진다.
 * 그 폭에서는 햄버거 시트가 메뉴 넷을 맡고, 하위 메뉴 띠는 어느 폭에서나 선다(기획서 4.1 태블릿 "메뉴가 두 줄로").
 * 줄바꿈은 여전히 하지 않는다(2026-09-15) — flex-wrap 으로 흘리면 390px 에서 머리띠가 161px 까지 자랐다.
 */
export function SiteHeader() {
  return (
    <>
      {/* 유리 면(--header-glass): 반투명 바탕 + 뒤 흐림. 스크롤한 본문이 머리띠 밑으로 비쳐 "떠 있다" 를 말하고,
          그림자는 스크롤한 뒤에만 뜬다(.header-lift) — 맨 위에서는 본문과 한 장으로 읽힌다 */}
      <header className="header-lift sticky top-0 z-40 border-b border-line-soft bg-[var(--header-glass)] backdrop-blur-[var(--header-blur)]">
        <div className="mx-auto flex w-full max-w-[var(--page-w)] items-center gap-2 px-5 py-2.5 sm:gap-5 sm:px-6 sm:py-3.5 lg:gap-7">
          {/* 좁은 화면에서는 심볼만 남는다. 글자가 접혀도 링크의 이름은 남아야 하므로 aria-label 로 못 박는다 */}
          <Link href={ROUTES.home} aria-label={SITE.name} className="press tap inline-flex shrink-0 items-center text-ink">
            <BrandLockup wordmarkClassName="hidden sm:inline" />
          </Link>

          {/* useSearchParams 를 쓰는 칸은 Suspense 안에 둔다 — 없으면 정적으로 뽑히는 화면이 프리렌더 단계에서 실패한다 */}
          <Suspense fallback={<SiteNavFallback />}>
            <SiteNav />
          </Suspense>

          <Suspense fallback={<SearchBoxFallback />}>
            <SearchBox />
          </Suspense>

          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            {/* 테마 단추는 로그인과 상관없이 선다 — 설정 화면은 로그인한 사람에게만 열린다(theme-switch 주석) */}
            <ThemeSwitch />
            {/* 종은 알림함 팝오버다(기획서 v2.0 M-03). 가격 알림 관리로 가는 길은 팝오버 맨 아래에 있다 */}
            <NotificationBell />
            <AuthNav />
          </div>

          <SiteMenu />
        </div>
      </header>
      <Suspense fallback={null}>
        <SubNav />
        {/* 하위 화면 맨 위 "이전 화면" 과 경로(목업 crumb). 띠와 같은 표를 읽는다(page-trail 머리 주석) */}
        <PageTrail />
      </Suspense>
    </>
  );
}
