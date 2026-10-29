"use client";
// 공통 그리드의 머리 줄, 위 띠(찾기, 그리드 단추), 아래 띠(건수, 쪽 넘김). 본체는 index.tsx.
import { cn } from "@/lib/cn";
import { ChevronDownIcon, ChevronLeftIcon } from "@/components/ui/icons";
import { GRID_MESSAGES as M } from "@/lib/admin/messages";
import type { SortState } from "@/lib/admin/grid";
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
    <div role="row" data-grid-head className="sticky top-0 z-[1] grid items-center border-b border-line bg-surface-2 text-[11.5px] font-semibold text-mut" style={{ gridTemplateColumns: template }}>
      {check && (
        <span role="columnheader" className="flex justify-center">
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
      <span role="columnheader" className="border-r border-line-soft px-2 py-2 text-center">
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
            className={cn("min-w-0 border-r border-line-soft last:border-r-0", c.editable && "text-acc")}
          >
            {sortable ? (
              <button type="button" onClick={() => onSort(c.key)} className={cn("w-full truncate px-2 py-2 hover:text-ink", alignClass(c.align))}>
                {label}
              </button>
            ) : (
              <span className={cn("block truncate px-2 py-2", alignClass(c.align))}>{label}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function alignClass(align: GridCol<unknown>["align"]) {
  return align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
}

export function TopBar({ label, query, onQuery, tools }: { label: string; query: string | null; onQuery: (q: string) => void; tools?: React.ReactNode }) {
  if (query === null && !tools) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-2 py-1.5">
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

export function BottomBar({ total, shown, checked, page, pages, onPage, extra }: { total: number; shown: number; checked: number; page: number; pages: number; onPage: (p: number) => void; extra?: React.ReactNode }) {
  const btn = "press inline-flex size-8 items-center justify-center rounded-md text-[13px] text-mut hover:bg-surface-2 hover:text-ink disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-2/60 px-3 py-1 text-[12px] text-dim">
      <span className="tabular-nums">
        {M.total(total)}
        {shown !== total && ` | ${M.matched(shown)}`}
        {checked > 0 && <span className="font-semibold text-acc"> | {M.checked(checked)}</span>}
        {extra && <> | {extra}</>}
      </span>
      {pages > 1 && (
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
      )}
    </div>
  );
}
