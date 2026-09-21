// 목록 화면이 스트리밍되는 동안 자리를 지키는 뼈대.
// 왜 loading.tsx 가 아니라 여기인가: 필터를 눌러 주소만 바뀌는 이동은 같은 세그먼트 안의 갱신이라
// loading.tsx 가 다시 뜨지 않는다. 그래서 경계를 페이지 안(Suspense)에 두고, 그 자리만 뼈대로 받는다.
// 높이는 실제 화면을 재서 맞춘 값이다 — 어긋나면 본문이 들어올 때 통째로 밀려 그게 깜빡임이 된다.
import { GAMES_GRID_CLASS } from "@/lib/games/grid";

export function FiltersSkeleton() {
  return (
    <div className="hidden flex-col gap-[26px] lg:flex" aria-hidden>
      {/* 기둥에 서는 무리는 셋이다 — 정렬 드롭다운, 플랫폼 칩 셋, 장르 드롭다운(game-filters/groups).
          뼈대가 실물보다 길면 본문이 올 때 기둥이 줄면서 목록까지 한 번 밀린다 */}
      {[1, 3, 1].map((rows, g) => (
        <div key={g} className="flex flex-col gap-2.5">
          <div className="skeleton h-3.5 w-14 rounded" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="skeleton h-7 w-16 rounded-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 카드 수를 한 페이지 전부로 받는 이유: 뼈대가 실제 목록보다 짧으면 그 순간 문서가 줄어든다.
 * 스크롤이 문서 끝을 넘으면 브라우저가 위로 당겨 붙이고, 본문이 와서 다시 길어지면 제자리로 돌아간다 —
 * 그게 "위로 튀었다 내려오는" 움직임이다.
 *
 * 그래서 칸 수뿐 아니라 카드 안쪽 줄도 실물과 같은 수로 세운다(2026-09-15 실측: 뼈대 185px 대 실물 273px,
 * 12줄이면 1,000px 넘게 어긋나 본문이 올 때 화면이 통째로 밀렸다). 줄 높이는 game-card 의
 * 제목 줄, 부제 줄, 스토어 줄 셋을 잰 값이다(2026-09-21 리디자인으로 네 줄에서 셋이 됐다).
 */
export function GamesGridSkeleton({ cards }: { cards: number }) {
  return (
    <div className={`${GAMES_GRID_CLASS} skeleton-delay`} aria-busy="true" aria-label="목록을 불러오는 중">
      {Array.from({ length: cards }).map((_, i) => (
        // 커버 + 세 줄. 실물(game-card)과 같은 줄 수, 같은 여백이어야 본문이 올 때 격자가 밀리지 않는다
        <div key={i} className="flex flex-col gap-3">
          <div className="skeleton aspect-[460/215] rounded-[var(--radius-cover)]" />
          <div className="flex flex-col gap-1 pt-3">
            <div className="skeleton h-[22px] w-4/5 rounded" />
            <div className="skeleton h-[17px] w-3/5 rounded" />
            <div className="skeleton h-4 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
