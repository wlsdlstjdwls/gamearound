// 홈 "오늘의 할인" 넷을 고른다(기획서 v2.0 S-01 "할인율 높은 출시작 4개").
//
// 할인율만으로 세우지 않는 이유: 2026-09-21 에 할인율순을 인기순으로 바꾼 사정(services/games/home 의 discountRowsQ 주석)이
// 그대로 남아 있다 — 할인율 맨 위는 대개 많이 깎인 묵은 게임이다. 그래서 인기순으로 받은 줄의 앞 몇 칸을 웅덩이로 두고,
// 그 안에서 할인율이 큰 순으로 넷을 세운다. 기획서의 "할인율 높은" 과 사용자가 정한 "살 만한 것" 을 함께 지킨다.
import type { GameSummary } from "@/server/services/games";

export function pickTopDeals(list: GameSummary[], limit: number, pool: number): GameSummary[] {
  return list
    .slice(0, pool)
    .map((game, order) => ({ game, order }))
    // 할인율이 같으면 인기 순서를 지킨다 — sort 는 안정 정렬이지만 비교식에 순서를 적어 두면 읽는 사람이 묻지 않는다
    .sort((a, b) => (b.game.best?.discountPct ?? 0) - (a.game.best?.discountPct ?? 0) || a.order - b.order)
    .slice(0, limit)
    .map(({ game }) => game);
}
