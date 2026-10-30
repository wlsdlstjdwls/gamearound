// 지난 기간 대비 변화(2026-10-30). 통계 숫자 칸의 작은 글이 쓴다 — 숫자 하나만으로는 많은지 적은지 모른다.
/** 앞 기간이 0 이면 비율을 못 낸다(무한대) — null 을 돌려주고 칸은 비교 줄을 비운다 */
export function changeRate(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
