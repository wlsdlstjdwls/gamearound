// 플레이테스트 관리 뼈대 — 제목, 모집 판, 지난 모집.
import { Bone, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_CARDS = 2; // 열린 모집 하나와 지난 모집 하나

export default function IndiePlaytestLoading() {
  return (
    <SkeletonPage gap={20}>
      <PageHeadSkeleton width="w-32" />
      {Array.from({ length: SKELETON_CARDS }, (_, i) => (
        <Bone key={i} className="h-40 rounded-[var(--radius-panel)]" />
      ))}
    </SkeletonPage>
  );
}
