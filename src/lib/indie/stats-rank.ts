// 내 게임 통계의 순위 읽기(2026-10-28, 사용자 "각 항목마다 순위도 넣어 주면 좋을 듯"). 순위 자체는 서버가 창 함수로 센다(services/indie/stats).
// 여기는 화면이 그 순위를 어떻게 말할지만 정한다 — 내 게임 여럿 중 가장 좋은 순위, 상위 몇 %, 순위 막대 위 점의 자리.
import type { IndieStatsRanks, IndieStatsRowDto } from "./dto";

export type RankKey = keyof IndieStatsRanks;

/** 내 게임들 가운데 그 항목의 가장 좋은(작은) 순위. 하나도 순위가 없으면 null */
export function bestRank(rows: readonly Pick<IndieStatsRowDto, "ranks">[], key: RankKey): number | null {
  let best: number | null = null;
  for (const r of rows) {
    const v = r.ranks[key];
    if (v !== null && (best === null || v < best)) best = v;
  }
  return best;
}

/**
 * 상위 몇 %인가(올림, 1~100). 1위는 모집단 크기와 상관없이 1% 로 말하지 않고 그대로 1위가 앞에 선다 —
 * 이 값은 순위 옆 보조 글자다. 모집단이 0 이면 null.
 */
export function topPercent(rank: number, population: number): number | null {
  if (population <= 0) return null;
  return Math.min(100, Math.max(1, Math.ceil((rank / population) * 100)));
}

/**
 * 순위 막대 위 점의 자리(0 = 맨 앞 1위, 1 = 맨 끝). 모집단이 하나뿐이면 맨 앞이다.
 * 막대는 왼쪽이 1위다 — 사람은 왼쪽부터 읽고 "앞" 을 좋은 자리로 읽는다.
 */
export function rankPosition(rank: number, population: number): number {
  if (population <= 1) return 0;
  return Math.min(1, Math.max(0, (rank - 1) / (population - 1)));
}
