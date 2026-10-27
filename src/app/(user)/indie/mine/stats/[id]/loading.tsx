// 통계 자세히 뼈대 — 제목, 그래프 판, 유입 경로 판.
import { Bone, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

export default function IndieStatsDetailLoading() {
  return (
    <SkeletonPage gap={20}>
      <PageHeadSkeleton width="w-56" />
      <Bone className="h-52 rounded-[var(--radius-panel)]" />
      <Bone className="h-40 rounded-[var(--radius-panel)]" />
    </SkeletonPage>
  );
}
