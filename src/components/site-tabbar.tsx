"use client";
// 좁은 화면(650px 이하, 기획서 4.1 모바일)의 바닥 탭바 — 홈 + 상단 메뉴 넷(목업 390 의 #nav).
//
// 왜 바닥인가: 휴대폰에서 메뉴 넷이 햄버거 시트 안에 접혀 있으면 "게시판이 어디 있지" 를 매번 시트를 열어야 알았다.
// 엄지가 닿는 바닥에 늘 서 있으면 서비스의 전부(메뉴 넷)가 한눈에 보이고 한 번에 간다. 머리띠는 한 줄 그대로라 자라지 않는다.
// 하위 칸은 여기 펴지 않는다 — 메뉴를 고르면 그 화면 위에 하위 메뉴 띠(sub-nav)가 선다(넓은 화면과 같은 문법).
//
// 화면 바닥에 못 박는다(fixed). 본문과 푸터가 탭바 밑에 깔리지 않게 문서 바닥을 비우는 일, 토스트를 탭바 위로 올리는 일은
// globals.css 가 data-site-tabbar 표식을 읽어 한다(body 가 둘 다 감싼 유일한 조상이다 — 관리자 바닥 띠와 같은 수법).
// 관리자 화면에는 서지 않는다 — 관리자 셸이 제 바닥 띠를 세운다. 두 띠가 겹치면 아래 것이 가려진다.
//
// 누른 순간 켜진다(AGENTS.md 6장) — 서버를 기다리는 동안 칸이 그대로면 단추가 죽은 것처럼 보인다. sub-nav 와 같은 수법이다.
// 켜짐은 경로만 본다(useSearchParams 를 쓰면 머리띠 전체가 Suspense 경계를 요구한다). 메뉴 단위라 주소 조건은 필요 없다.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition, type ReactNode } from "react";
import { isPlainClick } from "@/components/ui/chip-nav";
import { ChatIcon, FileTextIcon, GamepadIcon, HomeIcon, SproutIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { NAV_SECTIONS, resolveNav, type NavSection } from "@/lib/nav";
import { ROUTES } from "@/lib/routes";

const HOME_KEY = "home";
const HOME_LABEL = "홈";
const ICON_SIZE = 22;

const SECTION_ICON: Record<NavSection["key"], ReactNode> = {
  explore: <GamepadIcon size={ICON_SIZE} />,
  indie: <SproutIcon size={ICON_SIZE} />,
  board: <FileTextIcon size={ICON_SIZE} />,
  lounge: <ChatIcon size={ICON_SIZE} />,
};

const TABS: readonly { key: string; label: string; href: string; icon: ReactNode }[] = [
  { key: HOME_KEY, label: HOME_LABEL, href: ROUTES.home, icon: <HomeIcon size={ICON_SIZE} /> },
  ...NAV_SECTIONS.map((s) => ({ key: s.key, label: s.label, href: s.href, icon: SECTION_ICON[s.key] })),
];

/** 모바일 메뉴의 이름. 머리띠 메뉴("주요 메뉴")와 같은 이름이면 낭독기의 랜드마크 목록에서 둘이 구별되지 않는다 */
const TABBAR_LABEL = "바닥 메뉴";

export function SiteTabbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [picked, setPicked] = useOptimistic<string | null>(null);

  if (pathname.startsWith(ROUTES.admin)) return null;

  const { section } = resolveNav(pathname, new URLSearchParams());
  const here = pathname === ROUTES.home ? HOME_KEY : (section?.key ?? null);
  const on = picked ?? here;

  return (
    <nav
      data-site-tabbar
      aria-label={TABBAR_LABEL}
      // 높이는 토큰으로 못 박는다(--tabbar-h) — 문서 바닥 여백과 토스트 자리가 같은 값을 읽어야 어긋나지 않는다.
      // 홈 인디케이터 높이는 그 바깥에 더한다(box-content + 아래 안쪽 여백)
      className="fixed inset-x-0 bottom-0 z-40 box-content grid h-[var(--tabbar-h)] grid-cols-5 gap-0.5 border-t border-line bg-[var(--header-glass)] px-1.5 pb-[env(safe-area-inset-bottom)] backdrop-blur-[var(--header-blur)] tab:hidden"
    >
      {TABS.map((t) => {
        const current = t.key === on;
        return (
          <Link
            key={t.key}
            href={t.href}
            // 메뉴 첫 화면 그 자체면 page, 그 메뉴 아래 다른 화면(상세 등)이면 "이 무리 안" 이라는 뜻의 true
            aria-current={current ? (pathname === t.href ? "page" : "true") : undefined}
            onClick={(e) => {
              if (!isPlainClick(e)) return;
              e.preventDefault();
              startTransition(() => {
                setPicked(t.key);
                router.push(t.href);
              });
            }}
            className={cn(
              "press my-1.5 flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition-colors duration-fast",
              current ? "bg-acc-soft font-semibold text-acc" : "text-mut hover:text-ink",
            )}
          >
            {t.icon}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
