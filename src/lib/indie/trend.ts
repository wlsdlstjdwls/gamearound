// 증감 — 라운지 홈 "내 개발 현황" 타일의 앞 30일 대비 변화(2026-11-18 사용자 "상승은 빨간색 하락은 파란색, 주식처럼").
// 비율이 아니라 **늘고 준 개수**다(같은 날 사용자 "100% 가 아니라 몇 개 증가했는지"). 앞 구간이 0 일 때 "새로" 라고 따로 적던 것도
// 걷었다(사용자 "새로 표기는 별로") — 개수로 적으면 0 에서 4 로 는 것도 그냥 "4 늘었다" 라 따로 말할 것이 없다.

export type TrendChange = { kind: "up" | "down" | "flat"; diff: number };

/** cur 와 prev 의 차. diff 는 크기만(방향은 kind) */
export function trendChange(cur: number, prev: number): TrendChange {
  const d = cur - prev;
  return { kind: d > 0 ? "up" : d < 0 ? "down" : "flat", diff: Math.abs(d) };
}
