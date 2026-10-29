// 수집 현황 뼈대 — 머리(제목, 설명 한 줄, 다시 돌리기 단추), 스토어 표(머리 + 줄).
// 표 틀은 실물과 같은 SYNC_SOURCE_COLS 를 쓴다 — 좁은 화면에서는 실물처럼 줄이 카드로 눕는다.
import { SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, DataTableSkeleton } from "@/components/admin/skeletons";
import { SYNC_SOURCE_COLS } from "@/lib/admin/table-cols";

const ROWS = 12; // 붙어 있는 소스 수 언저리 — 실물 줄 수보다 적으면 본문이 올 때 표가 늘어난다

export default function AdminOverviewLoading() {
  return (
    <SkeletonBody className="gap-4">
      <AdminHeadSkeleton width="w-28" action="w-40" />
      <DataTableSkeleton
        cols={SYNC_SOURCE_COLS}
        cells={["h-4 w-3/4", "h-[22px] w-12 rounded-[6px]", "h-4 w-4/5", "h-4 w-14", "h-4 w-8", "h-4 w-2/3", "h-4 w-12", "h-4 w-14"]}
        rows={ROWS}
      />
    </SkeletonBody>
  );
}
