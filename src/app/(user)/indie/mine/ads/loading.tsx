// 광고 성과 뼈대 — 제목, 광고마다 판 하나.
import { Bone, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_CARDS = 2; // 한 사람이 거는 광고는 몇 개 안 된다

export default function IndieAdsLoading() {
  return (
    <SkeletonPage gap={20}>
      <PageHeadSkeleton width="w-32" />
      {Array.from({ length: SKELETON_CARDS }, (_, i) => (
        <Bone key={i} className="h-40 rounded-[var(--radius-panel)]" />
      ))}
    </SkeletonPage>
  );
}
