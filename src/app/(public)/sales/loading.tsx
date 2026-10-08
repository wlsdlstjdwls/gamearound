// 세일 일정 스켈레톤 — 제목 + 설명 문단 + 오른쪽 단추, 진행 중 회차의 연보라 큰 판, 예정 회차 헤어라인 줄, 회색 각주.
//
// 이 화면에는 카드가 하나도 없다. 루트 스켈레톤(카드 격자)을 빌려 쓰면 커버 열두 장이 떴다가
// 글자 줄 몇 개로 바뀌어, 기다리는 동안 본 모양이 아무것도 말해 주지 않았다.
// 진행 중 회차가 없는 기간도 있지만 판을 세운다 — 세일이 돌 때 판 높이만큼 밀리는 쪽이 더 크게 튄다.
import { Bone, PageHeadSkeleton, RowsSkeleton, SkeletonPage } from "@/components/ui/skeleton";

const SALE_ROWS = 4; // 실물 예정 회차는 봄, 여름, 가을, 겨울 정기 세일 넷 안팎이다

export default function SalesLoading() {
  return (
    <SkeletonPage gap={30}>
      <PageHeadSkeleton width="w-36" desc={2} action="w-[132px] rounded-full" />

      {/* 진행 중 회차 — 꼬리표 줄 + 연보라 판(이름, 기간, 설명 / 오른쪽 큰 카운트다운) */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3">
          <Bone className="h-3.5 w-20" />
          <Bone className="h-3.5 w-24" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 rounded-[var(--radius-cover-lg)] bg-acc-soft px-6 py-6 sm:px-[26px]">
          <div className="flex min-w-0 flex-col gap-2.5">
            <Bone className="h-7 w-48 sm:h-8" />
            <Bone className="h-4 w-56" />
            <Bone className="h-4 w-[320px] max-w-full" />
          </div>
          <Bone className="h-14 w-[220px] max-w-full rounded-xl" />
        </div>
      </div>

      <section className="flex flex-col gap-3.5">
        <Bone className="h-3.5 w-20" />
        <RowsSkeleton
          rows={SALE_ROWS}
          renderRow={() => (
            <div className="flex items-center gap-4 py-[15px]">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Bone className="h-5 w-40" />
                <Bone className="h-3.5 w-32" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <Bone className="h-3 w-12" />
                <Bone className="h-6 w-24" />
              </div>
            </div>
          )}
        />
      </section>

      <Bone className="h-[88px] max-w-[760px] rounded-xl" />
    </SkeletonPage>
  );
}
