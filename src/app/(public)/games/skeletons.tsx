// 목록 화면이 스트리밍되는 동안 자리를 지키는 뼈대.
// 왜 loading.tsx 가 아니라 여기인가: 필터를 눌러 주소만 바뀌는 이동은 같은 세그먼트 안의 갱신이라
// loading.tsx 가 다시 뜨지 않는다. 그래서 경계를 페이지 안(Suspense)에 두고, 그 자리만 뼈대로 받는다.
// 높이는 실제 화면을 재서 맞춘 값이다 — 어긋나면 본문이 들어올 때 통째로 밀려 그게 깜빡임이 된다.
import { gamesContainerClass, type GameView } from "@/lib/games/view";
import { cardClass } from "@/components/ui/page";

/** 건수는 <p> 안에 들어간다 — div 를 쓰면 HTML 이 <p> 를 끊어 하이드레이션이 깨진다 */
export function CountSkeleton() {
  return <span className="skeleton inline-block h-4 w-32 rounded align-middle" aria-hidden />;
}

export function FiltersSkeleton() {
  return (
    <div className={cardClass("hidden flex-col gap-4 p-4 lg:flex")} aria-hidden>
      {[3, 2, 2].map((rows, g) => (
        <div key={g} className="flex flex-col gap-1.5">
          <div className="skeleton h-3 w-12 rounded" />
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
 * 제목, 플랫폼 배지, 장르, 가격 네 줄을 잰 값이다.
 */
export function GamesGridSkeleton({ cards, view = "card" }: { cards: number; view?: GameView }) {
  return (
    <div className={`${gamesContainerClass(view)} skeleton-delay`} aria-busy="true" aria-label="목록을 불러오는 중">
      {Array.from({ length: cards }).map((_, i) =>
        view === "list" ? (
          // 줄 뼈대도 실물과 같은 뼈대로 세운다 — 커버 폭, 여백, 줄 수가 같아야 본문이 올 때 안 밀린다
          <div key={i} className={cardClass("flex items-center gap-3 p-2.5 sm:gap-3.5 sm:p-3")}>
            <div className="skeleton aspect-[460/215] w-[92px] shrink-0 rounded-[8px] sm:w-[132px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <div className="skeleton h-5 w-3/5 rounded" />
              <div className="skeleton h-4 w-2/5 rounded" />
              <div className="skeleton h-[22px] w-1/3 rounded-md" />
            </div>
            <div className="skeleton h-6 w-20 shrink-0 rounded" />
          </div>
        ) : (
          <div key={i} className={cardClass("overflow-hidden")}>
            <div className="skeleton aspect-[460/215]" />
            <div className="flex flex-col gap-[7px] p-[15px]">
              <div className="skeleton h-5 w-4/5 rounded" />
              <div className="skeleton h-[22px] w-1/2 rounded-md" />
              <div className="skeleton h-4 w-3/5 rounded" />
              <div className="skeleton h-[26px] w-2/5 rounded" />
            </div>
          </div>
        ),
      )}
    </div>
  );
}
