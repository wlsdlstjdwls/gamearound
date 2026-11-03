// 회사관리신청관리 뼈대 — 머리, 조회조건 띠, 왼쪽 그리드와 일괄 처리 띠, 오른쪽 상세 판.
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, MasterDetailSkeleton } from "@/components/admin/skeletons";

export default function AdminCompanyClaimsLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-32" />
      <MasterDetailSkeleton listWidth="520px" />
    </SkeletonBody>
  );
}
