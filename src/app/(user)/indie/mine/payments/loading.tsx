// 결제 내역 뼈대 — 좁은 폭, 제목 + 오른쪽 "통계로" 링크 + 설명, 헤어라인 줄(상태 딱지 + 글 제목, 상품 | 결제 시각, 오른쪽 금액과 영수증).
// 결제 결과 띠(?paid, ?failed)는 결제창에서 돌아올 때만 서서 그리지 않는다.
import { Bone, PageHeadSkeleton, RowsSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_ROWS = 4; // 광고 결제는 한 사람이 몇 건 안 된다

export default function PaymentsLoading() {
  return (
    <SkeletonPage width="tight" gap={20}>
      <PageHeadSkeleton width="w-32" desc={1} action="w-20" />
      <RowsSkeleton
        rows={SKELETON_ROWS}
        renderRow={() => (
          <div className="flex items-center justify-between gap-3 py-3.5">
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Bone className="h-5 w-12 rounded-[5px]" />
                <Bone className="h-5 w-40" />
              </div>
              <Bone className="h-4 w-52 max-w-full" />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Bone className="h-5 w-16" />
              <Bone className="h-4 w-12" />
            </div>
          </div>
        )}
      />
    </SkeletonPage>
  );
}
