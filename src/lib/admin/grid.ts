// 관리자 공통 그리드(components/admin/screen/data-grid)의 계산 — 정렬, 찾기, 쪽 나누기, 합계.
// 화면과 떼어 순수 함수로 둔다(테스트를 붙인다). 신세계TV 백오피스 그리드(CwarePanel)가 하던 일 중
// 머리 눌러 정렬, 그리드 안 찾기(live search), 쪽 표시(PagingToolbar), 합계 줄(CwareSummary)을 옮겼다.

export type SortDir = "asc" | "desc";
export type SortState = { key: string; dir: SortDir } | null;
export type SortValue = string | number | boolean | Date | null | undefined;

const collator = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });

/** 두 값 비교. 빈 값은 늘 뒤로(오름, 내림 모두) — 빈 줄이 맨 위로 올라와 목록을 가리지 않게 */
export function compareValues(a: SortValue, b: SortValue): number {
  const empty = (v: SortValue) => v === null || v === undefined || v === "";
  if (empty(a) || empty(b)) return empty(a) === empty(b) ? 0 : empty(a) ? 1 : -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(b) - Number(a);
  return collator.compare(String(a), String(b));
}

/** 정렬한 새 배열. 같은 값끼리는 처음 순서를 지킨다(안정 정렬) */
export function sortRows<T>(rows: readonly T[], sort: SortState, valueOf: (row: T, key: string) => SortValue): T[] {
  if (!sort) return [...rows];
  const sign = sort.dir === "asc" ? 1 : -1;
  return rows
    .map((row, i) => ({ row, i }))
    .sort((x, y) => {
      const c = compareValues(valueOf(x.row, sort.key), valueOf(y.row, sort.key));
      // 빈 값을 뒤로 보내는 규칙은 내림에서도 뒤집지 않는다
      const blankFirst = compareValues(valueOf(x.row, sort.key), null) === 0 || compareValues(valueOf(y.row, sort.key), null) === 0;
      return (c === 0 ? 0 : blankFirst ? c : c * sign) || x.i - y.i;
    })
    .map((x) => x.row);
}

/** 머리를 누를 때마다 오름 → 내림 → 정렬 없음 */
export function nextSort(cur: SortState, key: string): SortState {
  if (!cur || cur.key !== key) return { key, dir: "asc" };
  return cur.dir === "asc" ? { key, dir: "desc" } : null;
}

/** 그리드 안 찾기. 대소문자, 띄어쓰기를 가리지 않는다 */
export function matchesQuery(texts: readonly string[], query: string): boolean {
  const q = query.replace(/\s+/g, "").toLowerCase();
  if (!q) return true;
  return texts.some((t) => t.replace(/\s+/g, "").toLowerCase().includes(q));
}

/** 쪽 나누기. 쪽 번호는 1부터, 범위를 넘으면 끝 쪽으로 붙인다 */
/**
 * 쪽 넘김을 켜고 끄는 값. 그리드마다 숫자를 따로 적던 것(50, 20)을 한곳으로 모았다.
 * 켠다: 쌓이기만 하는 목록(결제, 회원, 이력, 승인 큐, 게시글) — 수백 줄을 한 번에 그리면 고른 줄을 찾느라 굴린다.
 * 끈다: 몇 줄로 끝나는 설정 목록(전시, 상품, 프로모션, 스토어별 수집, 게임 한 건의 탭) — 쪽을 나누면 한눈에 보던 것을 넘겨 봐야 한다.
 */
export type GridPaging = boolean | number | undefined;

/** 쪽 크기 고르기 칸의 값들. 백오피스 PagingToolbar 의 쪽 크기 고르기와 같은 자리 */
export const GRID_PAGE_SIZES = [20, 50, 100] as const;
/** 켜기만 했을 때의 쪽 크기 — 넓은 화면 한 판(줄 40px)을 두 번쯤 굴리면 끝나는 양 */
export const GRID_PAGE_SIZE = 50;

/** paging 값을 쪽 크기로. 끄면 null(모든 줄) */
export function pageSizeOf(paging: GridPaging): number | null {
  if (paging === true) return GRID_PAGE_SIZE;
  if (typeof paging === "number" && paging > 0) return paging;
  return null;
}

/** index 번째 줄이 들어 있는 쪽(1부터) */
export function pageOfIndex(index: number, size: number): number {
  return Math.floor(Math.max(0, index) / size) + 1;
}

export function pageOf<T>(rows: readonly T[], page: number, size: number): { rows: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { rows: rows.slice((p - 1) * size, p * size), page: p, pages };
}

/** 숫자 칸 합계. 숫자가 아닌 값은 건너뛴다 */
export function sumOf<T>(rows: readonly T[], valueOf: (row: T) => SortValue): number {
  return rows.reduce((n, r) => {
    const v = valueOf(r);
    return typeof v === "number" && Number.isFinite(v) ? n + v : n;
  }, 0);
}

/** 고른 줄을 표 프로그램에 붙여 넣을 수 있는 꼴(탭, 줄바꿈)로. 백오피스 그리드의 Ctrl+C(CwareClipboard) */
export function toTsv(head: readonly string[], rows: readonly (readonly string[])[]): string {
  const clean = (s: string) => s.replace(/[\t\r\n]+/g, " ").trim();
  return [head, ...rows].map((r) => r.map(clean).join("\t")).join("\n");
}
