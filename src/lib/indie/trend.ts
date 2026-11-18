// 증감률 — 라운지 홈 "내 개발 현황" 타일의 주, 월 변화(2026-11-18 사용자 "상승률, 상승은 빨간색 하락은 파란색, 주식처럼").
// 앞 구간이 0 이면 비율을 낼 수 없다: 이번 구간도 0 이면 "변화 없음", 이번 구간에 값이 있으면 "새로 생김"(비율 대신 그 말을 적는다).
// 무한대나 수천 % 를 적으면 숫자 하나가 판을 흔든다.

export type TrendChange = { kind: "up" | "down" | "flat"; pct: number } | { kind: "new" } | { kind: "none" };

/** cur 와 prev 의 증감. pct 는 반올림한 정수 퍼센트(부호 없이 크기만, 방향은 kind) */
export function trendChange(cur: number, prev: number): TrendChange {
  if (prev <= 0) return cur > 0 ? { kind: "new" } : { kind: "none" };
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return { kind: "flat", pct: 0 };
  return { kind: pct > 0 ? "up" : "down", pct: Math.abs(pct) };
}
