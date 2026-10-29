// 수집현황 뼈대 — 머리(제목, 24시간 요약, 단추 둘), 조회조건 띠, 왼쪽 스토어 그리드, 오른쪽 상세 판. 실물 목록 폭(700px)과 맞춘다.
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, MasterDetailSkeleton } from "@/components/admin/skeletons";

const ROWS = 12; // 붙어 있는 소스 수 언저리 — 실물 줄 수보다 적으면 본문이 올 때 그리드가 늘어난다

export default function AdminOverviewLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-28" action="w-64" />
      <MasterDetailSkeleton listWidth="700px" rows={ROWS} />
    </SkeletonBody>
  );
}
