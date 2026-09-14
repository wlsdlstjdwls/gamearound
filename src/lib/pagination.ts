// 페이지네이션 창 계산 — 순수 유틸

/** 현재 페이지 좌우로 보여줄 개수 */
const WINDOW = 2;

/**
 * [1, null, 4, 5, 6, null, 20] 형태. null 은 생략 기호(…) 자리.
 * 첫/끝 페이지는 항상 남겨 어디서든 양 끝으로 한 번에 갈 수 있게 한다.
 */
export function pageWindow(page: number, totalPages: number): Array<number | null> {
  if (totalPages <= 1) return [1];
  const nums = new Set<number>([1, totalPages]);
  for (let p = page - WINDOW; p <= page + WINDOW; p++) {
    if (p >= 1 && p <= totalPages) nums.add(p);
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const out: Array<number | null> = [];
  let prev = 0;
  for (const n of sorted) {
    // 딱 한 페이지만 비면 "…" 대신 그 번호를 그대로 넣는다 — 생략 기호가 링크보다 넓어 손해다
    if (prev && n - prev === 2) out.push(prev + 1);
    else if (prev && n - prev > 2) out.push(null);
    out.push(n);
    prev = n;
  }
  return out;
}
