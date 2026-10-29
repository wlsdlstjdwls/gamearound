// 하단 법적 고지 푸터. fitin-app 의 legal footer 구조를 그대로 가져왔다 —
// 가운데 정렬 세로 스택, 링크 행, 그 아래 저작권 한 줄.
// 링크 사이에 세로 구분선을 넣지 않는 것도 그쪽 규칙을 따른 것이고, 우리 표기 규약(파이프, 가운뎃점 제한)과도 맞는다.
// 서버 컴포넌트로 둔다 — 상태도 이벤트도 없다.
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";

/*
 * 줄 생김새. inline-flex + tap: 12px 글자라 높이가 18px 밖에 되지 않는다 — 누르는 기기에서만 44px 로 벌린다.
 * 이 값은 이 파일 안에만 둔다. 2026-10-12 까지 "use client" 파일(footer-shop-links)에서 가져왔는데,
 * 서버 컴포넌트가 클라이언트 모듈의 문자열 상수를 가져오면 값이 아니라 클라이언트 참조가 와서
 * 이용약관, 개인정보처리방침 링크의 className 이 통째로 빠져 있었다.
 */
const LINK_CLASS = "tap inline-flex items-center text-[12px] text-dim transition-colors hover:text-ink focus-visible:text-ink";

export function SiteFooter() {
  // 저작권 연도는 렌더 시점에 계산한다. 하드코딩하면 해가 바뀔 때 반드시 한 군데가 남는다.
  const thisYear = new Date().getFullYear();
  const years = thisYear > SITE.foundedYear ? `${SITE.foundedYear}-${thisYear}` : `${SITE.foundedYear}`;

  // 위 여백은 붙이지 않는다 — 본문과의 거리는 <Page> 의 하단 패딩 하나가 갖는다.
  // 둘 다 여백을 가지면 페이지마다 합이 달라지고, 화면 맨 아래 고지가 푸터에서 멀리 떨어져 떠 보인다.
  return (
    // safe-bottom: 홈 인디케이터가 있는 기기에서 마지막 줄이 가려지지 않게 한다(globals.css). 푸터가 문서의 맨 끝이다
    // 흰 판을 걷었다(2026-09-21 리디자인) — 본문과 가르는 것은 위쪽 헤어라인 한 줄뿐이다.
    // 가운데 정렬을 푼 이유: 본문이 1200px 기둥을 쓰는데 푸터만 가운데로 모이면 문서의 왼쪽 선이 끊긴다
    <footer data-site-footer className="safe-bottom mx-auto flex w-full max-w-[var(--page-w)] flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line px-5 py-6 sm:px-6">
      <nav className="flex flex-wrap items-center gap-x-[18px] gap-y-2" aria-label="약관">
        {/* 매장 찾기, 매장 입점 두 줄은 2026-10-27 사용자 지시로 숨겼다("일단 숨겨줘"). 화면(/shops, /business)은 그대로 열린다.
            되살리면 ROUTES.shops(SHOP_DIRECTORY_MESSAGES.title), ROUTES.business(BUSINESS_MESSAGES.navLabel) 두 Link 를 이 자리에 다시 얹는다 */}
        <Link href={ROUTES.terms} className={LINK_CLASS}>
          이용약관
        </Link>
        <Link href={ROUTES.privacy} className={`${LINK_CLASS} font-semibold text-mut`}>
          개인정보처리방침
        </Link>
      </nav>
      <p className="text-[12px] text-dim">
        © {years} {SITE.name}. All rights reserved.
      </p>
    </footer>
  );
}
