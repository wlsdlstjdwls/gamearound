// 회사 검수 뼈대 — 두 마디다. 위는 검수 대기 세 칸 표(이름 두 줄, 게임 수, 붙이기 버튼),
// 아래는 아는 회사 헤어라인 목록(이름, 나라, 오른쪽 끝 게임 수).
import { Bone, RowsSkeleton, SkeletonBody } from "@/components/ui/skeleton";
import { AdminH2Skeleton, AdminHeadSkeleton, DataTableSkeleton } from "@/components/admin/skeletons";
import { COMPANY_PENDING_COLS } from "@/lib/admin/table-cols";

const PENDING_ROWS = 6;
const KNOWN_ROWS = 8;

export default function AdminCompaniesLoading() {
  return (
    <SkeletonBody className="gap-8">
      <div className="flex flex-col gap-3">
        <AdminHeadSkeleton width="w-32" leadLines={2} />
        <div className="flex items-end justify-between gap-2">
          <AdminH2Skeleton width="w-32" />
          <Bone className="h-3 w-40" />
        </div>
        <DataTableSkeleton cols={COMPANY_PENDING_COLS} cells={[["h-4 w-40", "h-3 w-56"], "h-4 w-8", "h-8 w-[112px] rounded-[9px]"]} rows={PENDING_ROWS} />
      </div>
      <div className="flex flex-col gap-3">
        <AdminH2Skeleton width="w-36" />
        <RowsSkeleton
          rows={KNOWN_ROWS}
          renderRow={(i) => (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Bone className={i % 2 ? "h-4 w-28" : "h-4 w-40"} />
              <Bone className="h-3 w-12" />
              <Bone className="ml-auto h-3 w-14" />
            </div>
          )}
        />
      </div>
    </SkeletonBody>
  );
}
