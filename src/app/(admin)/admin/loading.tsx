// 업무 현황판 뼈대 — 머리(제목, 설명 한 줄)와 묶음 기둥. 기둥 수, 줄 수는 실물(WORK_BOARD_SHAPE)과 같다.
import { Bone, SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton } from "@/components/admin/skeletons";
import { WORK_BOARD_SHAPE } from "@/components/admin/work-board";
import { panelClass } from "@/components/ui/page";

export default function AdminBoardLoading() {
  return (
    <SkeletonBody className="gap-4">
      <AdminHeadSkeleton width="w-28" />
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {WORK_BOARD_SHAPE.map((lines, i) => (
          <div key={i} className={panelClass("flex flex-col gap-2 p-3")}>
            <Bone className="h-5 w-20" />
            {Array.from({ length: lines }, (_, j) => (
              <Bone key={j} className="h-10 rounded-lg [@media(pointer:fine)]:h-9" />
            ))}
          </div>
        ))}
      </div>
    </SkeletonBody>
  );
}
