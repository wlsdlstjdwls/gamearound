// 업무 현황판 뼈대 — 머리(제목, 설명 한 줄)와 상위메뉴 기둥. 기둥 수, 줄 수는 실물과 같다(workBoardShape).
// 프로그램관리에서 숨긴 화면의 줄은 판에서 빠지므로 뼈대도 같은 설정을 읽는다. 레이아웃이 이미 읽은 캐시라 기다림이 없다.
import { Bone, SkeletonBody } from "@/components/ui/skeleton";
import { AdminHeadSkeleton } from "@/components/admin/skeletons";
import { workBoardShape } from "@/components/admin/work-board";
import { getProgramSettings } from "@/server/services/admin-programs";
import { panelClass } from "@/components/ui/page";

export default async function AdminBoardLoading() {
  const shape = workBoardShape(await getProgramSettings());
  return (
    <SkeletonBody className="gap-4">
      <AdminHeadSkeleton width="w-28" />
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shape.map((lines, i) => (
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
