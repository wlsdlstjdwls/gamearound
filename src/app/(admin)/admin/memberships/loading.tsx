// 멤버십 목록 뼈대 — 머리, 가입자 줄.
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, ModerationRowsSkeleton } from "@/components/admin/skeletons";

const ROWS = 4; // 시범 단계라 가입자는 몇 줄이다

export default function AdminMembershipsLoading() {
  return (
    <SkeletonBody className="gap-5">
      <AdminHeadSkeleton width="w-24" />
      <ModerationRowsSkeleton rows={ROWS} metaLines={1} />
    </SkeletonBody>
  );
}
