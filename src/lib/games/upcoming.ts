// 출시예정 화면의 달 탭 띠가 쓰는 순수 함수.
//
// 서버 화면(page)과 클라이언트 띠(upcoming-month-nav)가 같은 닻 이름을 써야 해서 여기 둔다 —
// "use client" 파일에서 내보낸 함수는 서버 컴포넌트에서 평범한 함수로 부를 수 없다.

/** 달 마디의 닻. 달 열쇠("2026-10")를 그대로 쓰면 주소에 그 달이 보인다 — 공유한 링크가 말이 된다 */
export const monthAnchor = (key: string) => `m${key}`;

export type MonthTab = { key: string; month: string; total: number };
export type YearGroup = { year: string; months: MonthTab[] };

/**
 * 탭을 연도로 묶는다(2026-09-22 2차, 사용자 지적: "년도도 반복되고").
 * 칸마다 "2026년" 을 붙이면 같은 글자가 네 번 서고 정작 골라야 하는 달이 그 뒤에 묻힌다.
 * 연도는 어디서 바뀌는지만 알면 되므로 묶음 머리로 한 번만 세운다.
 */
export function byYear(months: { key: string; total: number }[]): YearGroup[] {
  const out: YearGroup[] = [];
  for (const m of months) {
    const [year, month] = m.key.split("-");
    // 달 열쇠는 날짜 오름차순이라 같은 해가 반드시 붙어 온다 — 맨 뒤 묶음만 보면 된다
    let bucket = out[out.length - 1];
    if (bucket?.year !== year) {
      bucket = { year, months: [] };
      out.push(bucket);
    }
    bucket.months.push({ key: m.key, month: `${Number(month)}월`, total: m.total });
  }
  return out;
}

/**
 * 지금 읽고 있는 달. 마디 윗변(문서 기준, 위에서부터 오름차순)과 눈금(가려지는 띠 아래 선)을 받아
 * 눈금을 이미 지나간 마지막 마디를 고른다. 아무것도 안 지났으면 첫 달이다 — 맨 위에서도 탭 하나는 켜져 있어야
 * "지금 어디" 가 읽힌다.
 */
export function activeMonthIndex(tops: number[], line: number): number {
  let idx = 0;
  for (let i = 0; i < tops.length; i++) {
    if (tops[i] <= line) idx = i;
    else break;
  }
  return idx;
}
