"use client";
// 업무 일정 간트 차트(2026-11-04). 왼쪽 붙박이 칸에 번호와 작업명, 오른쪽에 날짜 눈금과 막대.
//
// 끌기는 마우스에서만 켠다(use-board-drag 와 같은 판단): 터치는 길게 누르기 길목이 필요하고, 없으면 차트를 훑어 내리다 막대가 딸려 온다.
// 휴대폰은 보기 전용이고 고치기는 아래 상세 폼에서 한다.
// 끄는 동안의 값은 이 부품이 쥐고(미리 보기), 손을 놓을 때 한 번만 화면 상태에 올린다 — 움직일 때마다 올리면 표와 상세가 매 프레임 다시 그려진다.
// 하위가 있는 줄의 막대는 끌 수 없다. 그 기간은 하위의 처음과 끝이라 하위를 옮겨야 바뀐다.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { Clamp } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { PLAN_MESSAGES as M } from "@/lib/admin/messages";
import { dayOffset, resizeItem, shiftDay, shiftItem, spanDays, type PlanRow, type PlanTrack } from "@/lib/admin/plan";
import { weekdayOf } from "@/lib/calendar";

/** 눈금별 하루 폭(px). 일은 날짜 숫자가 들어갈 만큼, 월은 석 달이 한 화면에 들어갈 만큼 */
export const PLAN_ZOOM_PX = { day: 28, week: 12, month: 4 } as const;
export type PlanZoom = keyof typeof PLAN_ZOOM_PX;

/** 줄 높이(px). 관리자 그리드 줄(36px)보다 낮게 — 차트는 줄 수가 많아도 한눈에 들어와야 한다 */
const ROW_H = 30;
/** 왼쪽 붙박이 칸 폭(px). 번호 + 깊이 셋 들여쓰기 + 작업명 열 자쯤 */
const LABEL_W = 280;
/** 깊이 한 단의 들여쓰기(px) */
const INDENT = 14;
/** 막대 끝 손잡이 폭(px). 이 안에서 누르면 늘이기, 밖이면 옮기기 */
const HANDLE = 7;
/** 처음 열 때 오늘을 왼쪽에서 며칠 띄워 세우나. 지난 일(마크 0)이 몇 달 앞이어도 첫 화면은 지금부터다 */
const LEAD_DAYS = 7;
/** 달 이름을 적을 최소 폭(px). 범위 첫 달이 며칠만 걸치면 이름이 반쯤 잘려 보인다 */
const MONTH_LABEL_MIN = 44;
/** 진행률 글자를 흰색으로 쓸 최소 채움(%). 이보다 적게 찬 막대는 글자가 옅은 면 위에 선다 */
const PCT_ON_FILL = 30;
/** 범위 앞뒤 여유(일). 첫 막대가 차트 왼쪽 끝에 붙지 않게 */
const PAD_BEFORE = 7;
const PAD_AFTER = 21;

/** 갈래 색. 개발 파랑(브랜드), 기획 보라, 영업 청록 — 초록은 쓰지 않는다(no-green-badges) */
export const TRACK_COLOR: Record<PlanTrack, string> = { dev: "var(--acc)", plan: "var(--plum)", sales: "var(--info)" };

type Drag = { id: string; mode: "move" | "start" | "end"; x: number; by: number };

/** 월요일로 내린다 — 주 눈금이 월요일에 서게 */
const toMonday = (iso: string) => shiftDay(iso, -((weekdayOf(iso) + 6) % 7));

function rangeOf(rows: readonly PlanRow[], today: string): { from: string; days: number } {
  const dates = rows.flatMap((r) => [r.start, r.end]).filter((v): v is string => !!v);
  dates.push(today);
  dates.sort();
  const from = toMonday(shiftDay(dates[0]!, -PAD_BEFORE));
  const to = shiftDay(dates[dates.length - 1]!, PAD_AFTER);
  return { from, days: spanDays(from, to) };
}

/** 머리 눈금 두 줄: 위는 달, 아래는 일(일 눈금) 또는 주 시작일(주 눈금). 월 눈금은 아래 줄을 비운다 */
function useScale(from: string, days: number, zoom: PlanZoom) {
  return useMemo(() => {
    const months: { at: number; span: number; label: string }[] = [];
    const ticks: { at: number; label: string; weekend?: boolean }[] = [];
    for (let i = 0; i < days; i++) {
      const iso = shiftDay(from, i);
      const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
      const last = months[months.length - 1];
      if (!last || d === 1) months.push({ at: i, span: 1, label: zoom === "month" ? `${y}.${m}` : `${y}년 ${m}월` });
      else last.span += 1;
      const wd = weekdayOf(iso);
      if (zoom === "day") ticks.push({ at: i, label: String(d), weekend: wd === 0 || wd === 6 });
      else if (zoom === "week" && wd === 1) ticks.push({ at: i, label: `${m}/${d}` });
    }
    return { months, ticks };
  }, [from, days, zoom]);
}

export function PlanGantt({
  rows,
  allRows,
  today,
  zoom,
  selected,
  onSelect,
  collapsed,
  onToggle,
  onShift,
  onResize,
  editable,
}: {
  /** 그릴 줄(접은 줄의 하위는 빠진 것) */
  rows: PlanRow[];
  /** 범위를 정할 줄 전부 — 접어도 눈금이 움직이지 않게 */
  allRows: PlanRow[];
  today: string;
  zoom: PlanZoom;
  selected: string | null;
  onSelect: (id: string) => void;
  collapsed: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onShift: (id: string, by: number) => void;
  onResize: (id: string, edge: "start" | "end", by: number) => void;
  /** 끌어서 고치기(마우스 기기, 고칠 권한) */
  editable: boolean;
}) {
  const px = PLAN_ZOOM_PX[zoom];
  const { from, days } = useMemo(() => rangeOf(allRows, today), [allRows, today]);
  const { months, ticks } = useScale(from, days, zoom);
  const [drag, setDrag] = useState<Drag | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // 열 때와 눈금을 바꿀 때만 오늘 쪽으로 굴린다 — 줄을 끌다 범위가 바뀌었다고 화면이 튀면 손이 놓친다
  const scrolledAt = useRef<number | null>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || scrolledAt.current === px) return;
    scrolledAt.current = px;
    el.scrollLeft = Math.max(0, (dayOffset(from, today) - LEAD_DAYS) * px);
  }, [px, from, today]);
  // 끈 뒤 따라오는 click 이 줄 고르기로 읽히지 않게 한 번 삼킨다
  const swallow = useRef(false);
  const width = days * px;
  const todayAt = dayOffset(from, today);
  const weekLine = `repeating-linear-gradient(to right, var(--line) 0 1px, transparent 1px ${7 * px}px)`;

  const begin = (e: React.PointerEvent<HTMLElement>, row: PlanRow) => {
    if (!editable || e.pointerType !== "mouse" || e.button !== 0 || row.hasChildren || !row.startOn) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    const mode: Drag["mode"] = row.kind === "milestone" ? "move" : x < HANDLE ? "start" : x > box.width - HANDLE ? "end" : "move";
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    setDrag({ id: row.id, mode, x: e.clientX, by: 0 });
    onSelect(row.id);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const by = Math.round((e.clientX - drag.x) / px);
    if (by !== drag.by) setDrag({ ...drag, by });
  };
  const finish = () => {
    if (!drag) return;
    if (drag.by !== 0) {
      swallow.current = true;
      if (drag.mode === "move") onShift(drag.id, drag.by);
      else onResize(drag.id, drag.mode, drag.by);
    }
    setDrag(null);
  };

  /** 끄는 중이면 미리 옮긴 기간 */
  const spanOf = (row: PlanRow): { start: string | null; end: string | null } => {
    if (!drag || drag.id !== row.id) return { start: row.start, end: row.end };
    const next = drag.mode === "move" ? shiftItem(row, drag.by) : resizeItem(row, drag.mode, drag.by);
    return { start: next.startOn, end: next.kind === "milestone" ? next.startOn : next.endOn };
  };

  return (
    <div ref={boxRef} className="relative overflow-auto rounded-lg border border-line bg-surface [@media(pointer:fine)]:max-h-[min(56vh,640px)]" role="group" aria-label={M.gantt}>
      <div className="relative" style={{ width: LABEL_W + width }}>
        {/* 머리: 달 줄 + 눈금 줄. 위로 붙는다 */}
        <div className="sticky top-0 z-20 flex border-b border-line bg-surface-2/95 text-[12px] text-dim backdrop-blur-sm">
          <div className="sticky left-0 z-10 flex shrink-0 items-end border-r border-line bg-surface-2 px-3 pb-1 font-semibold text-ink-2" style={{ width: LABEL_W }}>
            {M.colNo} | {M.colTitle}
          </div>
          <div className="relative h-[44px]" style={{ width }}>
            {months.map((m) => (
              <div key={m.at} className="absolute top-0 h-[22px] overflow-hidden whitespace-nowrap border-l border-line px-1.5 pt-[3px] font-semibold text-ink-2" style={{ left: m.at * px, width: m.span * px }}>
                {m.span * px >= MONTH_LABEL_MIN ? m.label : null}
              </div>
            ))}
            {ticks.map((t) => (
              <div
                key={t.at}
                className={cn("absolute bottom-0 h-[22px] whitespace-nowrap pt-[3px] tabular-nums", zoom === "day" ? "text-center" : "border-l border-line pl-1", t.weekend && "text-dim-2")}
                style={{ left: t.at * px, width: zoom === "day" ? px : 7 * px }}
              >
                {t.label}
              </div>
            ))}
          </div>
        </div>

        {rows.length === 0 && <p className="sticky left-0 px-4 py-8 text-[13px] text-dim">{M.empty}</p>}

        {rows.map((row) => {
          const on = row.id === selected;
          const { start, end } = spanOf(row);
          const color = TRACK_COLOR[row.track];
          const dragging = drag?.id === row.id;
          return (
            <div key={row.id} className={cn("group flex border-b border-line/70", on && "bg-acc-row")} style={{ height: ROW_H }}>
              {/* 왼쪽 붙박이 칸. 누르면 고른다, 하위가 있으면 접기 단추 */}
              <div className={cn("sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-line pr-2 text-[13px]", on ? "bg-acc-row" : "bg-surface group-hover:bg-surface-2")} style={{ width: LABEL_W, paddingLeft: 8 + row.depth * INDENT }}>
                {row.hasChildren ? (
                  <button
                    type="button"
                    onClick={() => onToggle(row.id)}
                    aria-expanded={!collapsed.has(row.id)}
                    aria-label={collapsed.has(row.id) ? M.expand(row.title) : M.collapse(row.title)}
                    className="press -ml-1 flex size-6 shrink-0 items-center justify-center rounded text-dim hover:bg-surface-2 hover:text-ink"
                  >
                    <ChevronDownIcon size={14} className={cn("transition-transform duration-fast", collapsed.has(row.id) && "-rotate-90")} />
                  </button>
                ) : (
                  <span className="w-5 shrink-0" />
                )}
                <button type="button" onClick={() => onSelect(row.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                  <span className="shrink-0 tabular-nums text-dim">{row.no}</span>
                  <Clamp className={cn("min-w-0", row.hasChildren && "font-semibold")}>{row.title}</Clamp>
                </button>
              </div>

              {/* 막대 자리. 빈 곳을 눌러도 고른다 */}
              <div
                className="relative shrink-0"
                style={{ width, backgroundImage: weekLine }}
                onClick={() => {
                  if (swallow.current) {
                    swallow.current = false;
                    return;
                  }
                  onSelect(row.id);
                }}
              >
                {start && end && row.kind === "milestone" && !row.hasChildren && (
                  <span
                    role="img"
                    aria-label={`${row.title} ${start}`}
                    onPointerDown={(e) => begin(e, row)}
                    onPointerMove={move}
                    onPointerUp={finish}
                    onPointerCancel={() => setDrag(null)}
                    className={cn("absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ring-2 ring-surface", editable && "[@media(pointer:fine)]:cursor-ew-resize")}
                    style={{ left: (dayOffset(from, start) + 0.5) * px, background: row.pct >= 100 ? "var(--dim)" : "var(--ink)" }}
                  />
                )}
                {start && end && row.kind === "milestone" && !row.hasChildren && (
                  <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[11.5px] font-semibold tabular-nums text-ink-2" style={{ left: (dayOffset(from, start) + 0.5) * px + 12 }}>
                    {start.slice(5).replace("-", "/")}
                  </span>
                )}
                {start && end && (row.kind === "task" || row.hasChildren) && (
                  <div
                    onPointerDown={(e) => begin(e, row)}
                    onPointerMove={move}
                    onPointerUp={finish}
                    onPointerCancel={() => setDrag(null)}
                    aria-label={`${row.title} ${start} ~ ${end} ${row.pct}%`}
                    className={cn(
                      "absolute overflow-hidden",
                      row.hasChildren ? "top-[11px] h-2 rounded-sm" : "top-[6px] h-[18px] rounded-[5px]",
                      editable && !row.hasChildren && "[@media(pointer:fine)]:cursor-grab",
                      dragging && "cursor-grabbing shadow-2 ring-2 ring-acc/40",
                      on && !dragging && "ring-2 ring-ink/25",
                    )}
                    style={{
                      left: dayOffset(from, start) * px,
                      width: Math.max(px, spanDays(start, end) * px),
                      background: `color-mix(in oklab, ${color} ${row.hasChildren ? 45 : 28}%, var(--surface))`,
                    }}
                  >
                    {/* 진행률만큼 진하게 채운다 */}
                    <div className="absolute inset-y-0 left-0" style={{ width: `${row.pct}%`, background: color }} />
                    {!row.hasChildren && (
                      <>
                        {/* 채운 부분이 글자 폭보다 좁으면 옅은 면 위라 흰 글자가 안 보인다 — 그때는 잉크색으로 */}
                        <span className={cn("relative flex h-full items-center px-1.5 text-[11px] font-semibold tabular-nums", row.pct >= PCT_ON_FILL ? "text-on-ink [text-shadow:0_0_2px_rgba(0,0,0,0.35)]" : "text-ink-2")}>{row.pct}%</span>
                        {editable && (
                          <>
                            <span className="absolute inset-y-0 left-0 hidden [@media(pointer:fine)]:block [@media(pointer:fine)]:cursor-ew-resize" style={{ width: HANDLE }} />
                            <span className="absolute inset-y-0 right-0 hidden [@media(pointer:fine)]:block [@media(pointer:fine)]:cursor-ew-resize" style={{ width: HANDLE }} />
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
                {/* 끄는 동안 바뀐 기간을 막대 위에 띄운다 */}
                {dragging && drag.by !== 0 && start && (
                  <span className="pointer-events-none absolute -top-0.5 z-10 -translate-y-full whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums text-on-ink" style={{ left: dayOffset(from, start) * px }}>
                    {start === end ? start : `${start} ~ ${end}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* 오늘 선. 머리 아래부터 끝까지 */}
        {todayAt >= 0 && todayAt < days && (
          <div className="pointer-events-none absolute bottom-0 top-[44px] z-[5] w-0.5 bg-danger" style={{ left: LABEL_W + (todayAt + 0.5) * px - 1 }} aria-hidden>
            <span className="absolute left-1 top-0.5 whitespace-nowrap rounded bg-danger px-1 text-[11px] font-bold text-on-ink">{M.today}</span>
          </div>
        )}
      </div>
    </div>
  );
}
