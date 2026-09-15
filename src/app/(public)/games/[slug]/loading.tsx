// 상세 페이지 스켈레톤 — 본문과 같은 셸(Page), 같은 골격을 쓴다.
// 블록 높이는 실제 상세 화면을 재서 맞춘 값이다(브레드크럼 24, 헤더 304, 본문 열 346, 사이드바 85/124).
// 뼈대가 어긋나면 스켈레톤이 걷히는 순간 본문이 통째로 밀려 올라가고, 그게 페이드로는 못 가리는 깜빡임이 된다.
// 세로 커버(3:4)를 기준으로 삼는다 — 가로 배너만 있는 게임은 소수다.
// enter={false} + skeleton-delay: 스켈레톤은 페이드하지 않고, 응답이 --skeleton-delay 보다 느릴 때만 떠오른다.
// 곧바로 그리면 응답이 빠른 화면에서 한두 프레임만 번쩍이고 사라져 그게 깜빡임이 된다.
import { Page } from "@/components/ui/page";

export default function GameDetailLoading() {
  return (
    <Page pad="detail" gap={28} enter={false} className="skeleton-delay" aria-busy="true" aria-label="게임 정보를 불러오는 중">
      {/* 브레드크럼 */}
      <div className="flex h-6 items-center">
        <div className="skeleton h-4 w-20 rounded" />
      </div>

      {/* 헤더 — 커버 + 제목/버튼/요약/장르/설명 */}
      <div className="flex flex-wrap gap-5 sm:gap-6">
        {/* 본문과 같은 자리를 잡아야 교체될 때 화면이 밀리지 않는다 — 비율 전환도 같이 따라간다(page.tsx 주석) */}
        <div className="skeleton aspect-[4/3] w-full shrink-0 rounded-xl sm:aspect-[3/4] sm:w-[190px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:min-w-[280px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="skeleton h-[34px] w-[320px] max-w-full rounded" />
              <div className="skeleton h-[18px] w-[220px] max-w-full rounded" />
            </div>
            <div className="flex shrink-0 gap-2">
              <div className="skeleton h-9 w-[104px] rounded-[9px]" />
              <div className="skeleton h-9 w-[116px] rounded-[9px]" />
            </div>
          </div>
          <div className="skeleton h-[101px] w-full rounded-xl" />
          <div className="flex gap-1.5">
            <div className="skeleton h-7 w-16 rounded-full" />
            <div className="skeleton h-7 w-20 rounded-full" />
            <div className="skeleton h-7 w-16 rounded-full" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="skeleton h-4 w-[600px] max-w-full rounded" />
            <div className="skeleton h-4 w-[560px] max-w-full rounded" />
            <div className="skeleton h-4 w-[380px] max-w-full rounded" />
          </div>
        </div>
      </div>

      {/* 본문 열 + 사이드바 — 본문과 같은 골격 */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="skeleton h-[26px] w-28 rounded" />
            <div className="skeleton h-[200px] rounded-xl" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="skeleton h-[26px] w-24 rounded" />
            <div className="skeleton h-[46px] rounded-xl" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="skeleton h-[85px] rounded-xl" />
          <div className="skeleton h-[124px] rounded-xl" />
        </div>
      </div>
    </Page>
  );
}
