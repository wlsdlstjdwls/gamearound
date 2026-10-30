"use client";
// 휴대폰 그리드 — 줄 하나를 카드 한 장으로 세운다(2026-10-30, 사용자 "그리드는 모바일에선 쓰기 힘들다, 보기 편한 다른 구조로").
// 390px 에서 칸 열 개짜리 표는 한 줄 읽을 때마다 옆으로 굴려야 했다. 카드는 제목 한 줄 + "이름표 값" 두 열이라 굴리지 않고 위에서 아래로 읽는다.
// 정렬, 찾기, 쪽 넘김, 체크는 그리드 본체(index.tsx)가 쥔 그대로 쓴다 — 여기는 그리는 것만 바꾼다.
// 카드를 누르면 줄을 고르고, 목록+상세 화면(MasterDetail)이면 상세 시트를 연다(mobile-detail). 처음 자동 선택은 시트를 열지 않는다.
import { useContext } from "react";
import { cn } from "@/lib/cn";
import { GRID_MESSAGES as M } from "@/lib/admin/messages";
import { sumOf } from "@/lib/admin/grid";
import { MobileDetailContext } from "@/components/admin/screen/mobile-detail";
import { textOf } from "@/components/admin/screen/data-grid/cells";
import type { GridCol, RowState } from "@/components/admin/screen/data-grid";

/**
 * 카드 제목 칸. 칸이 mobile: "title" 로 지목하지 않으면 남는 폭을 받는 첫 칸(폭이 fr)이다 — 화면마다 이름, 제목처럼 긴 글을 그 칸에 둔다.
 * 그런 칸이 없으면 숫자가 아닌 첫 칸(유사도, 금액처럼 오른쪽 정렬 칸은 제목감이 아니다). 상태 배지 칸이 맨 앞인 화면(게시글)에서 배지가 제목이 되던 것을 막는다
 */
function titleColumn<T>(columns: GridCol<T>[]): GridCol<T> | undefined {
  const usable = columns.filter((c) => c.mobile !== "hide");
  return columns.find((c) => c.mobile === "title") ?? usable.find((c) => c.width.includes("fr")) ?? usable.find((c) => c.align !== "right") ?? columns[0];
}

export function GridCards<T>({
  columns,
  rows,
  rowKey,
  offset,
  selected,
  onSelect,
  checked,
  onToggle,
  rowState,
  rowTone,
  sumRows,
  empty,
}: {
  columns: GridCol<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  offset: number;
  selected: string | null;
  onSelect?: (key: string) => void;
  checked?: ReadonlySet<string>;
  onToggle?: (key: string) => void;
  rowState?: (row: T) => RowState | undefined;
  rowTone?: (row: T) => "muted" | undefined;
  /** 합계 줄을 그릴 때 넘긴다(찾기로 거른 줄 전부) */
  sumRows: T[] | null;
  empty: string;
}) {
  const openDetail = useContext(MobileDetailContext);
  const title = titleColumn(columns);
  const rest = columns.filter((c) => c !== title && c.mobile !== "hide");
  const cell = (c: GridCol<T>, row: T) => (c.render ? c.render(row) : textOf(c, row));
  const summed = columns.filter((c) => c.sum);

  if (rows.length === 0) return <p className="rounded-xl border border-line bg-surface px-3 py-8 text-center text-[13px] text-dim">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row, i) => {
        const key = rowKey(row);
        const on = key === selected;
        const st = rowState?.(row);
        const pick = () => {
          onSelect?.(key);
          openDetail?.();
        };
        return (
          <li
            key={key}
            data-grid-row
            className={cn(
              "relative rounded-xl border bg-surface px-3 py-2.5 transition-colors duration-fast",
              on ? "border-acc bg-acc-row shadow-[inset_0_0_0_1px_var(--acc)]" : "border-line",
              rowTone?.(row) === "muted" && !on && "text-dim",
              st === "deleted" && "line-through",
            )}
          >
            <div className="flex items-start gap-2.5">
              {checked && onToggle && (
                // 체크 칸은 카드 누르기와 따로 논다 — 고르려다 상세가 열리면 여러 줄을 고를 수 없다
                <label className="relative z-[1] -my-1 -ml-1 flex size-11 shrink-0 items-center justify-center">
                  <input type="checkbox" aria-label={M.checkRow(offset + i + 1)} checked={checked.has(key)} onChange={() => onToggle(key)} className="size-5 accent-[var(--acc)]" />
                </label>
              )}
              {/* 카드 몸 전체가 고르기 단추다. 칸 안 입력(render 가 그린 스위치, 입력칸)은 단추 밖에 두어야 해서 단추를 덮개로 깐다 */}
              <div className="min-w-0 flex-1">
                {onSelect && <button type="button" aria-label={title ? textOf(title, row) : M.checkRow(offset + i + 1)} aria-pressed={on} onClick={pick} className="absolute inset-0 rounded-xl" />}
                <div className="flex items-baseline gap-2">
                  <span className={cn("shrink-0 text-[11.5px] font-bold tabular-nums", st ? (st === "error" ? "text-danger" : "text-acc") : "text-dim")}>{st ? M.stateLabels[st] : offset + i + 1}</span>
                  {title && <p className="min-w-0 flex-1 break-words text-[14px] font-bold leading-snug text-ink [overflow-wrap:anywhere]">{cell(title, row)}</p>}
                </div>
                {rest.length > 0 && (
                  <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
                    {rest.map((c) => (
                      <div key={c.key} className="contents">
                        <dt className="whitespace-nowrap text-[12px] text-dim">{c.label}</dt>
                        {/* 칸 안에서 고치는 칸(editable)만 덮개 단추 위로 올린다. 나머지는 눌러도 카드가 골라진다 */}
                        <dd className={cn("min-w-0 break-words text-ink-2 [overflow-wrap:anywhere]", c.align === "right" && "tabular-nums", c.editable && "relative z-[1]")}>{cell(c, row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>
          </li>
        );
      })}
      {sumRows && summed.length > 0 && (
        <li className="rounded-xl border border-line-strong bg-surface-2 px-3 py-2.5">
          <p className="text-[12px] font-bold text-mut">{M.sum}</p>
          <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px] font-bold text-ink">
            {summed.map((c) => (
              <div key={c.key} className="contents">
                <dt className="whitespace-nowrap text-[12px] font-semibold text-dim">{c.label}</dt>
                <dd className="text-right tabular-nums">{typeof c.sum === "function" ? c.sum(sumRows) : sumOf(sumRows, (r) => c.value?.(r)).toLocaleString("ko-KR")}</dd>
              </div>
            ))}
          </dl>
        </li>
      )}
    </ul>
  );
}
