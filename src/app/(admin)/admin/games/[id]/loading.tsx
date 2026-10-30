// 게임 고치기 뼈대 — 머리, 게임 묶음, 탭 아래 왼쪽 그리드와 오른쪽 상세 판(첫 탭 값 고치기 꼴). 실물 목록 폭(520px)과 맞춘다.
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, MasterDetailSkeleton } from "@/components/admin/skeletons";

export default function AdminGameLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-56" />
      <MasterDetailSkeleton listWidth="520px" />
    </SkeletonBody>
  );
}
