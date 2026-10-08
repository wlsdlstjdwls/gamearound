// 게임 카드 뼈대 — 홈, 목록, 출시예정, 검색, 세일, 회사, 위시리스트처럼 game-card 격자가 오는 화면이 같이 쓴다.
//
// 실물(game-card)의 껍데기와 커버 상수를 그대로 가져온다. 줄 높이는 game-card 의 제목 두 줄(40),
// 배지(20), 값(28)을 잰 값이다(2026-09-15 실측: 뼈대 185px 대 실물 273px 으로 어긋나 본문이 올 때 화면이 밀렸다).
// 카드 안쪽을 화면마다 다시 그리면 그 실측이 화면 수만큼 어긋난다 — 그래서 한 곳에 둔다.
import { CARD_SHELL, COVER_CLASS } from "@/components/game-card";
import { Bone } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export function GameCardSkeleton() {
  return (
    <div className={CARD_SHELL} aria-hidden>
      <div className={cn(COVER_CLASS, "skeleton")} />
      <div className="flex flex-col gap-1.5 px-1">
        <Bone className="h-[40px] w-4/5" />
        <Bone className="h-5 w-2/5 rounded-full" />
        <Bone className="mt-1 h-7 w-3/5" />
      </div>
    </div>
  );
}

/** 카드 격자. gridClass 는 실물 화면이 쓰는 격자 상수(lib/games/grid)를 그대로 넘긴다 */
export function GameGridSkeleton({ cards, gridClass, className }: { cards: number; gridClass: string; className?: string }) {
  return (
    <div className={cn(gridClass, className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  );
}
