// 광고노출관리 뼈대 — 머리, 조회조건 띠, 왼쪽 그리드와 처리 띠, 오른쪽 상세 판. 실물 목록 폭(720px)과 맞춘다.
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, MasterDetailSkeleton } from "@/components/admin/skeletons";

const ROWS = 5; // 자리 둘의 칸 수(3, 2)를 합친 만큼이 평소 걸린 광고 수다

export default function AdminPromotionsLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-32" />
      <MasterDetailSkeleton listWidth="720px" rows={ROWS} />
    </SkeletonBody>
  );
}
