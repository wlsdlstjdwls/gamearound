// 내 인디 글 뼈대 — 좁은 폭(tight), 제목 + 오른쪽 "올리기" 단추, 헤어라인 줄(단계 배지 + 제목, 고친 날).
import { Bone, PageHeadSkeleton, RowsSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_ROWS = 3; // 한 사람이 올리는 글은 몇 개 안 된다(INDIE_POSTS_PER_USER_MAX)

export default function IndieMineLoading() {
  return (
    <SkeletonPage width="tight" gap={18}>
      <PageHeadSkeleton width="w-40" action="w-28" />
      <RowsSkeleton
        rows={SKELETON_ROWS}
        renderRow={() => (
          <div className="flex flex-col gap-1.5 py-3">
            <div className="flex items-center gap-2">
              <Bone className="h-5 w-14 rounded-full" />
              <Bone className="h-5 w-48" />
            </div>
            <Bone className="h-3.5 w-20" />
          </div>
        )}
      />
    </SkeletonPage>
  );
}
