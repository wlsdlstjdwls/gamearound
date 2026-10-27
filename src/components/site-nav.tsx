"use client";
// 머리띠의 상단 메뉴 넷(기획서 v2.0 3.1). 1024 부터는 로고 옆 한 줄, 651~1023 은 머리띠 둘째 줄이다. 지금 주소가 어느 메뉴 소속인지 표시하려고만 클라이언트다.
//
// 표는 lib/nav 하나다 — 하위 메뉴 띠(sub-nav)와 좁은 화면 바닥 탭바(site-tabbar)도 같은 표를 읽는다.
// 켜진 메뉴는 브랜드색 글자만 쓴다. 밑줄은 하위 메뉴 띠의 문법이라 여기서까지 그으면 한 화면에 밑줄이 두 줄 선다.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_SECTIONS, resolveNav, type NavSection } from "@/lib/nav";

function Item({ section, current }: { section: NavSection; current: boolean }) {
  return (
    <Link
      href={section.href}
      aria-current={current ? "true" : undefined}
      // 하위 메뉴 띠(sub-nav)가 이 칸의 자리를 재서 꼭지를 그 밑에 세운다
      data-nav-key={section.key}
      className={cn(
        "press rounded-lg px-3 py-[7px] transition-colors duration-fast",
        current ? "text-acc" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {section.label}
    </Link>
  );
}

/*
 * 651px(tab) 부터 선다. 그 밑은 바닥 탭바(site-tabbar)가 메뉴 넷을 맡는다.
 * 태블릿(651~1023)에서는 머리띠의 둘째 줄로 내려간다(기획서 4.1 태블릿 "메뉴가 두 줄로 내려감", 목업 1023 미디어쿼리의 nav order:4, flex:1 0 100%).
 * 한 줄에 세우면 검색칸이 눌려 사라지던 폭이라(site-header 주석) 줄을 아예 따로 준다. 줄 안에서는 넘쳐도 가로로 밀 뿐 다시 접지 않는다.
 * -mx-3 은 첫 칸 글자를 로고 왼쪽 끝에 맞추려는 것이다(칸마다 px-3 안쪽 여백이 있다).
 */
const NAV_CLASS =
  "hidden items-center gap-0.5 text-[15px] font-semibold tab:flex max-lg:order-last max-lg:-mx-3 max-lg:basis-full max-lg:overflow-x-auto max-lg:[scrollbar-width:none] lg:shrink-0";

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
