"use client";
// 관리자 공통 그리드 — 목록이 있는 관리 화면은 이 하나를 쓴다(2026-10-29 밤, 사용자 "공통 컴포넌트 만들어 재사용, 그리드도, SBO 그리드 기능 참고").
//
// 신세계TV 백오피스 그리드(CwarePanel, Ext.grid)에서 옮긴 것:
//   순번(No) 칸, 칸 선과 줄무늬, 줄 고르기(누르기, 위아래 방향키)와 첫 줄 자동 선택, 머리 눌러 정렬(오름, 내림, 없음),
//   체크 칸으로 여러 줄 고르기, 그리드 안 찾기(live search), 합계 줄(CwareSummary), 쪽 넘김(PagingToolbar), Ctrl+C 복사(CwareClipboard),
//   줄 상태 표시(cwareAction 의 신규/수정/삭제), 고칠 수 있는 칸의 머리 글자색, 필수 칸 머리의 *.
//   칸마다 세로선, 머리 글자는 가운데(2026-10-30, 사용자 "컬럼 열 구분이 잘 안 되고 헤더는 가운데 정렬"). 몸통 칸의 정렬은 칸 성격(align)을 따른다.
// 옮기지 않은 것: 칸 폭 끌어 바꾸기, 칸 숨기기와 사람별 저장(userConfig) — 관리자가 셋뿐이라 저장할 사람별 설정이 없다.
//
// 칸 값은 value(정렬, 찾기, 복사, 엑셀에 쓰는 원값)와 render(화면에 그리는 것)로 나눈다. render 는 칸 안 고치기(입력칸, 스위치)도 된다.
// 엑셀은 이 그리드가 전체 줄을 걸어 둔 것을 받아 간다(export.ts) — 쪽을 나눠도 모든 줄이 나간다.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { GRID_MESSAGES as M } from "@/lib/admin/messages";
import { matchesQuery, nextSort, pageOf, sortRows, sumOf, toTsv, type SortState, type SortValue } from "@/lib/admin/grid";
import { useAdminStatus } from "@/components/admin/screen/status";
import { registerGrid } from "@/components/admin/screen/data-grid/export";
import { alignClass, BottomBar, BODY_CELL, HeadRow, justifyClass, TopBar } from "@/components/admin/screen/data-grid/parts";

export type GridCol<T> = {
  key: string;
  label: string;
  /** CSS grid 칸 폭(예: "120px", "minmax(0,1fr)") */
  width: string;
  align?: "left" | "right" | "center";
  /** 원값 — 정렬, 찾기, 복사, 엑셀에 쓴다. 없으면 그 칸은 정렬하지 않는다 */
  value?: (row: T) => SortValue;
  /** 내보낼 글자. 없으면 value 를 글자로 */
  text?: (row: T) => string;
  /** 화면에 그리는 것. 없으면 text */
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  /** 칸 안에서 고치는 칸(머리 글자색이 다르다) */
  editable?: boolean;
  required?: boolean;
  /** 합계 줄에 이 칸의 합을 둔다. 함수면 그 결과를 그대로 */
  sum?: boolean | ((rows: T[]) => React.ReactNode);
};

export type RowState = "new" | "changed" | "deleted";

const STATE_BAR: Record<RowState, string> = { new: "before:bg-ok", changed: "before:bg-acc", deleted: "before:bg-danger" };

/** 칸 폭의 최소 합(px). 이보다 좁을 때만 그리드가 옆으로 굴러간다 — 늘어나는 칸(1fr)이 글자 길이만큼 넓어져 늘 굴러가던 것을 막는다 */
function minWidthOf(widths: string[]): number {
  return widths.reduce((n, w) => {
    const px = /^(\d+)px$/.exec(w)?.[1] ?? /^minmax\((\d+)px/.exec(w)?.[1];
    return n + (px ? Number(px) : 80);
  }, 0);
}

function textOf<T>(c: GridCol<T>, row: T): string {
  if (c.text) return c.text(row);
  const v = c.value?.(row);
  if (v === null || v === undefined) return "";
  return v instanceof Date ? v.toISOString() : String(v);
}

export function DataGrid<T>({
  label,
  columns,
  rows,
  rowKey,
  selected = null,
  onSelect,
  autoSelectFirst = false,
  checked,
  onChecked,
  rowState,
  rowTone,
  pageSize,
  searchable = false,
  tools,
  footerExtra,
  empty,
  maxHeight,
}: {
  label: string;
  columns: GridCol<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  selected?: string | null;
  onSelect?: (key: string) => void;
  /** 고른 줄이 없으면 첫 줄을 고른다(백오피스 isLoadedSelect) */
  autoSelectFirst?: boolean;
  /** 체크 칸을 쓰면 넘긴다. 고른 줄 열쇠 묶음 */
  checked?: ReadonlySet<string>;
  onChecked?: (next: Set<string>) => void;
  rowState?: (row: T) => RowState | undefined;
  rowTone?: (row: T) => "muted" | undefined;
  pageSize?: number;
  searchable?: boolean;
  /** 그리드 위 띠 왼쪽 단추(백오피스 탭 그리드의 입력, 삭제 자리) */
  tools?: React.ReactNode;
  footerExtra?: React.ReactNode;
  empty: string;
  /** 몸통 최대 높이(CSS 값). 넘치면 몸통만 굴러가고 머리는 붙어 있다 */
  maxHeight?: string;
}) {
  const id = useId();
  const { say } = useAdminStatus();
  const [sort, setSort] = useState<SortState>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const valueOf = (row: T, key: string) => columns.find((c) => c.key === key)?.value?.(row);
  const filtered = useMemo(
    () => (query ? rows.filter((r) => matchesQuery(columns.map((c) => textOf(c, r)), query)) : rows),
    [rows, columns, query],
  );
  const sorted = sortRows(filtered, sort, valueOf);
  const paged = pageSize ? pageOf(sorted, page, pageSize) : { rows: sorted, page: 1, pages: 1 };
  const offset = pageSize ? (paged.page - 1) * pageSize : 0;
  const check = checked && onChecked;
  const template = `${check ? "40px " : ""}48px ${columns.map((c) => c.width).join(" ")}`;
  const hasSum = columns.some((c) => c.sum);

  // 첫 줄 자동 선택. 고른 줄이 목록에서 빠져도(승인해 큐에서 나감, 조회조건에 걸러짐) 첫 줄로 옮긴다 —
  // 그냥 두면 상세가 "줄을 고르세요" 로 비어 처리할 때마다 다시 눌러야 했다(2026-10-30 실측)
  // 같은 (고른 줄, 첫 줄) 짝으로는 한 번만 옮긴다 — onSelect 가 행 이동 확인을 띄우는 화면에서 취소하면 그 자리에 머물러야 하는데,
  // 매 렌더 다시 부르면 확인 팝업이 끝없이 뜬다
  const autoTried = useRef<string | null>(null);
  useEffect(() => {
    if (!autoSelectFirst || !onSelect || !sorted[0]) return;
    if (selected !== null && sorted.some((r) => rowKey(r) === selected)) return;
    const attempt = `${selected}|${rowKey(sorted[0])}`;
    if (autoTried.current === attempt) return;
    autoTried.current = attempt;
    onSelect(rowKey(sorted[0]));
  }, [autoSelectFirst, onSelect, selected, sorted, rowKey]);

  // 엑셀이 전체 줄을 받아 가게 걸어 둔다(쪽, 찾기와 상관없이 지금 정렬 순서의 모든 줄)
  const dumpRef = useRef(() => ({ label, head: columns.map((c) => c.label), rows: sortRows(rows, sort, valueOf).map((r) => columns.map((c) => textOf(c, r))) }));
  useEffect(() => {
    dumpRef.current = () => ({ label, head: columns.map((c) => c.label), rows: sortRows(rows, sort, valueOf).map((r) => columns.map((c) => textOf(c, r))) });
  });
  useEffect(() => registerGrid(id, () => dumpRef.current()), [id]);

  const select = (i: number) => {
    const row = paged.rows[i];
    if (!row || !onSelect) return;
    onSelect(rowKey(row));
    rowRefs.current[i]?.focus();
  };

  const copy = () => {
    const picked = check && checked.size > 0 ? sorted.filter((r) => checked.has(rowKey(r))) : sorted.filter((r) => rowKey(r) === selected);
    if (picked.length === 0) return;
    void navigator.clipboard?.writeText(toTsv(columns.map((c) => c.label), picked.map((r) => columns.map((c) => textOf(c, r)))));
    say(M.copied(picked.length), "ok");
  };

  const allKeys = filtered.map(rowKey);
  const allOn = check ? allKeys.length > 0 && allKeys.every((k) => checked.has(k)) : false;
  const someOn = check ? allKeys.some((k) => checked.has(k)) : false;
  const toggleAll = () => check && onChecked(allOn ? new Set([...checked].filter((k) => !allKeys.includes(k))) : new Set([...checked, ...allKeys]));
  const toggleOne = (k: string) => {
    if (!check) return;
    const next = new Set(checked);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChecked(next);
  };

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <TopBar label={label} query={searchable ? query : null} onQuery={(q) => (setQuery(q), setPage(1))} tools={tools} />
      <div role="grid" aria-label={label} aria-rowcount={sorted.length} className="overflow-auto overscroll-contain" style={maxHeight ? { maxHeight } : undefined}>
        <div style={{ minWidth: minWidthOf([...(check ? ["40px"] : []), "48px", ...columns.map((c) => c.width)]) }}>
          <HeadRow columns={columns} template={template} sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} check={check ? { all: allOn, some: someOn, toggle: toggleAll } : undefined} />
          {paged.rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-[12.5px] text-dim">{empty}</p>
          ) : (
            paged.rows.map((row, i) => {
              const key = rowKey(row);
              const on = key === selected;
              const st = rowState?.(row);
              return (
                <div
                  key={key}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  role="row"
                  data-grid-row
                  aria-selected={onSelect ? on : undefined}
                  tabIndex={onSelect ? (on || (selected === null && i === 0) ? 0 : -1) : undefined}
                  onClick={() => onSelect?.(key)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      select(i + (e.key === "ArrowDown" ? 1 : -1));
                    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") copy();
                  }}
                  className={cn(
                    "relative grid min-h-11 items-stretch border-b border-line-soft text-[13px] outline-none transition-colors duration-fast last:border-b-0 focus-visible:shadow-[inset_0_0_0_2px_var(--acc)] [@media(pointer:fine)]:min-h-10",
                    i % 2 === 1 && "bg-surface-2/40",
                    onSelect && "cursor-pointer",
                    on ? "bg-acc-soft font-semibold text-ink" : onSelect && "hover:bg-surface-2",
                    rowTone?.(row) === "muted" && !on && "text-dim",
                    st === "deleted" && "line-through",
                    st && cn("before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full", STATE_BAR[st]),
                    !st && on && "before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full before:bg-acc",
                  )}
                  style={{ gridTemplateColumns: template }}
                >
                  {check && (
                    <span role="gridcell" className={cn(BODY_CELL, "justify-center")} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={M.checkRow(offset + i + 1)} checked={checked.has(key)} onChange={() => toggleOne(key)} className="size-4 accent-[var(--acc)]" />
                    </span>
                  )}
                  <span role="gridcell" className={cn(BODY_CELL, "justify-center text-[12px] tabular-nums text-dim")}>
                    {st ? <span className="text-[11px] font-bold text-acc">{M.stateLabels[st]}</span> : offset + i + 1}
                  </span>
                  {columns.map((c) => (
                    <span key={c.key} role="gridcell" data-grid-value data-grid-text={textOf(c, row)} className={cn(BODY_CELL, "px-2", justifyClass(c.align), c.align === "right" && "tabular-nums")}>
                      <span className={cn("min-w-0 max-w-full truncate", alignClass(c.align))}>{c.render ? c.render(row) : textOf(c, row)}</span>
                    </span>
                  ))}
                </div>
              );
            })
          )}
          {hasSum && paged.rows.length > 0 && (
            <div role="row" className="grid min-h-10 items-stretch border-t border-line-strong bg-surface-2 text-[13px] font-bold text-ink" style={{ gridTemplateColumns: template }}>
              {check && <span className={BODY_CELL} />}
              <span role="gridcell" className={cn(BODY_CELL, "justify-center text-[12px] text-mut")}>
                {M.sum}
              </span>
              {columns.map((c) => (
                <span key={c.key} role="gridcell" className={cn(BODY_CELL, "px-2 tabular-nums", justifyClass(c.align))}>
                  <span className="min-w-0 max-w-full truncate">{typeof c.sum === "function" ? c.sum(filtered) : c.sum ? sumOf(filtered, (r) => c.value?.(r)).toLocaleString("ko-KR") : ""}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomBar total={rows.length} shown={filtered.length} checked={check ? checked.size : 0} page={paged.page} pages={paged.pages} onPage={setPage} extra={footerExtra} />
    </div>
  );
}
