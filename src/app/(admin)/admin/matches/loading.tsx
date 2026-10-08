// 매칭 대기 뼈대 — 머리(제목 + 설명), 건수 마디 제목, 그 아래 여섯 칸 표(우리 제목, 스토어 제목, 출처, 외부 ID, 유사도, 판정 버튼).
// 칸 틀은 화면과 같은 MATCH_QUEUE_COLS 를 쓴다 — 좁은 화면에서는 실물처럼 줄이 카드로 눕는다.
import { SkeletonBody, SectionHeadSkeleton } from "@/components/ui/skeleton";
import { AdminHeadSkeleton, DataTableSkeleton } from "@/components/admin/skeletons";
import { MATCH_QUEUE_COLS } from "@/lib/admin/table-cols";

const ROWS = 8; // 한 화면에 보이는 줄 수면 된다 — 큐 전체 길이는 기다리는 동안 알 수 없다

export default function AdminMatchesLoading() {
  return (
    <SkeletonBody>
      <AdminHeadSkeleton width="w-36" />
      <div className="flex flex-col gap-3">
        <SectionHeadSkeleton width="w-52" />
        <DataTableSkeleton
          cols={MATCH_QUEUE_COLS}
          cells={["h-4 w-4/5", "h-4 w-3/4", "h-4 w-16", "h-4 w-2/3", "h-4 w-8", "h-8 w-[124px] rounded-[9px]"]}
          rows={ROWS}
        />
      </div>
    </SkeletonBody>
  );
}
