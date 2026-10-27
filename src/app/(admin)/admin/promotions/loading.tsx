// 유료 노출 관리 뼈대 — 머리, 걸기 판, 자리별 줄 목록.
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, ModerationRowsSkeleton } from "@/components/admin/skeletons";

const ROWS = 3; // 자리마다 걸리는 수는 칸 수(3, 2) 안팎이다

export default function AdminPromotionsLoading() {
  return (
    <SkeletonBody className="gap-5">
      <AdminHeadSkeleton width="w-32" />
      <ModerationRowsSkeleton rows={ROWS} metaLines={1} />
    </SkeletonBody>
  );
}
