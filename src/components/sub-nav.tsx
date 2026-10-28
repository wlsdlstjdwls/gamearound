"use client";
// 하위 메뉴 띠 — 지금 메뉴의 하위 화면들(기획서 v2.0 3.1, 4.3). 현재 위치는 브랜드색 글자 + 밑줄이다.
// 소속 메뉴가 없는 화면(홈, 설정)에는 서지 않는다. 상세처럼 메뉴는 있고 칸이 없는 화면은 띠만 서고 아무 칸도 안 켜진다.
//
// 머리띠(sticky) 밖에 두는 이유: 띠가 서는 화면과 안 서는 화면이 있어 머리띠 높이가 바뀌면
// --header-h 를 쓰는 자리(상세 스크롤 머리바, 출시예정 달 띠)가 전부 어긋난다. 띠는 본문과 함께 스크롤된다.
//
// 누른 순간 켜진다(AGENTS.md 6장). "전체 게임" 과 "할인 게임" 은 같은 경로(/games)의 주소 조건만 달라
// loading.tsx 가 안 뜬다 — 서버를 기다리면 몇 초 동안 칸이 그대로라 단추가 죽은 것처럼 보인다.
// 그래서 useOptimistic 으로 고른 칸을 먼저 켜고 같은 전환 안에서 이동한다(ui/nav-pending 과 같은 수법).
//
// 꼭지와 자리(목업 .snb, snx()): 상단 메뉴가 머리띠에 서는 폭(651 부터)에서는 띠의 칸 묶음을 지금 상단 메뉴 밑으로 옮기고,
// 머리띠 밑선에서 그 메뉴 밑으로 작은 세모를 내린다 — 띠가 어느 메뉴의 하위인지 눈으로 잇는다.
// 자리는 글꼴 폭에 달려 서버에서 못 정한다. 그래서 칸을 재서 CSS 변수로만 넘긴다(상태를 두지 않아 다시 그리지 않는다).
// 처음 한 번은 미끄러지지 않고 바로 놓는다 — 화면을 열 때마다 띠가 옆으로 흐르면 고장처럼 보인다. 메뉴를 바꿀 때만 미끄러진다.
// 띠는 overflow-x-clip 이다 — 칸 묶음을 옮기면 ul 상자 오른쪽 끝이 화면 밖으로 나가 가로 스크롤이 생긴다.
// 칸이 넘쳐 가로로 밀리는 폭이거나 상단 메뉴가 바닥 탭바로 내려간 폭(650 까지)에서는 옮기지도, 꼭지를 세우지도 않는다.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useOptimistic, useRef, useTransition } from "react";
import { isPlainClick } from "@/components/ui/chip-nav";
import { cn } from "@/lib/cn";
import { resolveNav } from "@/lib/nav";

export function SubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [picked, setPicked] = useOptimistic<string | null>(null);
  const { section, sub } = resolveNav(pathname, searchParams);
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sectionKey = section?.key;

  useLayoutEffect(() => {
    const nav = navRef.current;
    const list = listRef.current;
    if (!nav || !list || !sectionKey) return;
    const place = () => {
      const item = document.querySelector<HTMLElement>(`[data-nav-key="${sectionKey}"]`);
      const first = list.firstElementChild as HTMLElement | null;
      const last = list.lastElementChild as HTMLElement | null;
      // offsetParent 가 없으면 안 보이는 칸이다(650 까지는 상단 메뉴가 숨는다)
      if (!item || item.offsetParent === null || !first || !last || list.scrollWidth > list.clientWidth) {
        nav.removeAttribute("data-notch");
        list.style.translate = "";
        return;
      }
      // offsetLeft 는 translate 를 빼고 잰 값이라 옮긴 뒤에 다시 재도 흔들리지 않는다(nav, ul 이 relative)
      const cx = item.getBoundingClientRect().left + item.offsetWidth / 2 - nav.getBoundingClientRect().left;
      const groupLeft = first.offsetLeft;
      const groupWidth = last.offsetLeft + last.offsetWidth - groupLeft;
      const room = list.clientWidth - groupLeft - (last.offsetLeft + last.offsetWidth); // 오른쪽 끝까지 남는 폭(왼쪽 여백만큼 남긴다)
      const shift = Math.max(0, Math.min(cx - (list.offsetLeft + groupLeft + groupWidth / 2), room - groupLeft));
      nav.style.setProperty("--notch-x", `${cx}px`);
      nav.setAttribute("data-notch", "");
      list.style.translate = `${shift}px 0`;
    };
    place();
    // 첫 자리를 그린 다음 프레임부터 미끄러짐을 켠다. 글꼴이 늦게 와 칸 폭이 바뀌면 다시 잰다
    const raf = requestAnimationFrame(() => nav.setAttribute("data-notch-ready", ""));
    const observer = new ResizeObserver(place);
    observer.observe(nav);
    void document.fonts?.ready.then(place);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [sectionKey]);

  if (!section) return null;
  const on = picked ?? sub?.href ?? null;

  return (
    <nav ref={navRef} aria-label={`${section.label} 하위 메뉴`} className="sub-nav-notch relative overflow-x-clip border-b border-line-soft">
      <ul
        ref={listRef}
        className="relative mx-auto flex w-full max-w-[var(--page-w)] gap-1 overflow-x-auto px-2 transition-[translate] duration-slow ease-out-emph [scrollbar-width:none] sm:px-4"
      >
        {section.subs.map((s, i) => {
          const current = s.href === on;
          // 내 것 묶음의 첫 칸 앞에 가는 세로선 하나 — 칸 이름 없이 "여기부터는 내 화면" 을 가른다(lib/nav 의 mine)
          const split = s.mine && !section.subs[i - 1]?.mine;
          return (
            <li
              key={s.href}
              className={cn(
                "shrink-0",
                split && "relative ml-2 pl-2 before:absolute before:left-0 before:top-1/2 before:h-4 before:w-px before:-translate-y-1/2 before:bg-line",
              )}
            >
              <Link
                href={s.href}
                aria-current={current ? "page" : undefined}
                onClick={(e) => {
                  if (!isPlainClick(e)) return;
                  e.preventDefault();
                  startTransition(() => {
                    setPicked(s.href);
                    router.push(s.href);
                  });
                }}
                className={cn(
                  "relative flex h-[var(--touch-target)] items-center whitespace-nowrap px-3 text-[14px] font-semibold transition-colors duration-fast",
                  // 밑줄은 글자 폭만큼(좌우 여백 안쪽) — 칸 전체 폭으로 그으면 이웃 칸과 붙어 한 줄로 읽힌다
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors after:duration-fast",
                  current ? "underline-grow text-acc after:bg-acc" : "text-mut after:bg-transparent hover:text-ink",
                )}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
