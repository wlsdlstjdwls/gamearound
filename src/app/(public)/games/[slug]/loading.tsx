// 상세 페이지 스켈레톤 — 본문과 같은 셸(Page), 같은 골격을 쓴다(2026-10-26 목업 v2.0 구성으로 다시 맞췄다).
// 히어로 3단 [커버 | 정보 + 평점 | 버튼 + 플레이타임] 과 가격 카드 격자, 그래프 + 예측 줄까지만 그린다 —
// 첫 화면에 걸리는 것이 거기까지다. 뼈대가 어긋나면 스켈레톤이 걷히는 순간 본문이 통째로 밀린다.
// enter={false} + skeleton-delay: 스켈레톤은 페이드하지 않고, 응답이 --skeleton-delay 보다 느릴 때만 떠오른다.
import { Page } from "@/components/ui/page";

/** 가격 카드 자리 수 — 넓은 화면 한 줄(lg 4장) */
const CARD_SLOTS = 4;

export default function GameDetailLoading() {
  return (
    <Page pad="detail" gap={28} enter={false} className="skeleton-delay" aria-busy="true" aria-label="게임 정보를 불러오는 중">
      {/* 브레드크럼 */}
      <div className="flex h-6 items-center">
        <div className="skeleton h-4 w-20 rounded" />
      </div>

      {/* 히어로 — 본문(game-detail/hero)과 같은 격자 */}
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2 lg:grid-cols-[minmax(0,420fr)_minmax(0,420fr)_minmax(0,368fr)] lg:gap-x-10">
        <div className="skeleton aspect-[16/9] w-full rounded-[var(--radius-panel)] md:aspect-auto md:min-h-[270px]" />
        <div className="flex min-w-0 flex-col gap-3">
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-[38px] w-[300px] max-w-full rounded" />
          <div className="flex gap-1.5">
            <div className="skeleton h-8 w-16 rounded-full" />
            <div className="skeleton h-8 w-20 rounded-full" />
          </div>
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-4/5 rounded" />
          <div className="mt-auto grid grid-cols-3 gap-2.5 pt-2">
            <div className="skeleton h-[92px] rounded-[var(--radius-md)]" />
            <div className="skeleton h-[92px] rounded-[var(--radius-md)]" />
            <div className="skeleton h-[92px] rounded-[var(--radius-md)]" />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3 md:col-span-2 lg:col-span-1">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="skeleton h-12 rounded-[var(--radius-sm)]" />
            <div className="skeleton h-12 rounded-[var(--radius-sm)]" />
          </div>
          <div className="skeleton min-h-[150px] flex-1 rounded-[var(--radius-panel)]" />
        </div>
      </div>

      {/* 플랫폼별 가격 비교 */}
      <div className="flex flex-col gap-3.5">
        <div className="skeleton h-[26px] w-44 rounded" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {Array.from({ length: CARD_SLOTS }, (_, i) => (
            <div key={i} className="skeleton h-[250px] rounded-[var(--radius-md)]" />
          ))}
        </div>
      </div>

      {/* 가격 변동 추이 + 할인 예측 */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="skeleton h-[340px] rounded-[var(--radius-panel)]" />
        <div className="skeleton h-[260px] rounded-[var(--radius-panel)]" />
      </div>
    </Page>
  );
}
