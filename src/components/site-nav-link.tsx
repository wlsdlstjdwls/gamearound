"use client";
// 헤더 주요 메뉴 한 칸. 지금 보고 있는 화면을 표시하기 위해서만 클라이언트다.
//
// 왜 필요했나: 헤더의 세 링크가 어느 화면에서나 똑같이 회색이라, 목록에 들어와도
// "내가 어디 있는지" 를 헤더가 말해 주지 않았다. 브레드크럼이 있는 상세와 달리
// 목록, 위시리스트, 알림은 헤더가 유일한 위치 표시다.
//
// 표시는 브랜드 보라 글자다(2026-09-21). 잉크색 굵은 글자로만 말하던 때는 안 고른 칸과
// 굵기 하나 차이라 훑어서는 안 보였다 — 목록 화면에서 제목을 뺀 지금은 머리띠가 "여기가 어디인가" 를
// 말하는 유일한 자리다. 면이 아니라 글자에만 색을 주므로 로고와 경쟁하지 않는다.
// 보조 기술에는 aria-current 가 같은 말을 한다.
//
// icon 을 받으면 좁은 화면에서 글자를 접고 그림만 세운다. 전에는 같은 상황을 `hidden sm:block` 으로
// 다뤄서 위시리스트, 알림이 모바일에서 아예 사라졌고, 그 두 화면으로 가는 길이 사용자 메뉴 안에만 남았다.
// 글자는 지우지 않고 sr-only 로 남긴다 — 화면 낭독기는 그림이 아니라 이 글자를 읽는다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function SiteNavLink({
  href,
  icon,
  iconOnly = false,
  children,
  className,
}: {
  href: string;
  /** 있으면 좁은 화면에서 글자 대신 이것만 보인다 */
  icon?: React.ReactNode;
  /** 넓은 화면에서도 글자를 펴지 않는다 — 머리띠 오른쪽 끝의 개인 자리(위시리스트, 알림)용 */
  iconOnly?: boolean;
  children: string;
  className?: string;
}) {
  const pathname = usePathname();
  // 하위 경로도 그 메뉴 안이다(/games/<slug> 는 게임 목록 아래). 홈(/)만 정확히 일치할 때로 한정한다
  const current = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "press flex items-center justify-center rounded-lg transition-colors",
        // 그림만 선 칸은 정사각 터치 타깃을 갖는다. 글자가 돌아오는 넓은 화면에서는 원래 여백으로 돌아간다
        icon && iconOnly
          ? "size-[var(--touch-target)] sm:size-10"
          : icon
            ? "size-[var(--touch-target)] sm:size-auto sm:gap-1.5 sm:px-3 sm:py-[7px]"
            : "px-3 py-[7px]",
        // 안 고른 칸은 면을 갖지 않는다 — hover 에서만 바탕이 한 겹 깔린다(칩과 같은 규칙)
        current ? "font-bold text-acc" : "text-mut hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      {icon}
      <span className={icon ? (iconOnly ? "sr-only" : "sr-only sm:not-sr-only") : undefined}>{children}</span>
    </Link>
  );
}
