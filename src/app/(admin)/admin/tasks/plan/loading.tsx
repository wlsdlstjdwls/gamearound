// 업무관리 일정(WBS) 뼈대 — 머리, 보기 전환 줄, 간트 판, 아래 목록과 상세.
// 칸반에서 일정으로 넘어갈 때 이 뼈대가 바로 서서 누른 순간 화면이 바뀐다(AGENTS §6).
import { Bone, PageHeadSkeleton, SkeletonBody } from "@/components/ui/skeleton";

export default function TasksPlanLoading() {
  return (
    <SkeletonBody>
      <PageHeadSkeleton width="w-28" />
      <div className="flex items-center justify-between gap-2" aria-hidden>
        <Bone className="h-[44px] w-56 rounded-xl" />
        <Bone className="h-[44px] w-36 rounded-xl" />
      </div>
      <Bone className="h-[360px] w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-[720px_minmax(0,1fr)]" aria-hidden>
        <Bone className="h-64 rounded-lg" />
        <Bone className="h-64 rounded-lg" />
      </div>
    </SkeletonBody>
  );
}
