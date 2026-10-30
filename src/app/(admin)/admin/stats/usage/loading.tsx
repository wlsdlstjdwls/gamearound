// 통계 화면 뼈대 — 머리, 조회 띠, 숫자 칸, 그래프 판(admin-nav-speed).
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, StatsSkeleton } from "@/components/admin/skeletons";

export default function AdminStatsUsageLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-28" />
      <StatsSkeleton />
    </SkeletonBody>
  );
}
