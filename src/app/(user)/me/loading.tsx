// 내 활동 뼈대 — 제목, 프로필 판(좁은 폭 토큰: 큰 동그라미 사진 + 이름, 단추 둘, 안내 한 줄), 탭 칩 둘, 흰 판 안의 글 목록 줄.
// 목록 줄은 게시판 목록과 같은 모양이라 게시판 뼈대의 줄을 그대로 쓴다(community/skeleton).
import { PostRowsSkeleton } from "@/components/community/skeleton";
import { Bone, ChipsSkeleton, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_ROWS = 8; // 한 쪽 20줄 중 첫 화면에 보이는 만큼

export default function MeLoading() {
  return (
    <SkeletonPage gap={18}>
      <PageHeadSkeleton width="w-24" />
      <div className="max-w-[var(--page-w-tight)] rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair sm:p-5">
        <div className="flex items-center gap-5">
          <Bone className="size-24 shrink-0 rounded-full sm:size-28" />
          <div className="flex flex-col gap-2">
            <Bone className="h-6 w-28" />
            <div className="flex gap-2">
              <Bone className="h-8 w-24 rounded-xl" />
              <Bone className="h-8 w-28 rounded-xl" />
            </div>
            <Bone className="h-3.5 w-48 max-w-full" />
          </div>
        </div>
      </div>
      <div>
        <ChipsSkeleton count={2} />
        <div className="mt-3 rounded-[var(--radius-md)] bg-surface p-3 shadow-hair sm:p-4">
          <PostRowsSkeleton rows={SKELETON_ROWS} />
        </div>
      </div>
    </SkeletonPage>
  );
}
