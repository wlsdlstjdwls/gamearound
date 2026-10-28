// 데이터 점검 뼈대 — 머리 아래 판정 줄 목록(data-issue-list). 줄마다 규칙 이름, 근거, 게임 링크, 오른쪽 버튼 둘이다.
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, ModerationRowsSkeleton } from "@/components/admin/skeletons";

const ROWS = 6;

export default function AdminDataIssuesLoading() {
  return (
    <SkeletonBody className="gap-5">
      <AdminHeadSkeleton width="w-32" />
      <ModerationRowsSkeleton rows={ROWS} metaLines={2} />
    </SkeletonBody>
  );
}
