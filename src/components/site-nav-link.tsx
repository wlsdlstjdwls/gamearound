"use client";
// 헤더 주요 메뉴 한 칸. 지금 보고 있는 화면을 표시하기 위해서만 클라이언트다.
//
// 왜 필요했나: 헤더의 세 링크가 어느 화면에서나 똑같이 회색이라, 목록에 들어와도
// "내가 어디 있는지" 를 헤더가 말해 주지 않았다. 브레드크럼이 있는 상세와 달리
// 목록, 위시리스트, 알림은 헤더가 유일한 위치 표시다.
//
// 색이 아니라 글자색과 굵기로만 표시한다 — 헤더에 브랜드 색 덩어리를 하나 더 얹으면
// 로고와 경쟁한다. 보조 기술에는 aria-current 가 같은 말을 한다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function SiteNavLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  // 하위 경로도 그 메뉴 안이다(/games/<slug> 는 게임 목록 아래). 홈(/)만 정확히 일치할 때로 한정한다
  const current = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "press rounded-lg px-3 py-[7px] transition-colors",
        current ? "font-semibold text-ink" : "text-mut hover:text-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}
