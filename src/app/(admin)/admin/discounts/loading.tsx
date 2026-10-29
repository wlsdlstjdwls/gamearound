// 할인 행사 뼈대 — 머리와 설정 판(admin-nav-speed).
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, ModerationRowsSkeleton } from "@/components/admin/skeletons";

export default function AdminDiscountsLoading() {
  return (
    <SkeletonBody className="gap-5">
      <AdminHeadSkeleton width="w-28" />
      <ModerationRowsSkeleton rows={1} metaLines={3} />
    </SkeletonBody>
  );
}
