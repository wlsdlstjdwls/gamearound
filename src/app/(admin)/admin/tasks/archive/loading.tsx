// 지난 일 뼈대 — 머리 오른쪽에 "할 일로" 버튼, 그 아래 흰 판 한 장에 접힌 줄 목록.
// 줄은 실물(task-archive-list)처럼 분류 배지 + 제목 한 줄, 그 밑 날짜 한 줄이다.
import { Bone, PageHeadSkeleton, SkeletonBody } from "@/components/ui/skeleton";

const ROWS = 10;

export default function TaskArchiveLoading() {
  return (
    <SkeletonBody>
      <PageHeadSkeleton width="w-28" action="w-20" />
      <div className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-1" aria-hidden>
        {Array.from({ length: ROWS }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Bone className="h-[22px] w-10 rounded-[6px]" />
              <Bone className={i % 3 ? "h-5 w-1/2" : "h-5 w-2/3"} />
            </div>
            <Bone className="h-3.5 w-36" />
          </div>
        ))}
      </div>
    </SkeletonBody>
  );
}
