// 루트 로딩 — 홈/검색 등 공통 스켈레톤. 실제 화면과 같은 셸(Page), 같은 격자를 써야 전환이 튀지 않는다.
// enter={false} + skeleton-delay: 스켈레톤은 페이드하지 않고, 응답이 --skeleton-delay 보다 느릴 때만 떠오른다.
// 곧바로 그리면 응답이 빠른 화면에서 한두 프레임만 번쩍이고 사라져 그게 깜빡임이 된다.
import { Page } from "@/components/ui/page";
import { CARD_SHELL } from "@/components/game-card";

const SKELETON_CARDS = 8;

export default function RootLoading() {
  return (
    <Page pad="home" gap={56} enter={false} className="skeleton-delay" aria-busy="true" aria-label="불러오는 중">
      <div className="flex flex-col gap-2.5">
        <div className="skeleton h-10 w-56 max-w-full rounded" />
        <div className="skeleton h-4 w-[300px] max-w-full rounded" />
      </div>
      {/* 실물(game-card)과 같은 격자, 같은 줄 수여야 본문이 올 때 화면이 밀리지 않는다 */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-x-6 gap-y-9">
        {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
          <div key={i} className={CARD_SHELL}>
            <div className="skeleton aspect-[460/215] rounded-[var(--radius-cover)]" />
            <div className="flex flex-col gap-1 px-1 pt-3">
              <div className="skeleton h-[22px] w-4/5 rounded" />
              <div className="skeleton h-[17px] w-3/5 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}
