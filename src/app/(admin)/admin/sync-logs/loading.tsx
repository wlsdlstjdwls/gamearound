// 수집이력조회 뼈대 — 머리, 조회조건 띠, 왼쪽 실행 그리드, 오른쪽 상세 판. 실물 목록 폭(728px)과 맞춘다.
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, MasterDetailSkeleton } from "@/components/admin/skeletons";

const ROWS = 12;

export default function SyncLogsLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-32" />
      <MasterDetailSkeleton listWidth="728px" rows={ROWS} />
    </SkeletonBody>
  );
}
