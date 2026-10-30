// 그리드 칸 값 읽기(2026-10-30, data-grid/index 가 300줄을 넘어 뗐다). 표(index), 카드(cards), 엑셀이 같은 글자를 써야 해서 한 곳에 둔다.
import type { GridCol, RowState } from "@/components/admin/screen/data-grid";

/** 줄 상태 막대 색(신규, 수정, 삭제, 오류) */
export const STATE_BAR: Record<RowState, string> = { new: "before:bg-plum", changed: "before:bg-acc", deleted: "before:bg-danger", error: "before:bg-danger" };

/** 칸 폭의 최소 합(px). 이보다 좁을 때만 그리드가 옆으로 굴러간다 — 늘어나는 칸(1fr)이 글자 길이만큼 넓어져 늘 굴러가던 것을 막는다 */
export function minWidthOf(widths: string[]): number {
  return widths.reduce((n, w) => {
    const px = /^(\d+)px$/.exec(w)?.[1] ?? /^minmax\((\d+)px/.exec(w)?.[1];
    return n + (px ? Number(px) : 80);
  }, 0);
}

export function textOf<T>(c: GridCol<T>, row: T): string {
  if (c.text) return c.text(row);
  const v = c.value?.(row);
  if (v === null || v === undefined) return "";
  return v instanceof Date ? v.toISOString() : String(v);
}

/** 엑셀로 내보낼 칸 값. 오른쪽 정렬 칸의 원값이 숫자면 숫자로 — 엑셀에서 천 단위 쉼표 서식이 붙고 합계, 정렬이 된다 */
export function cellExport<T>(c: GridCol<T>, row: T): string | number {
  const v = c.align === "right" ? c.value?.(row) : undefined;
  return typeof v === "number" ? v : textOf(c, row);
}

/** 엑셀 파일 이름에 붙일 고른 줄의 코드와 이름 */
export function pickOf<T>(row: T | undefined, fileKey: (row: T) => { code: string; name: string }): { code: string; name: string } | null {
  return row === undefined ? null : fileKey(row);
}
