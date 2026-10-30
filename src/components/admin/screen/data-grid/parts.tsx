"use client";
// 공통 그리드의 머리 줄, 위 띠(찾기, 그리드 단추), 아래 띠(건수, 쪽 크기, 쪽 넘김). 본체는 index.tsx.
// 머리는 칸 성격과 상관없이 가운데 정렬하고 몸통보다 한 단 진한 면에 둔다 — 백오피스 표처럼 머리와 몸통이 한눈에 갈린다.
import { cn } from "@/lib/cn";
import { ChevronDownIcon, ChevronLeftIcon } from "@/components/ui/icons";
import { GRID_MESSAGES as M } from "@/lib/admin/messages";
import { useId } from "react";
import { FormSelect } from "@/components/ui/select/fields";
import { GRID_PAGE_ALL, type SortState } from "@/lib/admin/grid";
import type { GridCol } from "@/components/admin/screen/data-grid";

export function HeadRow<T>({
  columns,
  template,
  sort,
  onSort,
  check,
}: {
  columns: GridCol<T>[];
  template: string;
  sort: SortState;
  onSort: (key: string) => void;
  check?: { all: boolean; some: boolean; toggle: () => void };
}) {
  return (
    <div role="row" data-grid-head className="sticky top-0 z-[1] grid items-stretch border-b border-line-strong bg-surface-3 text-[11.5px] font-bold text-ink-2" style={{ gridTemplateColumns: template }}>
      {check && (
        <span role="columnheader" className={cn(CELL, "justify-center border-line-strong")}>
          <input
            type="checkbox"
            aria-label={M.checkAll}
            checked={check.all}
            ref={(el) => {
              if (el) el.indeterminate = check.some && !check.all;
            }}
            onChange={check.toggle}
            className="size-4 accent-[var(--acc)]"
          />
        </span>
      )}
      <span role="columnheader" className={cn(CELL, "justify-center border-line-strong px-2 py-2")}>
        {M.no}
      </span>
      {columns.map((c) => {
        const sortable = c.sortable !== false && Boolean(c.value);
        const dir = sort?.key === c.key ? sort.dir : null;
        const label = (
          <>
            {c.required && (
              <span aria-hidden className="text-danger">
                *
              </span>
            )}
            {c.label}
            {dir && <ChevronDownIcon size={12} className={cn("ml-0.5 inline align-[-1px]", dir === "asc" && "rotate-180")} />}
          </>
        );
        return (
          <span
            key={c.key}
            role="columnheader"
            aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
            // 고칠 수 있는 칸은 머리 글자색을 달리한다(백오피스 netjs-edit 머리)
            className={cn(CELL, "border-line-strong", c.editable && "text-acc")}
          >
            {sortable ? (
              <button type="button" onClick={() => onSort(c.key)} className="w-full self-stretch truncate px-2 py-2 text-center hover:text-acc">
                {label}
              </button>
            ) : (
              <span className="block w-full truncate px-2 py-2 text-center">{label}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** 칸 하나 — 줄 높이를 다 채워 세로선이 위아래로 이어진다. 마지막 칸은 판 테두리가 선을 맡는다 */
export const CELL = "flex min-w-0 items-center border-r last:border-r-0";
/** 몸통 칸 — 세로선은 머리보다 한 단 옅게 */
export const BODY_CELL = `${CELL} border-line`;

export function justifyClass(align: GridCol<unknown>["align"]) {
  return align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
}

export function alignClass(align: GridCol<unknown>["align"]) {
  return align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
}

export function TopBar({ label, query, onQuery, tools }: { label: string; query: string | null; onQuery: (q: string) => void; tools?: React.ReactNode }) {
  if (query === null && !tools) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-4 px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-1.5">{tools}</div>
      {query !== null && (
        <input
          type="search"
          aria-label={M.searchIn(label)}
          placeholder={M.searchPlaceholder}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          className="h-9 w-[200px] rounded-lg bg-surface-2 px-3 text-[16px] text-ink outline-none placeholder:text-dim focus:shadow-[0_0_0_1px_var(--acc)] sm:text-[13px]"
        />
      )}
    </div>
  );
}

export function BottomBar({
  total,
  shown,
  checked,
  page,
  pages,
  onPage,
  size,
  extra,
}: {
  total: number;
  shown: number;
  checked: number;
  page: number;
  pages: number;
  onPage: (p: number) => void;
  /** 쪽 넘김을 켠 그리드만 — 한 쪽에 둘 줄 수 고르기 */
  size: { value: number; options: readonly number[]; onChange: (n: number) => void } | null;
  extra?: React.ReactNode;
}) {
  const pageSizeId = useId();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-2/60 px-3 py-1 text-[12px] text-dim">
      <span className="tabular-nums">
        {M.total(total)}
        {shown !== total && ` | ${M.matched(shown)}`}
        {checked > 0 && <span className="font-semibold text-acc"> | {M.checked(checked)}</span>}
        {extra && <> | {extra}</>}
      </span>
      {size && (
        <div className="flex items-center gap-1">
          {/* 쪽이 하나여도 쪽 크기 칸은 둔다 — 켠 그리드인지 아닌지가 한눈에 보이고, 줄 수를 늘려 둔 채 조회해도 칸이 사라지지 않는다 */}
          {/* 공통 드롭다운(ui/select)을 쓴다 — 브라우저 기본 select 는 펼친 목록이 이 서비스 모양이 아니었다(2026-10-30 사용자) */}
          <FormSelect
            name={pageSizeId}
            label={M.pageSize}
            hideLabel
            value={String(size.value)}
            onChange={(v) => size.onChange(Number(v))}
            className="w-[104px]"
            options={[
              ...[...new Set([...size.options, ...(size.value === GRID_PAGE_ALL ? [] : [size.value])])].sort((a, b) => a - b).map((n) => ({ value: String(n), label: M.perPage(n) })),
              { value: String(GRID_PAGE_ALL), label: M.perPageAll },
            ]}
          />
          {pages > 1 && <PageNav page={page} pages={pages} onPage={onPage} />}
        </div>
      )}
    </div>
  );
}

function PageNav({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  const btn = "press inline-flex size-8 items-center justify-center rounded-md text-[13px] text-mut hover:bg-surface-2 hover:text-ink disabled:opacity-40";
  return (
    <nav aria-label={M.pager} className="flex items-center gap-0.5">
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(1)} aria-label={M.first}>
        <ChevronLeftIcon size={14} />
        <ChevronLeftIcon size={14} className="-ml-2.5" />
      </button>
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={M.prev}>
        <ChevronLeftIcon size={14} />
      </button>
      <span className="px-2 tabular-nums text-ink-2">{M.pageOf(page, pages)}</span>
      <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={M.next}>
        <ChevronLeftIcon size={14} className="rotate-180" />
      </button>
      <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(pages)} aria-label={M.last}>
        <ChevronLeftIcon size={14} className="rotate-180" />
        <ChevronLeftIcon size={14} className="-ml-2.5 rotate-180" />
      </button>
    </nav>
  );
}
