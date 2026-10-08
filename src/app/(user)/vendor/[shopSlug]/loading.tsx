// 매장 상품 관리, 직원 화면이 같이 쓰는 뼈대 — 둘 다 좁은 폭(tight)에 매장 이름 + 설명, 이동 단추 줄,
// 그 아래 마디(제목 + 판 목록), 마지막에 입력 판이 선다. 경계를 [shopSlug] 에 하나만 두는 이유가 이것이다.
// 부모(vendor/loading)의 매장 판 목록이 이 자리에 뜨면 마디가 하나도 없는 화면이 잠깐 섰다 바뀐다.
import { Panel, panelClass } from "@/components/ui/page";
import { Bone, SectionHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_ROWS = 3;
const FORM_FIELDS = 3;

export default function VendorShopLoading() {
  return (
    <SkeletonPage width="tight" gap={20}>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <Bone className="h-[30px] w-40 sm:h-[37px]" />
        <Bone className="h-4 w-48" />
      </div>

      <div className="flex gap-2">
        <Bone className="h-8 w-24 rounded-[9px]" />
        <Bone className="h-8 w-20 rounded-[9px]" />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeadSkeleton width="w-24" />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div key={i} className={panelClass("flex flex-col gap-2 px-4 py-3.5")}>
              <div className="flex justify-between gap-2">
                <Bone className="h-[18px] w-2/5" />
                <Bone className="h-4 w-20" />
              </div>
              <Bone className="h-3.5 w-1/3" />
              <Bone className="h-9 w-48 rounded-[var(--radius-sm)]" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeadSkeleton width="w-28" />
        <Panel className="flex flex-col gap-3 px-4 py-4">
          {Array.from({ length: FORM_FIELDS }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Bone className="h-3.5 w-16" />
              <Bone className="h-10 rounded-[var(--radius-sm)]" />
            </div>
          ))}
        </Panel>
      </div>
    </SkeletonPage>
  );
}
