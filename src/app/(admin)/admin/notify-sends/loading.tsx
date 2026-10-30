// 알림발송관리 뼈대 — 머리, 왼쪽 발송 이력 그리드, 오른쪽 상세(admin-nav-speed).
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, MasterDetailSkeleton } from "@/components/admin/skeletons";

const ROWS = 8;

export default function AdminNotifySendsLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-36" />
      <MasterDetailSkeleton listWidth="560px" rows={ROWS} />
    </SkeletonBody>
  );
}
