// 매장상품매핑관리 뼈대 — 머리, 조회조건 띠, 왼쪽 그리드와 일괄 처리 띠, 오른쪽 상세 판. 실물 목록 폭(640px, 칸이 다섯이라 매칭 화면보다 넓다)과 맞춘다.
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, MasterDetailSkeleton } from "@/components/admin/skeletons";

export default function AdminProductsLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-44" />
      <MasterDetailSkeleton listWidth="640px" />
    </SkeletonBody>
  );
}
