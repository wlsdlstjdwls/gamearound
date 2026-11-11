// 게임 목록 스켈레톤 — 제목, 위 가로 필터 막대, 폭을 다 쓰는 4열 격자(games/page 와 같은 모양).
//
// 없을 때는 루트 스켈레톤(홈 모양)을 빌려 썼다. 경계 둘(이 파일과 페이지 안 Suspense)이 다른 모양이면
// 다른 화면에서 들어올 때마다 본문이 오며 화면이 통째로 다시 짜인다. 2026-10-26 막대로 옮기며 기둥 뼈대를 걷었다.
import { GameGridSkeleton } from "@/components/game-card-skeleton";
import { SkeletonPage } from "@/components/ui/skeleton";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { FilterBarSkeleton, ListTitleSkeleton, ResultCountSkeleton } from "./skeletons";

const SKELETON_CARDS = 12; // 1, 2, 3, 4열 모두 줄이 꽉 차는 수 — 실물 한 장(GAMES_PAGE_SIZE 24)의 첫 화면만 채우면 된다

export default function GamesLoading() {
  return (
    <SkeletonPage gap={18}>
      {/* 실물(page)과 같은 줄 구성 — 제목, 막대, 그리고 결과 수 줄과 격자는 gap-6 묶음(PendingResults) */}
      <ListTitleSkeleton />
      <FilterBarSkeleton />
      <div className="flex flex-col gap-6">
        <ResultCountSkeleton />
        <GameGridSkeleton cards={SKELETON_CARDS} gridClass={HOME_GRID_CLASS} list />
      </div>
    </SkeletonPage>
  );
}
