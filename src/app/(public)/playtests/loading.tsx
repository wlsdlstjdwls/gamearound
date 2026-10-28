// 플레이테스트 뼈대 — 제목과 설명, 인디 카드 격자(1~4열). 카드마다 아래에 모집 이름과 "마감 | 신청 수" 두 줄이 붙는다.
// 맨 위 광고 마디(멤버십 개발자의 모집)는 걸린 것이 있을 때만 서서 그리지 않는다.
import { IndieCardSkeleton } from "@/components/indie/indie-card-skeleton";
import { Bone, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";
import { HOME_GRID_CLASS } from "@/lib/games/grid";

const SKELETON_CARDS = 8; // 4열 두 줄

export default function PlaytestsLoading() {
  return (
    <SkeletonPage gap={22}>
      <PageHeadSkeleton width="w-36" desc={1} />
      <div className={HOME_GRID_CLASS}>
        {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <IndieCardSkeleton />
            <div className="flex flex-col gap-1 px-1">
              <Bone className="h-[18px] w-3/5" />
              <Bone className="h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
