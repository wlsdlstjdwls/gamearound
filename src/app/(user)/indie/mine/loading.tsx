// 등록현황(/indie/mine) 뼈대 — 실물(page.tsx)과 같은 순서: 탭 둘(mine-tabs, 52px) | 머리 | 집계 넷 | 게임 줄.
// 2026-11-20 실물에 다시 맞췄다: 예전 뼈대는 좁은 폭(tight)에 탭, 집계 칸 없이 헤어라인 줄만 그려 실물이 올 때 화면이 통째로 바뀌었다.
// 머리는 좁은 폭에서 설명(세 줄로 꺾인다, 실측 73px) + "내 게임 등록"(36px) 이 나란히 선다(PageHead menuScreen leadRow).
// 집계는 좁은 폭에서 판 한 장 네 칸(실측 74px), 넓은 폭은 칸마다 판(실측 90px)이다.
// 게임 줄 수는 사람마다 0~몇 개라 둘로 잡는다. 줄 높이는 그림(좁은 폭 96px 폭 16:9) + 글 세 줄 + 단계 줄이다.
import { Bone, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SKELETON_ROWS = 2; // 한 사람이 올리는 글은 몇 개 안 된다(INDIE_POSTS_PER_USER_MAX)
const TILES = 4;

export default function IndieMineLoading() {
  return (
    <SkeletonPage gap={20}>
      <Bone className="h-[52px] w-full rounded-[var(--radius-md)] sm:w-[340px]" />
      <PageHeadSkeleton menuScreen leadRow leadLines={3} width="w-28" desc={1} action="w-[112px]" />
      <div className="grid grid-cols-4 divide-x divide-line-soft rounded-[var(--radius-md)] bg-surface shadow-hair sm:gap-3.5 sm:divide-x-0 sm:rounded-none sm:bg-transparent sm:shadow-none">
        {Array.from({ length: TILES }).map((_, i) => (
          <div key={i} className="flex h-[74px] flex-col justify-center gap-1.5 px-3 sm:h-[90px] sm:rounded-[var(--radius-md)] sm:bg-surface sm:px-4 sm:shadow-hair">
            <Bone className="h-3.5 w-12" />
            <Bone className="h-6 w-8" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div key={i} className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3.5 gap-y-3 rounded-[var(--radius-panel)] bg-surface p-3.5 shadow-hair sm:grid-cols-[176px_minmax(0,1fr)_260px] sm:gap-x-5 sm:p-4">
            <Bone className="aspect-[16/9] w-full rounded-[var(--radius-cover)]" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <Bone className="h-5 w-32" />
              <Bone className="h-4 w-full" />
              <Bone className="h-3.5 w-24" />
            </div>
            <div className="col-span-2 flex flex-col gap-2.5 border-t border-line-soft pt-3 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <Bone className="h-[42px] w-full" />
              <Bone className="h-8 w-24 rounded-[var(--radius-sm)]" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
