// 루트 로딩 — 홈/검색 등 공통 스켈레톤. 실제 화면과 같은 셸(Page), 같은 격자를 써야 전환이 튀지 않는다.
// enter={false} + skeleton-delay: 스켈레톤은 페이드하지 않고, 응답이 --skeleton-delay 보다 느릴 때만 떠오른다.
// 곧바로 그리면 응답이 빠른 화면에서 한두 프레임만 번쩍이고 사라져 그게 깜빡임이 된다.
import { Page } from "@/components/ui/page";
import { CARD_SHELL, COVER_CLASS } from "@/components/game-card";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { cn } from "@/lib/cn";

const SKELETON_CARDS = 8;

export default function RootLoading() {
  return (
    <Page pad="home" gap={56} enter={false} className="skeleton-delay" aria-busy="true" aria-label="불러오는 중">
      <div className="flex flex-col gap-2.5">
        <div className="skeleton h-10 w-56 max-w-full rounded" />
        <div className="skeleton h-4 w-[300px] max-w-full rounded" />
      </div>
      {/* 실물(game-card)과 같은 격자, 같은 줄 수여야 본문이 올 때 화면이 밀리지 않는다 */}
      <div className={HOME_GRID_CLASS}>
        {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
          <div key={i} className={CARD_SHELL}>
            <div className={cn(COVER_CLASS, "skeleton")} />
            <div className="flex flex-col gap-1 px-1">
              <div className="skeleton h-[22px] w-4/5 rounded" />
              <div className="skeleton h-[26px] w-3/5 rounded" />
              <div className="hidden skeleton h-[18px] w-3/5 rounded sm:block" />
              <div className="mt-1 skeleton h-[17px] w-2/5 rounded-full" />
              <div className="mt-1.5 skeleton h-4 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}
