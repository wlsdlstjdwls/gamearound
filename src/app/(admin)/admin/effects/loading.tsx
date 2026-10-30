// 전시관리 뼈대 — 머리, 왼쪽 전시 목록 그리드, 오른쪽 폼 판. 관리자 메뉴 이동이 서버 응답을 기다리며 멈춰 보이지 않게 한다(admin-nav-speed).
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, MasterDetailSkeleton } from "@/components/admin/skeletons";

const ROWS = 1; // 지금 전시는 명예의 전당 1위 인트로 하나다

export default function AdminEffectsLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-28" />
      <MasterDetailSkeleton listWidth="440px" rows={ROWS} />
    </SkeletonBody>
  );
}
