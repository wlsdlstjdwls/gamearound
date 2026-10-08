// 인디 홍보 관리 뼈대 — 머리, 탭 칩 줄, 검수 줄 목록(왼쪽 글 제목과 개발사, 작성자 꼬리 줄, 오른쪽 숨김 사유 입력과 버튼).
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminChipsSkeleton, AdminHeadSkeleton, ModerationRowsSkeleton } from "@/components/admin/skeletons";

const ROWS = 6;
const TABS = 4; // server/services/indie/moderation 의 INDIE_ADMIN_TABS 수. 그 모듈은 DB 를 끌고 와서 뼈대가 가져오지 않는다

export default function AdminIndieLoading() {
  return (
    <SkeletonBody className="gap-5">
      <AdminHeadSkeleton width="w-36" />
      <AdminChipsSkeleton count={TABS} />
      <ModerationRowsSkeleton rows={ROWS} metaLines={2} />
    </SkeletonBody>
  );
}
