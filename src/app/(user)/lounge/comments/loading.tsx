// 댓글함 뼈대 — 좁은 폭(tight), 제목과 설명 한 줄, "새 댓글 N개" 한 줄, 댓글 줄(동그라미 + 이름 줄 + 본문 두 줄 + 글 제목 줄).
import { Bone, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_ROWS = 5;

export default function LoungeCommentsLoading() {
  return (
    <SkeletonPage width="tight" gap={18}>
      <PageHeadSkeleton width="w-52" desc={1} />
      <Bone className="h-4 w-24" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div key={i} className="flex gap-3.5 rounded-[var(--radius-md)] bg-surface p-4 shadow-hair">
            <Bone className="size-10 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bone className="h-3.5 w-36" />
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-3/5" />
              <Bone className="h-3.5 w-44" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
