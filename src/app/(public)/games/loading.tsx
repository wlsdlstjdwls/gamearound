// 게임 목록 스켈레톤 — 왼쪽 232px 필터 기둥 + 오른쪽 3열 카드 격자(games/page 와 같은 두 기둥).
//
// 없을 때는 루트 스켈레톤(홈 모양, 기둥 없는 4열)을 빌려 썼다. 다른 화면에서 목록으로 들어올 때마다
// 기둥이 없던 4열 격자가 뜨고, 본문이 오면 기둥이 생기며 카드가 3열로 줄어 화면이 통째로 다시 짜였다.
// 필터 기둥 뼈대는 페이지 안 Suspense 가 쓰는 것(games/skeletons)을 그대로 가져온다 — 경계 둘이 같은 모양이어야
// 첫 진입과 필터 변경이 같은 화면으로 기다린다. 걸린 조건은 아직 모르니(주소를 읽지 않는다) 빈 조건으로 세운다.
import { GameGridSkeleton } from "@/components/game-card-skeleton";
import { SkeletonPage } from "@/components/ui/skeleton";
import { GAMES_GRID_CLASS } from "@/lib/games/grid";
import { FiltersSkeleton } from "@/app/(public)/games/skeletons";

const SKELETON_CARDS = 12; // 1, 2, 3열 모두 줄이 꽉 차는 수 — 실물 한 장(GAMES_PAGE_SIZE 36)의 첫 화면만 채우면 된다

export default function GamesLoading() {
  return (
    <SkeletonPage gap={22}>
      <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-[232px_minmax(0,1fr)]">
        <FiltersSkeleton filter={{}} />
        <div className="flex min-w-0 flex-col gap-9">
          <GameGridSkeleton cards={SKELETON_CARDS} gridClass={GAMES_GRID_CLASS} />
        </div>
      </div>
    </SkeletonPage>
  );
}
