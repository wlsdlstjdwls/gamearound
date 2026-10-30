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
// 쪽 넘김은 paging 하나로 켜고 끈다(켤 목록과 끌 목록의 기준은 lib/admin/grid 의 GridPaging). 쪽 크기는 아래 띠에서 바꾼다.
// 고른 줄이 다른 쪽에 있으면(자동 선택, 정렬, 찾기 뒤) 그 쪽으로 넘어간다 — 고른 줄이 안 보이는 쪽에 머물면 상세만 바뀌어 헷갈린다.
// 고른 줄은 진한 면(--acc-row) + 테두리 + 왼쪽 막대로 그린다 — 옅은 칩 면(--acc-soft)은 줄무늬, hover 와 구분되지 않았다(2026-10-30 사용자).
import { Clamp } from "@/components/ui/tooltip";
import { useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { GRID_MESSAGES as M } from "@/lib/admin/messages";
import { GRID_PAGE_ALL, GRID_PAGE_SIZES, matchesQuery, nextSort, pageOf, pageOfIndex, pageSizeOf, sortRows, sumOf, toTsv, type GridPaging, type SortState, type SortValue } from "@/lib/admin/grid";
import { useAdminStatus } from "@/components/admin/screen/status";
import { registerGrid, type GridDump } from "@/components/admin/screen/data-grid/export";
import { FitFillContext, useFitHeight } from "@/components/admin/screen/data-grid/fit";
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
  /** 안 잘려도 말풍선을 띄운다(칸에는 줄인 모양만 둘 때). 말풍선 글은 text */
  tip?: boolean;
  sortable?: boolean;
  /** 칸 안에서 고치는 칸(머리 글자색이 다르다) */
  editable?: boolean;
  required?: boolean;
  /** 합계 줄에 이 칸의 합을 둔다. 함수면 그 결과를 그대로 */
  sum?: boolean | ((rows: T[]) => React.ReactNode);
};

/** error: 저장 검사에 걸린 칸이 있는 줄(2026-10-31). 신규, 수정보다 앞선다 — 틀린 줄을 목록에서 바로 찾게 */
export type RowState = "new" | "changed" | "deleted" | "error";

const STATE_BAR: Record<RowState, string> = { new: "before:bg-plum", changed: "before:bg-acc", deleted: "before:bg-danger", error: "before:bg-danger" };

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
  paging,
  searchable = false,
  tools,
  footerExtra,
  empty,
  fit = false,
  fileKey,
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
  /** 쪽 넘김. true 면 기본 쪽 크기, 숫자면 그 크기로 켠다. 없으면 모든 줄을 한 판에(GridPaging) */
  paging?: GridPaging;
  searchable?: boolean;
  /** 그리드 위 띠 왼쪽 단추(백오피스 탭 그리드의 입력, 삭제 자리) */
  tools?: React.ReactNode;
  footerExtra?: React.ReactNode;
  empty: string;
  /** 몸통을 화면 바닥에 맞춘다(fit.ts). 넘치면 몸통만 굴러가고 머리는 붙어 있다 */
  fit?: boolean;
  /** 엑셀 파일 이름에 붙일 고른 줄의 코드와 이름(프로그램명_코드_명_날짜) */
  fileKey?: (row: T) => { code: string; name: string };
}) {
  const id = useId();
  const { say } = useAdminStatus();
  const [sort, setSort] = useState<SortState>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  // size: 쪽을 켠 그리드의 고른 쪽 크기(GRID_PAGE_ALL 이면 전체). per: 실제로 나눌 크기 — 끈 그리드와 "전체" 는 null
  const [size, setSize] = useState(() => pageSizeOf(paging));
  const per = size && size !== GRID_PAGE_ALL ? size : null;
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fitted = useFitHeight(bodyRef, fit);
  const fill = useContext(FitFillContext);
  const bodyStyle = fitted && (fill && fitted.fits ? { height: fitted.px } : { maxHeight: fitted.px });

  const valueOf = (row: T, key: string) => columns.find((c) => c.key === key)?.value?.(row);
  const filtered = useMemo(
    () => (query ? rows.filter((r) => matchesQuery(columns.map((c) => textOf(c, r)), query)) : rows),
    [rows, columns, query],
  );
  const sorted = sortRows(filtered, sort, valueOf);

  // 고른 줄, 정렬, 찾기, 쪽 크기가 바뀌면 고른 줄이 든 쪽으로 간다(없으면 첫 쪽). 렌더 중에 맞춘다 — effect 로 하면 한 번 엉뚱한 쪽이 그려졌다 넘어간다
  const followKey = per ? `${selected}|${sort?.key}|${sort?.dir}|${query}|${per}` : "";
  const [followed, setFollowed] = useState(followKey);
  if (followed !== followKey) {
    setFollowed(followKey);
    const at = selected === null ? -1 : sorted.findIndex((r) => rowKey(r) === selected);
    if (per) setPage(at >= 0 ? pageOfIndex(at, per) : 1);
  }
  const paged = per ? pageOf(sorted, page, per) : { rows: sorted, page: 1, pages: 1 };
  const offset = per ? (paged.page - 1) * per : 0;
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
  // 오른쪽 정렬 칸의 원값이 숫자면 숫자로 내보낸다 — 엑셀에서 천 단위 쉼표 서식이 붙고 합계, 정렬이 된다
  const dump = (): GridDump => {
    const picked = fileKey && selected !== null ? rows.find((r) => rowKey(r) === selected) : undefined;
    return {
      label,
      head: columns.map((c) => c.label),
      rows: sortRows(rows, sort, valueOf).map((r) =>
        columns.map((c) => {
          const v = c.align === "right" ? c.value?.(r) : undefined;
          return typeof v === "number" ? v : textOf(c, r);
        }),
      ),
      pick: picked && fileKey ? fileKey(picked) : null,
    };
  };
  const dumpRef = useRef(dump);
  useEffect(() => {
    dumpRef.current = dump;
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
      <div ref={bodyRef} role="grid" aria-label={label} aria-rowcount={sorted.length} className="overflow-auto overscroll-contain" style={bodyStyle || undefined}>
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
                    i % 2 === 1 && !on && "bg-surface-2/40",
                    onSelect && "cursor-pointer",
                    on ? "bg-acc-row font-semibold text-ink shadow-[inset_0_0_0_1px_var(--acc)]" : onSelect && "hover:bg-surface-2",
                    rowTone?.(row) === "muted" && !on && "text-dim",
                    st === "deleted" && "line-through",
                    st && cn("before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full", STATE_BAR[st]),
                    !st && on && "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-acc",
                  )}
                  style={{ gridTemplateColumns: template }}
                >
                  {check && (
                    <span role="gridcell" className={cn(BODY_CELL, "justify-center")} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={M.checkRow(offset + i + 1)} checked={checked.has(key)} onChange={() => toggleOne(key)} className="size-4 accent-[var(--acc)]" />
                    </span>
                  )}
                  <span role="gridcell" className={cn(BODY_CELL, "justify-center text-[12px] tabular-nums", on ? "font-bold text-acc" : "text-dim")}>
                    {st ? <span className={cn("text-[11px] font-bold", st === "error" ? "text-danger" : "text-acc")}>{M.stateLabels[st]}</span> : offset + i + 1}
                  </span>
                  {columns.map((c) => (
                    <span key={c.key} role="gridcell" data-grid-value data-grid-text={textOf(c, row)} className={cn(BODY_CELL, "px-2", justifyClass(c.align), c.align === "right" && "tabular-nums")}>
                      {/* 잘린 칸은 올리면 전체 글이 말풍선으로 뜬다(2026-10-30 사용자 "셀 툴팁 공통화"). title 속성은 쓰지 않는다(AGENTS §3) */}
                      <Clamp text={textOf(c, row)} always={c.tip} className={cn("min-w-0 max-w-full", alignClass(c.align))}>
                        {c.render ? c.render(row) : textOf(c, row)}
                      </Clamp>
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
      <BottomBar
        total={rows.length}
        shown={filtered.length}
        checked={check ? checked.size : 0}
        page={paged.page}
        pages={paged.pages}
        onPage={setPage}
        size={size !== null ? { value: size, options: GRID_PAGE_SIZES, onChange: setSize } : null}
        extra={footerExtra}
      />
    </div>
  );
}
