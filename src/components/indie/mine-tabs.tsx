// 내 게임 관리 탭 — 등록현황(/indie/mine)과 내 게임 통계(/indie/mine/stats)를 오가는 칩 한 줄.
//
// 2026-10-28 메뉴 정리(사용자: "중복되는 것들 통폐합")로 두 화면이 라운지 띠의 한 칸 "내 게임 관리" 가 됐다.
// 띠에서 칸이 빠진 만큼 두 화면 사이 길은 여기서 낸다. 경로가 달라 loading.tsx 가 바로 뜨므로 NavPendingScope 없이
// NavChip 만 쓴다 — 칩은 서버가 말하는 켜짐(active)으로 선다.
import { NavChip } from "@/components/ui/nav-pending";
import { INDIE_REVIEW_MESSAGES } from "@/lib/indie/messages";
import { INDIE_PROMO_MESSAGES } from "@/lib/indie/promo-messages";
import { ROUTES } from "@/lib/routes";

const TABS = [
  { href: ROUTES.indieMine, label: INDIE_REVIEW_MESSAGES.title },
  { href: ROUTES.indieStats, label: INDIE_PROMO_MESSAGES.statsTitle },
] as const;

/** 탭 줄의 낭독 이름. 띠의 칸 이름과 같은 말이다(lib/nav) */
const MINE_TABS_LABEL = "내 게임 관리";

export function MineTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label={MINE_TABS_LABEL} className="flex flex-wrap gap-1.5">
      {TABS.map((t) => (
        <NavChip key={t.href} group="mine-tab" current="page" href={t.href} active={t.href === current}>
          {t.label}
        </NavChip>
      ))}
    </nav>
  );
}
