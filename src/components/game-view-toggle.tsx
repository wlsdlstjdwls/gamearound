// 목록 보기 전환 — 카드와 리스트.
//
// 왜 필터 기둥이 아니라 목록 머리인가: 이것은 거르는 값이 아니라 보는 값이다. 왼쪽 기둥은
// "무엇을 볼까" 를 정하는 자리고, 여기는 "지금 보고 있는 것을 어떻게 볼까" 라 결과 바로 위가 맞다.
// 좁은 화면에서는 기둥이 서랍으로 접히기 때문에 기둥에 두면 한 번 열어야 닿는다.
//
// 칩 두 개로 두고 드롭다운을 쓰지 않는 이유: 선택지가 둘뿐이라 펼치는 동작이 고르는 동작보다 비싸다
// (칩 대 드롭다운 기준은 game-filters 의 Select 주석과 같다).
import { ChipNavLink } from "@/components/ui/chip-nav";
import { DEFAULT_GAME_VIEW, GAME_VIEWS, VIEW_LABEL, type GameView } from "@/lib/games/view";
import { gamesHref, type GamesQuery } from "@/lib/games-query";

/** 보기를 바꿔도 보던 자리를 지킨다 — 목록은 훑는 화면이라 맨 위로 튀면 읽던 줄을 잃는다 */
const KEEP_SCROLL = { scroll: false } as const;

export function GameViewToggle({ query }: { query: GamesQuery }) {
  const current: GameView = query.view ?? DEFAULT_GAME_VIEW;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="목록 보기 방식">
      {GAME_VIEWS.map((v) => (
        <ChipNavLink key={v} {...KEEP_SCROLL} size="sm" href={gamesHref(query, { view: v, page: 1 })} active={current === v}>
          {VIEW_LABEL[v]}
          <span className="sr-only">로 보기</span>
        </ChipNavLink>
      ))}
    </div>
  );
}
