// 요금, 프로모션 뼈대 — 머리와 설정 판. 관리자 메뉴 이동이 서버 응답을 기다리며 멈춰 보이지 않게 한다(admin-nav-speed).
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, ModerationRowsSkeleton } from "@/components/admin/skeletons";

export default function AdminPricingLoading() {
  return (
    <SkeletonBody className="gap-5">
      <AdminHeadSkeleton width="w-28" />
      <ModerationRowsSkeleton rows={1} metaLines={3} />
    </SkeletonBody>
  );
}
