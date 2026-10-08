// 실행 로그 뼈대 — 머리 오른쪽(좁으면 아래)에 소스 칩 줄(sm), 그 아래 여덟 칸 표.
// 좁은 화면에서는 실물이 칸을 숨기고 요약 카드(MobileRunHead + 이름표 줄)만 세우므로 뼈대도 그 모양이다(mobileSummary).
import { Bone, PageHeadSkeleton, SkeletonBody } from "@/components/ui/skeleton";
import { AdminChipsSkeleton, DataTableSkeleton } from "@/components/admin/skeletons";
import { SYNC_LOG_COLS } from "@/lib/admin/table-cols";

const ROWS = 12;
const SOURCE_CHIPS = 16; // "전체" + 소스 15곳(2026-10-08 실측). 넓은 화면에서 두 줄로 접히는 모양이 실물과 같아야 표가 같은 자리에서 시작한다

export default function SyncLogsLoading() {
  return (
    <SkeletonBody className="gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        {/* max-w-full: 이 칸은 내용 폭으로 서서, 없으면 420px 설명 막대가 좁은 화면에서 판 밖으로 나간다(2026-10-08 캡처) */}
        <div className="flex max-w-full flex-col gap-1">
          <PageHeadSkeleton width="w-32" />
          <Bone className="h-4 w-[420px] max-w-full" />
        </div>
        <AdminChipsSkeleton count={SOURCE_CHIPS} size="sm" />
      </div>
      <DataTableSkeleton
        cols={SYNC_LOG_COLS}
        cells={["h-4 w-8", "h-4 w-20", "h-[22px] w-14 rounded-full", "h-4 w-24", "h-4 w-12", "h-4 w-8", "h-4 w-6", "h-4 w-3/4"]}
        rows={ROWS}
        mobileSummary
      />
    </SkeletonBody>
  );
}
