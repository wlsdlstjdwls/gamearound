// 매장 콘솔 입구 뼈대 — 좁은 폭(tight), 제목 + 옆 설명, 내 매장 판(이름, 역할, 단추 둘) 목록.
// 매장이 하나면 곧장 상품 화면으로 넘어가므로 이 뼈대는 그 사이에도 잠깐 선다 — 판 하나 높이면 충분하다.
import { panelClass } from "@/components/ui/page";
import { Bone, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_SHOPS = 2;

export default function VendorLoading() {
  return (
    <SkeletonPage width="tight" gap={18}>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <Bone className="h-[30px] w-32 sm:h-[37px]" />
        <Bone className="h-4 w-48" />
      </div>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: SKELETON_SHOPS }).map((_, i) => (
          <div key={i} className={panelClass("flex flex-wrap items-center gap-3 px-4 py-3.5")}>
            <div className="flex flex-1 flex-col gap-1.5">
              <Bone className="h-[18px] w-36" />
              <Bone className="h-3.5 w-12" />
            </div>
            <Bone className="h-8 w-20 rounded-[9px]" />
            <Bone className="h-8 w-20 rounded-[9px]" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
