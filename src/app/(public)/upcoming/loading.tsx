// 출시예정 스켈레톤 — 달 탭 띠(60px, 칸은 56px 폭 둥근 상자) + 달 머리 + 4열 카드 격자 + 각주.
//
// 실물은 제목을 감추고 달 탭이 화면 맨 위에 선다(upcoming/page). 달 탭은 sticky 띠라 높이(--month-nav-h)를
// 그대로 잡아야 본문이 올 때 격자가 아래로 밀리지 않는다. 띠의 좌우 넘침(-mx)도 실물과 같게 둔다.
import { GameGridSkeleton } from "@/components/game-card-skeleton";
import { Bone, SectionHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";
import { HOME_GRID_CLASS } from "@/lib/games/grid";

const MONTH_TABS = 7; // 실물은 오늘부터 대여섯 달 + 연도 표지 — 넓은 화면 한 줄을 채우는 수
const SKELETON_CARDS = 12; // 1~4열 모두 줄이 꽉 차는 수(실물 한 장은 UPCOMING_PAGE_SIZE 24)

export default function UpcomingLoading() {
  return (
    <SkeletonPage gap={30}>
      <div className="-mx-5 flex h-[var(--month-nav-h)] items-center gap-1.5 overflow-hidden border-b border-line px-5 sm:-mx-7 sm:px-7">
        <Bone className="mr-1.5 h-4 w-10 shrink-0" />
        {Array.from({ length: MONTH_TABS }).map((_, i) => (
          <Bone key={i} className="h-[46px] w-[56px] shrink-0 rounded-xl" />
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <SectionHeadSkeleton width="w-32" />
        <GameGridSkeleton cards={SKELETON_CARDS} gridClass={HOME_GRID_CLASS} />
      </section>

      <div className="flex max-w-[760px] flex-col gap-2">
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-2/3" />
      </div>
    </SkeletonPage>
  );
}
