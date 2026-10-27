// 내 게임 통계 뼈대 — 제목, 집계 다섯 칸, 게임마다 판 하나.
import { Bone, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_CARDS = 2; // 한 사람이 올리는 글은 몇 개 안 된다(INDIE_POSTS_PER_USER_MAX)
const TILE_COUNT = 5; // 조회, 플레이하기, 찜, 댓글, 소식 받는 사람

export default function IndieStatsLoading() {
  return (
    <SkeletonPage gap={20}>
      <PageHeadSkeleton width="w-40" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3.5">
        {Array.from({ length: TILE_COUNT }, (_, i) => (
          <Bone key={i} className="h-[76px] rounded-[var(--radius-md)]" />
        ))}
      </div>
      {Array.from({ length: SKELETON_CARDS }, (_, i) => (
        <Bone key={i} className="h-36 rounded-[var(--radius-panel)]" />
      ))}
    </SkeletonPage>
  );
}
