// 가격 변동 화면 뼈대 — 실물(page.tsx)과 같은 꼴로 선다: 되돌아가기, 커버 + 제목 머리, 요약 판 셋, 그래프 판(제목, 칩 줄 둘, 288/384px), 플랫폼별 판 격자.
// 상세(games/[slug]/loading)의 커버 머리를 물려받으면 그래프가 올 자리에 커버가 떠서 이 화면만 따로 둔다.
// 2026-11-23 화면을 판 꼴로 손보며 뼈대도 다시 맞췄다 — 전에는 2026-10-27 이전의 띠와 표 꼴이 남아 있어 실물이 뜨는 순간 모양이 통째로 바뀌었다.
// 그래프 높이는 price-chart 의 h-72 sm:h-96 그대로다 — 이 판이 화면에서 제일 크니 여기가 어긋나면 아래 판이 통째로 밀린다.
import { Bone, ChipsSkeleton, SectionHeadSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const PLATFORM_CARDS = 3; // 플랫폼 수의 흔한 값(스팀, PS, 스위치)
const CARD = "flex flex-col gap-2 rounded-[var(--radius-panel)] bg-surface p-5 shadow-[var(--elev-card)]";

export default function PricesLoading() {
  return (
    <SkeletonPage gap={22}>
      <Bone className="h-4 w-28" />

      <div className="flex items-center gap-4">
        <Bone className="aspect-[460/215] w-[120px] shrink-0 rounded-[var(--radius-cover)] sm:w-[150px]" />
        <div className="flex min-w-0 flex-col gap-2">
          <Bone className="h-4 w-28" />
          <Bone className="h-[30px] w-[220px] sm:h-[35px]" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className={CARD}>
          <Bone className="h-4 w-32" />
          <Bone className="h-[30px] w-44 sm:h-[34px]" />
          <Bone className="h-4 w-36" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className={CARD}>
            <Bone className="h-4 w-24" />
            <Bone className="h-7 w-28" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-4 shadow-[var(--elev-card)] sm:p-6">
        <SectionHeadSkeleton size="sub" width="w-28" />
        <ChipsSkeleton count={3} />
        <ChipsSkeleton count={4} />
        <Bone className="h-72 w-full rounded-xl sm:h-96" />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeadSkeleton width="w-32" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PLATFORM_CARDS }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface p-4 shadow-[var(--elev-card)]">
              <div className="flex items-center justify-between">
                <Bone className="h-5 w-20" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-7 w-28" />
              <div className="grid grid-cols-3 gap-2 border-t border-line-soft pt-3">
                <Bone className="h-8 w-14" />
                <Bone className="h-8 w-16" />
                <Bone className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
