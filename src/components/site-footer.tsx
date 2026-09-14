// 하단 법적 고지 푸터. fitin-app 의 legal footer 구조를 그대로 가져왔다 —
// 가운데 정렬 세로 스택, 링크 행, 그 아래 저작권 한 줄.
// 링크 사이에 세로 구분선을 넣지 않는 것도 그쪽 규칙을 따른 것이고, 우리 표기 규약(파이프, 가운뎃점 제한)과도 맞는다.
// 서버 컴포넌트로 둔다 — 상태도 이벤트도 없다.
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";

const LINK_CLASS = "text-[12px] text-dim transition-colors hover:text-ink focus-visible:text-ink";

export function SiteFooter() {
  // 저작권 연도는 렌더 시점에 계산한다. 하드코딩하면 해가 바뀔 때 반드시 한 군데가 남는다.
  const thisYear = new Date().getFullYear();
  const years = thisYear > SITE.foundedYear ? `${SITE.foundedYear}-${thisYear}` : `${SITE.foundedYear}`;

  return (
    <footer className="mt-4 flex flex-col items-center gap-2 border-t border-line bg-surface px-4 pb-8 pt-6">
      <nav className="flex flex-wrap items-center justify-center gap-4" aria-label="약관">
        <Link href={ROUTES.terms} className={LINK_CLASS}>
          이용약관
        </Link>
        <Link href={ROUTES.privacy} className={`${LINK_CLASS} font-semibold text-mut`}>
          개인정보처리방침
        </Link>
      </nav>
      <p className="text-center text-[11px] text-dim">
        © {years} {SITE.name}. All rights reserved.
      </p>
    </footer>
  );
}
