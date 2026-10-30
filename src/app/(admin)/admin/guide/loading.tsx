// 서비스안내서조회 뼈대 — 머리와 문서 판(admin-nav-speed).
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton } from "@/components/admin/skeletons";

export default function AdminGuideLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-40" />
    </SkeletonBody>
  );
}
