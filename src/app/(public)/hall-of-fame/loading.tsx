// 명예의 전당 뼈대 — 기본 화면(이번 달 주목작)을 닮게: 제목과 설명, 탭 둘 + 달 고르기, 1위 큰 판과 2, 3위 카드(1.9 : 1 : 1),
// 4~10위 줄(순위, 작은 커버, 제목과 회색 줄, 오른쪽 변동). "내 게임은 지금" 카드는 개발자 본인에게만 서서 그리지 않는다.
import { Bone, ChipsSkeleton, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

/** 4~10위 — 1~3위를 뺀 TOP 10 의 나머지 */
const REST_ROWS = 7;
const PODIUM = 2; // 2위, 3위

export default function HallOfFameLoading() {
  return (
    <SkeletonPage gap={20}>
      <PageHeadSkeleton menuScreen width="w-36" desc={1} phoneDesc={false} />
      {/* 좁은 화면: 탭(반반 칸)과 달 고르기가 흰 판 하나에 묶인다(page 주석). 높이는 390px 실측 114px(2026-11-20) */}
      <Bone className="h-[114px] w-full rounded-[var(--radius-panel)] md:hidden" />
      <div className="hidden md:flex md:flex-row md:items-center md:justify-between">
        <ChipsSkeleton count={2} />
        {/* 달 고르기(indie/month-stepper) — 흰 알약 안의 이전, 달 이름, 다음 */}
        <Bone className="h-10 w-[236px] rounded-full" />
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Bone className="min-h-[300px] rounded-[var(--radius-panel)] sm:min-h-[340px]" />
          {Array.from({ length: PODIUM }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-3.5 shadow-hair">
              <Bone className="aspect-[460/215] w-full rounded-[var(--radius-cover)]" />
              <div className="flex flex-col gap-1.5">
                <Bone className="h-[22px] w-3/4" />
                <Bone className="h-4 w-1/2" />
              </div>
              <div className="mt-auto flex items-baseline gap-3 border-t border-line-soft pt-2.5">
                <Bone className="h-7 w-20" />
                <Bone className="h-4 w-24" />
              </div>
              <Bone className="h-4 w-24" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Bone className="h-[25px] w-40" />
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: REST_ROWS }).map((_, i) => (
              // 4~10위 줄(indie/fame-rows 의 RankRow): 순위 | 작은 커버 | 제목, 회색 한 줄, 보조 줄 | 오른쪽 변동(넓은 화면은 아래 플랫폼 꼬리표).
              // 글 칸 세 줄(23 + 19 + 18, 사이 2)과 위아래 12 가 줄 높이 87px 이다(2026-11-20 390px, 1440px 실측)
              <div key={i} className="grid grid-cols-[28px_76px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[var(--radius-md)] bg-surface p-3 shadow-hair sm:grid-cols-[44px_112px_minmax(0,1fr)_auto] sm:gap-x-4">
                <Bone className="h-6 w-6 justify-self-center" />
                <Bone className="aspect-[460/215] w-full rounded-[var(--radius-cover)]" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Bone className="h-[23px] w-1/2" />
                  <Bone className="h-[19px] w-4/5" />
                  <Bone className="h-[18px] w-1/3" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Bone className="h-4 w-12" />
                  <Bone className="hidden h-[26px] w-20 rounded-lg sm:block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Bone className="h-3.5 w-80 max-w-full" />
    </SkeletonPage>
  );
}
