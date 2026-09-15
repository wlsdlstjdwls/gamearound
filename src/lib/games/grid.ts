// 목록 격자 설정 — 서버가 그리는 첫 페이지, 이어 붙이는 페이지, 기다리는 동안의 뼈대가 모두 같은 값을 써야
// 카드 폭이 경계에서 바뀌지 않는다.
//
// 왜 components/games-infinite 가 아니라 lib 인가(2026-09-15): 그 파일은 "use client" 라
// 서버 컴포넌트(games/skeletons)가 여기서 상수를 가져오면 문자열이 아니라 클라이언트 참조가 넘어온다.
// 실제로 뼈대의 class 자리에 함수 소스가 박혀 격자가 풀렸고, 한 페이지치 카드가 세로로 쌓이면서
// 문서 높이가 몇 배로 튀었다 — 필터를 누를 때마다 화면이 통째로 흔들린 원인이 이것이다.
// 상수는 클라이언트 경계가 없는 곳에 둔다.
export const GAMES_GRID_CLASS = "grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4";
