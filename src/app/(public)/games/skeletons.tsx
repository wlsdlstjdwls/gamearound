// 목록 화면이 스트리밍되는 동안 자리를 지키는 뼈대.
// 왜 loading.tsx 가 아니라 여기인가: 필터를 눌러 주소만 바뀌는 이동은 같은 세그먼트 안의 갱신이라
// loading.tsx 가 다시 뜨지 않는다. 그래서 경계를 페이지 안(Suspense)에 두고, 그 자리만 뼈대로 받는다.
// 높이는 실제 화면을 재서 맞춘 값이다 — 어긋나면 본문이 들어올 때 통째로 밀려 그게 깜빡임이 된다.
import { GAMES_GRID_CLASS } from "@/lib/games/grid";
import { CARD_SHELL, COVER_CLASS } from "@/components/game-card";
import { cn } from "@/lib/cn";
import { ActiveFilters } from "@/components/game-filters/active";
import type { GamesQuery } from "@/lib/games-query";

/**
 * 필터 기둥의 뼈대.
 *
 * **걸린 조건만은 진짜 값으로 세운다**(2026-09-22). 이 경계가 기다리는 것은 선택지(facets, Neon 왕복)인데,
 * 걸린 조건은 주소에서 바로 나오는 값이라 기다릴 이유가 없다. 뼈대에 안 그리면 필터를 누를 때마다
 * 조건 칩이 사라졌다 돌아온다 — 방금 누른 것이 먹혔는지 확인할 유일한 표시가 그 칩이다.
 */
export function FiltersSkeleton({ filter }: { filter: GamesQuery }) {
  return (
    <>
      {/* 좁은 화면: 시트 여는 단추만 뼈대고, 그 아래 조건 띠는 실물이다(game-filters/mobile 과 같은 줄 구성).
          폭은 그림 16 + 사이 8 + "필터" + 좌우 여백을 잰 값이다 — 어긋나면 실물이 올 때 단추가 늘었다 줄어든다 */}
      <div className="flex min-w-0 flex-col border-b border-line pb-2.5 lg:hidden">
        <div className="skeleton h-[38px] w-[84px] rounded-full" aria-hidden />
        <ActiveFilters filter={filter} variant="strip" />
      </div>

      <div className="hidden flex-col gap-[26px] lg:flex">
        {/* 기둥에 서는 무리는 셋이다 — 정렬 드롭다운, 플랫폼 칩 셋, 장르 드롭다운(game-filters/groups).
            뼈대가 실물보다 길면 본문이 올 때 기둥이 줄면서 목록까지 한 번 밀린다 */}
        {[1, 3, 1].map((rows, g) => (
          <div key={g} className="flex flex-col gap-2.5" aria-hidden>
            <div className="skeleton h-3.5 w-14 rounded" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="skeleton h-7 w-16 rounded-full" />
              ))}
            </div>
          </div>
        ))}
        <ActiveFilters filter={filter} variant="column" />
      </div>
    </>
  );
}

/**
 * 카드 수를 한 페이지 전부로 받는 이유: 뼈대가 실제 목록보다 짧으면 그 순간 문서가 줄어든다.
 * 스크롤이 문서 끝을 넘으면 브라우저가 위로 당겨 붙이고, 본문이 와서 다시 길어지면 제자리로 돌아간다 —
 * 그게 "위로 튀었다 내려오는" 움직임이다.
 *
 * 그래서 칸 수뿐 아니라 카드 안쪽 줄도 실물과 같은 수로 세운다(2026-09-15 실측: 뼈대 185px 대 실물 273px,
 * 12줄이면 1,000px 넘게 어긋나 본문이 올 때 화면이 통째로 밀렸다). 줄 높이는 game-card 의
 * 배지, 제목, 값 두 줄을 잰 값이다(2026-09-29 제목과 값이 줄을 나눴다).
 */
/** gridClass: 출시예정처럼 넓은 화면에서 네 칸인 격자도 같은 뼈대를 쓴다 */
export function GamesGridSkeleton({ cards, gridClass = GAMES_GRID_CLASS }: { cards: number; gridClass?: string }) {
  return (
    <div className={`${gridClass} skeleton-delay`} aria-busy="true" aria-label="목록을 불러오는 중">
      {Array.from({ length: cards }).map((_, i) => (
        // 커버 + 세 줄(제목 두 줄, 배지, 값). 실물(game-card)과 같은 줄 수, 같은 여백이어야
        // 본문이 올 때 격자가 밀리지 않는다
        <div key={i} className={CARD_SHELL}>
          <div className={cn(COVER_CLASS, "skeleton")} />
          <div className="flex flex-col gap-1.5 px-1">
            <div className="skeleton h-[40px] w-4/5 rounded" />
            <div className="skeleton h-5 w-2/5 rounded-full" />
            <div className="mt-1 skeleton h-7 w-3/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
