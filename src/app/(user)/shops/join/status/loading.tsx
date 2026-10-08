// 입점 신청 상태 뼈대 — 좁은 폭(tight), 제목, 회청 판 하나(상태 한 줄 + 설명, 이름표/값 셋, 단추).
// 신청 폼(shops/join)은 곧바로 뜨는 화면이라 경계를 두지 않고 이 화면만 기다린다.
import { Panel } from "@/components/ui/page";
import { Bone, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const FACT_ROWS = 3; // 매장 이름, 매장 주소 이름, 주소

export default function ShopJoinStatusLoading() {
  return (
    <SkeletonPage width="tight" gap={18}>
      <PageHeadSkeleton width="w-40" />
      <Panel className="flex flex-col gap-3 px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Bone className="h-5 w-48" />
          <Bone className="h-4 w-4/5" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: FACT_ROWS }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Bone className="h-3.5 w-[72px]" />
              <Bone className="h-3.5 w-32" />
            </div>
          ))}
        </div>
        <Bone className="h-10 w-32 rounded-[9px]" />
      </Panel>
    </SkeletonPage>
  );
}
