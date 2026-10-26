"use client";
// 넓은 화면 머리띠의 상단 메뉴 넷(기획서 v2.0 3.1). 지금 주소가 어느 메뉴 소속인지 표시하려고만 클라이언트다.
//
// 표는 lib/nav 하나다 — 하위 메뉴 띠(sub-nav)와 좁은 화면 시트(site-menu)도 같은 표를 읽는다.
// 켜진 메뉴는 라임 글자만 쓴다. 밑줄은 하위 메뉴 띠의 문법이라 여기서까지 그으면 한 화면에 밑줄이 두 줄 선다.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_SECTIONS, resolveNav, type NavSection } from "@/lib/nav";

function Item({ section, current }: { section: NavSection; current: boolean }) {
  return (
    <Link
      href={section.href}
      aria-current={current ? "true" : undefined}
      className={cn(
        "press rounded-lg px-3 py-[7px] transition-colors duration-fast",
        current ? "text-acc" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {section.label}
    </Link>
  );
}

const NAV_CLASS = "hidden shrink-0 items-center gap-0.5 text-[15px] font-semibold lg:flex";

export function SiteNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { section } = resolveNav(pathname, searchParams);
  return (
    <nav aria-label="주요 메뉴" className={NAV_CLASS}>
      {NAV_SECTIONS.map((s) => (
        <Item key={s.key} section={s} current={s.key === section?.key} />
      ))}
    </nav>
  );
}

/** useSearchParams 를 기다리는 동안(정적 프리렌더) 서는 같은 줄. 켜짐만 없다 */
export function SiteNavFallback() {
  return (
    <nav aria-label="주요 메뉴" className={NAV_CLASS}>
      {NAV_SECTIONS.map((s) => (
        <Item key={s.key} section={s} current={false} />
      ))}
    </nav>
  );
}
