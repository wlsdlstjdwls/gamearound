// 가격 변동 화면 뼈대 — 되돌아가기, 제목, 최저가 띠(위아래 선), 그래프(칩 두 줄 + 288/384px 판), 플랫폼별 요약 표.
// 상세(games/[slug]/loading)의 커버 머리를 물려받으면 그래프가 올 자리에 커버가 떠서 이 화면만 따로 둔다.
// 그래프 높이는 price-chart 의 h-72 sm:h-96 그대로다 — 이 판이 화면에서 제일 크니 여기가 어긋나면 표가 통째로 밀린다.
import { Bone, ChipsSkeleton, PageHeadSkeleton, RowsSkeleton, SectionHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SUMMARY_ROWS = 3; // 플랫폼 수의 흔한 값(스팀, PS, 스위치) — 표 높이만 대략 맞추면 된다

export default function PricesLoading() {
  return (
    <SkeletonPage gap={30}>
      <Bone className="h-4 w-28" />
      <PageHeadSkeleton width="w-[240px]" />

      {/* 최저가 띠 — 왼쪽은 플랫폼 이름과 큰 값, 오른쪽은 기록 기준 숫자 둘 */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-y border-line py-5">
        <div className="flex flex-col gap-1.5">
          <Bone className="h-4 w-16" />
          <Bone className="h-[38px] w-44 sm:h-[44px]" />
        </div>
        <div className="flex gap-7">
          <div className="flex flex-col items-end gap-1.5">
            <Bone className="h-3 w-20" />
            <Bone className="h-5 w-28" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Bone className="h-3 w-20" />
            <Bone className="h-5 w-24" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <ChipsSkeleton count={3} />
        <ChipsSkeleton count={4} />
        <Bone className="h-72 w-full rounded-xl sm:h-96" />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeadSkeleton width="w-32" />
        <RowsSkeleton
          rows={SUMMARY_ROWS}
          renderRow={() => (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-x-3 px-4 py-[13px]">
              <Bone className="h-4 w-16" />
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-10" />
              <Bone className="h-4 w-12" />
            </div>
          )}
        />
      </div>
    </SkeletonPage>
  );
}
