// 입점 신청 심사 뼈대 — 머리, 상태 탭 칩 셋, 그 아래 심사 카드 격자(최소 360px 칸).
// 카드는 실물(shops/review-card)처럼 회색 면 한 장에 매장 이름, 76px 이름표의 정보 줄 다섯, 사유 입력과 버튼이 선다.
import { Bone, SkeletonBody } from "@/components/ui/skeleton";
import { AdminChipsSkeleton, AdminHeadSkeleton } from "@/components/admin/skeletons";
import { panelClass } from "@/components/ui/page";

const CARDS = 4;
const TABS = 3; // 대기, 운영, 정지
const INFO_LINES = 5;

export default function ShopsAdminLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-36" />
      <div className="flex flex-col gap-3">
        <AdminChipsSkeleton count={TABS} />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-3">
          {Array.from({ length: CARDS }).map((_, i) => (
            <div key={i} className={panelClass("flex flex-col gap-3 px-4 py-4")}>
              <div className="flex items-baseline gap-2">
                <Bone className="h-5 w-32" />
                <Bone className="h-3 w-16" />
              </div>
              <div className="flex flex-col gap-1.5">
                {Array.from({ length: INFO_LINES }).map((_, j) => (
                  <div key={j} className="flex gap-2">
                    <Bone className="h-3.5 w-[76px] shrink-0" />
                    <Bone className={j % 2 ? "h-3.5 w-28" : "h-3.5 w-44"} />
                  </div>
                ))}
              </div>
              <Bone className="h-9 w-full rounded-lg" />
              <div className="flex gap-1.5">
                <Bone className="h-8 w-16 rounded-[9px]" />
                <Bone className="h-8 w-16 rounded-[9px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonBody>
  );
}
