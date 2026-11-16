// 게임 목록 스켈레톤 — 제목, 왼쪽 진열대 메뉴 + 오른쪽(막대, 결과 수, 3열 타일 격자). games/page 와 같은 모양이다.
//
// 없을 때는 루트 스켈레톤(홈 모양)을 빌려 썼다. 경계 둘(이 파일과 페이지 안 Suspense)이 다른 모양이면
// 다른 화면에서 들어올 때마다 본문이 오며 화면이 통째로 다시 짜인다. 2026-11-16 e숍식 왼쪽 메뉴를 세우며 기둥 뼈대를 되살렸다.
import { GameGridSkeleton } from "@/components/game-card-skeleton";
import { SkeletonPage } from "@/components/ui/skeleton";
import { GAMES_GRID_CLASS } from "@/lib/games/grid";
import { FilterBarSkeleton, ListTitleSkeleton, RailSkeleton, ResultCountSkeleton } from "./skeletons";

const SKELETON_CARDS = 12; // 1, 2, 3열 모두 줄이 꽉 차는 수 — 실물 한 장(GAMES_PAGE_SIZE 24)의 첫 화면만 채우면 된다

export default function GamesLoading() {
  return (
    <SkeletonPage gap={18}>
      <ListTitleSkeleton />
      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <RailSkeleton />
        <div className="flex min-w-0 flex-col gap-[18px]">
          <FilterBarSkeleton />
          <div className="flex flex-col gap-6">
            <ResultCountSkeleton />
            <GameGridSkeleton cards={SKELETON_CARDS} gridClass={GAMES_GRID_CLASS} />
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
