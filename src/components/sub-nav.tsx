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
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
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
  if (!section) return null;
  const on = picked ?? sub?.href ?? null;

  return (
    <nav aria-label={`${section.label} 하위 메뉴`} className="border-b border-line-soft">
      <ul className="mx-auto flex w-full max-w-[var(--page-w)] gap-1 overflow-x-auto px-2 [scrollbar-width:none] sm:px-4">
        {section.subs.map((s) => {
          const current = s.href === on;
          return (
            <li key={s.href} className="shrink-0">
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
                  current ? "text-acc after:bg-acc" : "text-mut after:bg-transparent hover:text-ink",
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
