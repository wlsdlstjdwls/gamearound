// 인디 목록 뼈대 — 제목과 설명, 명예의 전당 안내 띠, 단계 칩 다섯, 인디 카드 격자(1, 2, 3, 4열, 목업처럼 넓은 화면 한 줄 넷).
// 카드 한 장의 뼈대는 슈퍼루키, 플레이테스트와 같이 쓴다(components/indie/indie-card-skeleton).
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { IndieCardSkeleton } from "@/components/indie/indie-card-skeleton";
import { Bone, ChipsSkeleton, SkeletonPage } from "@/components/ui/skeleton";
import { INDIE_STAGES } from "@/lib/indie/constants";

const SKELETON_CARDS = 8; // 4열 두 줄 — 첫 화면만 채우면 된다

export default function IndieLoading() {
  return (
    <SkeletonPage gap={22}>
      <div className="flex flex-col gap-2.5">
        <Bone className="h-8 w-48" />
        <Bone className="h-4 w-72 max-w-full" />
      </div>
      <Bone className="h-[112px] rounded-[var(--radius-md)] sm:h-[76px]" />
      <ChipsSkeleton count={INDIE_STAGES.length + 1} />
      <div className={HOME_GRID_CLASS}>
        {Array.from({ length: SKELETON_CARDS }).map((_, i) => (
          <IndieCardSkeleton key={i} />
        ))}
      </div>
    </SkeletonPage>
  );
}
