// 개인화 할인 줄 채우기 — 취향에 맞는 칸을 먼저 세우고, 모자란 칸을 공통 줄로 채운다.
//
// 질의와 떼어 둔 이유: 순서와 중복 규칙만 있는 순수 함수라 DB 없이 테스트할 수 있다.
import type { GameSummary } from "./dto";

/**
 * `picked` 를 앞에, `fallback` 을 뒤에 이어 `limit` 칸을 만든다. 같은 게임(slug)은 한 번만 선다.
 *
 * 취향 칸이 아무리 적어도 결과가 공통 줄보다 짧아지지 않는다 — 겹친 게임은 앞쪽에 이미 섰으니
 * 공통 줄의 나머지가 그 자리를 메운다. 그래서 개인화한 사람의 첫 줄이 비는 일이 없다.
 */
export function fillDeals(picked: readonly GameSummary[], fallback: readonly GameSummary[], limit: number): GameSummary[] {
  const out: GameSummary[] = [];
  const seen = new Set<string>();
  for (const g of [...picked, ...fallback]) {
    if (out.length >= limit) break;
    if (seen.has(g.slug)) continue;
    seen.add(g.slug);
    out.push(g);
  }
  return out;
}
