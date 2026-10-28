// 명예의 전당 뼈대 — 기본 화면(이번 달 주목작)을 닮게: 제목과 설명, 탭 둘 + 달 고르기, 1위 큰 판과 2, 3위 카드(1.9 : 1 : 1),
// 4~10위 줄(순위 칸, 작은 커버, 이름과 보조 줄, 오른쪽 플랫폼 알약). "내 게임은 지금" 카드는 개발자 본인에게만 서서 그리지 않는다.
import { Bone, ChipsSkeleton, PageHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

/** 4~10위 — 1~3위를 뺀 TOP 10 의 나머지 */
const REST_ROWS = 7;
const PODIUM = 2; // 2위, 3위

export default function HallOfFameLoading() {
  return (
    <SkeletonPage gap={20}>
      <PageHeadSkeleton width="w-36" desc={1} />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
              <div
                key={i}
                className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 rounded-[var(--radius-md)] bg-surface p-3 shadow-hair sm:grid-cols-[96px_112px_minmax(0,1fr)_auto] sm:gap-x-4"
              >
                <div className="flex flex-col gap-1">
                  <Bone className="h-5 w-10" />
                  <Bone className="h-3.5 w-14" />
                </div>
                <Bone className="hidden aspect-[460/215] w-full rounded-[var(--radius-cover)] sm:block" />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Bone className="h-5 w-1/2" />
                  <Bone className="h-4 w-4/5" />
                </div>
                <Bone className="col-start-2 h-7 w-20 rounded-lg sm:col-start-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <Bone className="h-3.5 w-80 max-w-full" />
    </SkeletonPage>
  );
}
