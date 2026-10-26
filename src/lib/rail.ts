// 옆으로 넘기는 줄의 모양(components/ui/rail)을 다른 자리도 같이 쓰게 꺼내 둔 클래스.
// 홈의 오늘의 할인, 출시 예정 줄은 좁은 화면에서만 이 줄이 되고 sm 부터는 격자로 돌아간다(lib/games/grid 의 HOME_FOUR_GRID_CLASS).
// rail.tsx 가 "use client" 라 서버 컴포넌트가 거기서 문자열을 가져가면 클래스가 아니라 클라이언트 참조가 온다(AGENTS 6장) — 그래서 여기 둔다.
//
// 좌우로 화면 끝까지 붙이는 음수 여백은 Page 의 좁은 화면 여백(px-5, components/ui/page)과 같아야 한다.
// 다르면 줄 첫 칸의 시작점이 위 제목과 어긋나고, 남은 몇 px 에서 카드가 잘려 보인다.
// 칸 폭 80%: 다음 칸 끝이 늘 비쳐 "옆에 더 있다" 를 모양으로 말한다(목업 390 의 오늘의 할인 줄).

/** 좁은 화면의 넘기는 줄 바탕. 위아래 몇 px 은 카드가 hover 에서 뜨는 자리다(overflow-x 가 세로도 자른다) */
export const RAIL_TRACK_CLASS = "-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto overscroll-x-contain px-5 pb-2 pt-1 [scrollbar-width:none]";

/** 넘기는 줄의 칸 하나 */
export const RAIL_ITEM_CLASS = "w-[80%] shrink-0 snap-start";
