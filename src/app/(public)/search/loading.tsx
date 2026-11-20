// 검색 결과 스켈레톤 — 제목("검색어" 검색 결과) 옆 정렬 칩 셋 + 4열 카드 격자.
//
// 실물(search/page)은 목록 화면과 달리 필터 기둥이 없고 홈과 같은 4열 격자(HOME_GRID_CLASS)를 쓴다.
// 제목과 정렬 칩이 한 줄에 서는 배치를 그대로 잡아야 결과가 올 때 격자가 아래로 밀리지 않는다.
import { GameCardSkeleton, GameListCardSkeleton } from "@/components/game-card-skeleton";
import { Bone, ChipsSkeleton, SkeletonPage } from "@/components/ui/skeleton";
import { HOME_GRID_CLASS, SEARCH_CARD_PHONE, SEARCH_CARD_WIDE } from "@/lib/games/grid";

const SKELETON_CARDS = 8; // 4열 두 줄 — 검색 결과는 대개 한 화면 안에서 끝난다
const SORT_CHIPS = 3; // 관련도순, 할인율순, 가격순

export default function SearchLoading() {
  return (
    <SkeletonPage gap={22}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Bone className="h-[30px] w-64 max-w-full sm:h-[37px]" />
        <ChipsSkeleton count={SORT_CHIPS} className="gap-1" />
      </div>
      {/* 좁은 화면은 가로형 카드, sm 부터 세로 카드 — 실물과 같은 칸 나눔(lib/games/grid 의 SEARCH_CARD_*) */}
      <div className={HOME_GRID_CLASS}>
        {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
          <div key={i}>
            <div className={SEARCH_CARD_PHONE}>
              <GameListCardSkeleton />
            </div>
            <div className={SEARCH_CARD_WIDE}>
              <GameCardSkeleton />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
