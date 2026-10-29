// 회사정보관리 뼈대 — 머리, 조회조건 띠, 왼쪽 그리드와 일괄 처리 띠, 오른쪽 상세 판. 실물 목록 폭(520px)과 맞춘다.
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, MasterDetailSkeleton } from "@/components/admin/skeletons";

export default function AdminCompaniesLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-32" />
      <MasterDetailSkeleton listWidth="520px" />
    </SkeletonBody>
  );
}
