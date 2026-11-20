// 출시예정 스켈레톤 — 실물(upcoming/page)의 마디 순서 그대로: 머리, 막대, 달 띠(60px), 달 제목, 기대작 카드 넷, 날짜순 줄 목록.
//
// 2026-11-11 전에는 머리와 막대 없이 달 띠 + 카드 격자였다. 실물의 날짜순 목록은 한 줄에 하나인 줄이라
// 본문이 오는 순간 격자가 줄로 바뀌고 머리, 막대만큼 아래로 밀렸다(사용자 "로딩은 한 줄에 2~3개씩인데"). 마디 뼈대는 ./skeletons.
// 달 띠는 sticky 띠라 높이(--month-nav-h)를 그대로 잡는다. 띠의 좌우 넘침(-mx)도 실물과 같게 둔다.
import { Bone, SectionHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";
import { FilterBarSkeleton } from "@/app/(public)/games/skeletons";
import { MonthGamesSkeleton, UpcomingHeadSkeleton } from "@/app/(public)/upcoming/skeletons";

const MONTH_TABS = 7; // 실물은 오늘부터 대여섯 달 + 해 머리 — 넓은 화면 한 줄을 채우는 수
const SKELETON_ROWS = 8; // 첫 화면을 채우는 줄 수(실물 한 쪽은 UPCOMING_PAGE_SIZE 24)

export default function UpcomingLoading() {
  return (
    <SkeletonPage gap={20}>
      <UpcomingHeadSkeleton />
      {/* 좁은 화면 막대는 알약 둘(장르, 플랫폼)이다 — 정렬은 그 폭에서 숨는다(upcoming-filter-bar). 넓은 화면은 공용 뼈대 그대로 */}
      <div className="flex h-9 gap-2 sm:hidden">
        <Bone className="h-9 w-[104px] shrink-0 rounded-full" />
        <Bone className="h-9 w-[112px] shrink-0 rounded-full" />
      </div>
      <div className="max-sm:hidden">
        <FilterBarSkeleton chips={false} />
      </div>
      <div className="flex flex-col gap-5">
        <div className="-mx-5 flex h-[var(--month-nav-h)] items-center gap-1.5 overflow-hidden border-b border-line px-5 sm:-mx-7 sm:px-7">
          {/* 실물(upcoming-month-nav): 해 머리 글자 + 36px 달 칩이 한 줄로 잇는다 */}
          {/* 좁은 화면은 맨 앞에 "전체" 칩이 선다(보기 전환 대신) */}
          <Bone className="mr-1 h-9 w-[58px] shrink-0 rounded-full sm:hidden" />
          <Bone className="mr-0.5 h-3.5 w-11 shrink-0" />
          {Array.from({ length: MONTH_TABS }).map((_, i) => (
            <Bone key={i} className="h-9 w-[76px] shrink-0 rounded-full" />
          ))}
        </div>
        <section className="flex flex-col gap-4">
          <SectionHeadSkeleton width="w-40" />
          <MonthGamesSkeleton rows={SKELETON_ROWS} picks />
        </section>
      </div>
    </SkeletonPage>
  );
}
