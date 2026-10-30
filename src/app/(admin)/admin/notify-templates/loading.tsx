// 알림템플릿관리 뼈대 — 머리, 왼쪽 템플릿 그리드, 오른쪽 폼과 미리 보기(admin-nav-speed).
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, MasterDetailSkeleton } from "@/components/admin/skeletons";

const ROWS = 6;

export default function AdminNotifyTemplatesLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-36" />
      <MasterDetailSkeleton listWidth="400px" rows={ROWS} />
    </SkeletonBody>
  );
}
