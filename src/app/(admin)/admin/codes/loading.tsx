// 공통코드관리 뼈대 — 머리, 왼쪽 그룹 그리드, 오른쪽 그룹 정보와 코드 목록. 메뉴 이동이 서버 응답을 기다리며 멈춰 보이지 않게 한다(admin-nav-speed).
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, MasterDetailSkeleton } from "@/components/admin/skeletons";

const ROWS = 6;

export default function AdminCodesLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-32" />
      <MasterDetailSkeleton listWidth="480px" rows={ROWS} />
    </SkeletonBody>
  );
}
