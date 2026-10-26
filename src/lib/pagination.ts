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

/**
 * 주소의 page 값을 쪽 번호로. 사람이 손으로 고치는 값이라 무엇이 와도 1 이상 정수로 떨어뜨린다.
 * 배열(?page=2&page=3)이면 첫 값을 쓴다. 너무 큰 값은 서비스가 빈 쪽을 돌려줄 뿐이라 위로는 자르지 않는다.
 */
export function readPageParam(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
