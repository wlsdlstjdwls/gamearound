// 가격 갱신 한 회차의 자리 나누기 — 최근 조회된 게임, 인기 본편, 오래된 본편, 나머지(DLC, 에디션, 번들, 체험판).
//
// 순수 함수로 뗀 이유: 비율이 셋 겹치면(REFRESH_MAIN_SHARE, REFRESH_POPULAR_SHARE_BY_SOURCE, limit)
// 반올림과 상한이 어긋나기 쉽고, 어긋나면 한 몫이 조용히 0 이 된다. DB 없이 테스트로 지킨다.
// 실제 행을 고르는 일은 store-targets 가 한다. 앞 몫이 덜 채워지면 뒤 몫이 남는 자리를 가져간다.
import { REFRESH_MAIN_SHARE } from "./constants";

export type RefreshShares = {
  /** 최근 조회된 게임에 먼저 줄 수(REFRESH_VIEWED_SHARE). 본편 몫 안에서 뗀다 */
  viewed: number;
  /** 인기순으로 고를 본편 수 */
  popular: number;
  /** 본편 몫 전체(인기 + 오래된 순). 인기 몫이 덜 차면 오래된 순이 그 자리를 채운다 */
  main: number;
};

export function refreshShares(limit: number, popularShare: number = 0, viewedShare: number = 0): RefreshShares {
  if (limit <= 0) return { viewed: 0, popular: 0, main: 0 };
  const main = Math.ceil(limit * REFRESH_MAIN_SHARE);
  // 조회 몫이 먼저다 — 사람이 지금 보고 있는 게임이 인기 순위보다 앞선다(REFRESH_VIEWED_SHARE 주석)
  const viewed = Math.min(Math.ceil(limit * viewedShare), main);
  const popular = Math.min(Math.ceil(limit * popularShare), main - viewed);
  return { viewed, popular, main };
}
