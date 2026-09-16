// 목록 보기 모드 — 카드(격자)와 리스트(한 줄).
//
// 왜 쿼리스트링인가: 이 화면의 상태는 전부 주소에 있다(page.tsx 머리 주석). 보기 모드만
// 브라우저 저장소에 두면 같은 주소가 사람마다 다른 화면이 되고, 주소를 건네받은 쪽은
// 보낸 사람이 본 것을 못 본다. 서버가 첫 화면을 그대로 그릴 수 있다는 것도 같은 이유로 중요하다.
//
// 왜 lib 인가: 이 값을 서버 컴포넌트(page, skeletons)와 클라이언트(games-infinite)가 같이 쓴다.
// "use client" 파일에 두면 서버 쪽이 가져갈 때 문자열이 아니라 클라이언트 참조가 넘어간다
// (lib/games/grid.ts 주석의 사고와 같은 자리).
import { GAMES_GRID_CLASS } from "./grid";

export const GAME_VIEWS = ["card", "list"] as const;
export type GameView = (typeof GAME_VIEWS)[number];

/** 기본은 카드다. 커버가 목록에서 게임을 알아보는 가장 빠른 단서라 처음 오는 사람에게는 이쪽이 낫다 */
export const DEFAULT_GAME_VIEW: GameView = "card";

export const VIEW_LABEL: Record<GameView, string> = {
  card: "카드",
  list: "리스트",
};

export function isGameView(v: string | undefined): v is GameView {
  return GAME_VIEWS.includes(v as GameView);
}

/**
 * 목록을 담는 ul 의 class. 서버가 그리는 첫 페이지, 이어 붙이는 페이지, 기다리는 동안의 뼈대가
 * 모두 이 함수를 거쳐야 보기를 바꿀 때 폭이나 간격이 어긋나지 않는다(grid.ts 와 같은 규칙).
 *
 * 리스트는 한 줄이 곧 한 칸이라 격자가 필요 없다 — 세로로만 쌓고 간격만 준다.
 */
export function gamesContainerClass(view: GameView): string {
  return view === "list" ? "flex flex-col gap-2" : GAMES_GRID_CLASS;
}
