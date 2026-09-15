// 목록 화면이 스트리밍되는 동안 자리를 지키는 뼈대.
// 왜 loading.tsx 가 아니라 여기인가: 필터를 눌러 주소만 바뀌는 이동은 같은 세그먼트 안의 갱신이라
// loading.tsx 가 다시 뜨지 않는다. 그래서 경계를 페이지 안(Suspense)에 두고, 그 자리만 뼈대로 받는다.
// 높이는 실제 화면을 재서 맞춘 값이다 — 어긋나면 본문이 들어올 때 통째로 밀려 그게 깜빡임이 된다.
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
 * 그게 "위로 튀었다 내려오는" 움직임이다. 격자 설정이 같으니 카드 수가 같으면 높이도 같다.
 */
export function GamesGridSkeleton({ cards }: { cards: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4 skeleton-delay" aria-busy="true" aria-label="목록을 불러오는 중">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className={cardClass("overflow-hidden")}>
          <div className="skeleton aspect-[460/215]" />
          <div className="flex flex-col gap-2 p-[15px]">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
