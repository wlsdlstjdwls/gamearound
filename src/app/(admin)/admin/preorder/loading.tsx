// 예약 특전 뼈대 — 머리 아래 검수 줄 목록. 줄마다 왼쪽은 뉴스 제목과 상태 꼬리 줄, 게임 링크,
// 오른쪽 320px 은 게임 잇기 입력과 판정 버튼이다(preorder-moderation).
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, ModerationRowsSkeleton } from "@/components/admin/skeletons";

const ROWS = 6;

export default function AdminPreorderLoading() {
  return (
    <SkeletonBody className="gap-5">
      <AdminHeadSkeleton width="w-32" />
      <ModerationRowsSkeleton rows={ROWS} metaLines={2} />
    </SkeletonBody>
  );
}
