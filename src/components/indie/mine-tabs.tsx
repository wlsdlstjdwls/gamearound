// 내 게임 관리 탭 — 등록현황(/indie/mine)과 내 게임 통계(/indie/mine/stats)를 오가는 한 줄.
//
// 2026-10-28 메뉴 정리(사용자: "중복되는 것들 통폐합")로 두 화면이 라운지 띠의 한 칸 "내 게임 관리" 가 됐다.
// 띠에서 칸이 빠진 만큼 두 화면 사이 길은 여기서 낸다. 처음엔 필터 칩(NavChip)이었는데 같은 날 "눌릴 수 있는 버튼인지 티가 안 난다" —
// 칩은 이 사이트에서 "목록 거르기" 모양이라 화면을 바꾸는 길로 읽히지 않았다.
// 지금은 그림 + 이름을 단 큰 탭 둘을 회색 홈 안에 나란히 둔다(분할 단추). 지금 화면은 흰 판이 떠 있고, 다른 화면은 hover 때 흰 판이 비친다.
// 경로가 달라 loading.tsx 가 바로 뜨므로(누른 순간 화면이 바뀐다) 낙관 표시를 따로 두지 않는다.
import Link from "next/link";
import { ChartIcon, FileTextIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { INDIE_REVIEW_MESSAGES } from "@/lib/indie/messages";
import { INDIE_PROMO_MESSAGES } from "@/lib/indie/promo-messages";
import { ROUTES } from "@/lib/routes";

const TABS = [
  { href: ROUTES.indieMine, label: INDIE_REVIEW_MESSAGES.title, icon: <FileTextIcon size={17} /> },
  { href: ROUTES.indieStats, label: INDIE_PROMO_MESSAGES.statsTitle, icon: <ChartIcon size={17} /> },
] as const;

/** 탭 줄의 낭독 이름. 띠의 칸 이름과 같은 말이다(lib/nav) */
const MINE_TABS_LABEL = "내 게임 관리";

export function MineTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label={MINE_TABS_LABEL} className="grid w-full grid-cols-2 gap-1 rounded-[var(--radius-md)] bg-surface-2 p-1 sm:w-auto sm:self-start">
      {TABS.map((t) => {
        const on = t.href === current;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "press group/tab flex min-h-[var(--touch-target)] items-center justify-center gap-2 rounded-[var(--radius-sm)] px-5 text-[14.5px] font-bold transition-[background-color,color,box-shadow] duration-base",
              on ? "bg-surface text-ink shadow-[var(--elev-1)]" : "text-mut hover:bg-surface/70 hover:text-ink",
            )}
          >
            <span aria-hidden className={cn("transition-colors duration-base", on ? "text-acc" : "text-dim group-hover/tab:text-acc")}>
              {t.icon}
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
