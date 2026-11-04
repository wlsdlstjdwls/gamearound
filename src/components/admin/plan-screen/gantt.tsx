"use client";
// 업무 일정 간트 차트(2026-11-04). 왼쪽 붙박이 칸에 번호와 작업명, 오른쪽에 날짜 눈금과 막대.
//
// 끌기는 마우스에서만 켠다(use-board-drag 와 같은 판단): 터치는 길게 누르기 길목이 필요하고, 없으면 차트를 훑어 내리다 막대가 딸려 온다.
// 휴대폰은 보기 전용이고 고치기는 아래 상세 폼에서 한다.
// 끄는 동안의 값은 이 부품이 쥐고(미리 보기), 손을 놓을 때 한 번만 화면 상태에 올린다 — 움직일 때마다 올리면 표와 상세가 매 프레임 다시 그려진다.
// 하위가 있는 줄의 막대는 끌 수 없다. 그 기간은 하위의 처음과 끝이라 하위를 옮겨야 바뀐다.
//
// 모양(2026-11-04 2차, 사용자 "투박하다, 이쁘게"): 작업 막대는 갈래 색 옅은 알약 + 진행만큼 진한 채움, 진행률은 막대 오른쪽 바깥에,
// 상위 줄은 양 끝에 꺾쇠가 달린 얇은 요약 막대, 이정표는 갈래 색 마름모 + 날짜 알약, 주말은 옅은 면(일 눈금), 오늘은 머리의 빨간 날짜 알약 + 가는 선.
// 등장 애니메이션은 넣지 않는다 — 보기를 바꿀 때마다 막대가 자라나면 그게 곧 깜빡임으로 읽힌다(같은 요청 "깜빡이지 않게").
//
// 고치기는 차트 안에서 한다(2026-11-04 3차, 사용자 "아래 그리드, 폼 말고 차트에서 바로, 글 옆 작은 버튼으로 팝업, 노션처럼"):
// 작업명을 두 번 누르면 그 자리에서 이름을 고친다. 줄 오른쪽 아이콘 둘은 늘 보인다(사용자 "열기 상시로, 한글 말고 아이콘"):
// "+" 는 바로 아래 같은 단계의 새 줄을 만들고 곧장 이름 칸을 연다(노션의 줄 추가) — 앞서는 하위를 만들어 멀쩡한 작업이 묶음으로 바뀌었다(사용자 "플러스 동작 이상").
// 옆 보기 아이콘은 상세 서랍을 연다. 순서는 왼쪽 손잡이(점 여섯)를 끌어 다른 줄 앞뒤에 놓는다(WBS 보기, 마우스) — 서랍의 위로/아래로/들여쓰기 단추는 와닿지 않는다 해서 걷었다.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CheckCircleIcon, GripIcon, PlusIcon, SidePanelIcon, TrashIcon } from "@/components/ui/icons";
import { ChevronDownIcon } from "@/components/ui/icons";
import { Clamp, useTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { PLAN_MESSAGES as M } from "@/lib/admin/messages";
import { dayOffset, PERSON_ROW_PREFIX, resizeItem, shiftDay, shiftItem, spanDays, type PlanRow } from "@/lib/admin/plan";
import { useTrackColor } from "./track-color";
import { weekdayOf } from "@/lib/calendar";
import { holidayName } from "@/lib/holidays";
import { useFitHeight } from "@/components/admin/screen/data-grid/fit";

/** 눈금별 하루 폭(px). 일은 날짜 숫자가 들어갈 만큼, 월은 석 달이 한 화면에 들어갈 만큼 */
export const PLAN_ZOOM_PX = { day: 30, week: 14, month: 5 } as const;
export type PlanZoom = keyof typeof PLAN_ZOOM_PX;

/** 줄 높이(px). 막대 20px 위아래로 숨 쉴 틈 */
const ROW_H = 36;
/** 머리 높이(px). 달 줄 + 눈금 줄. 일 눈금은 날짜 아래 요일 한 줄이 더 붙는다 */
const HEAD_H = 52;
const HEAD_H_DAY = 64;
/** 왼쪽 붙박이 칸 폭(px). 앞서 300 에 들여쓰기 16, 손잡이 칸 16 이 따로 있어 작업명이 열 자도 안 보였다(사용자 "왼쪽 공백이 많고 글자가 적다") */
const LABEL_W = 360;
/** 깊이 한 단의 들여쓰기(px) */
const INDENT = 12;
/** 요일 이름(일요일부터). 일 눈금 머리의 날짜 아래에 적는다 */
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;
/** 끌어 놓기에서 줄 가운데로 치는 범위(줄 높이 비율). 이 안에 놓으면 그 줄의 하위로 들어간다(노션) */
const INSIDE_FROM = 0.28;
const INSIDE_TO = 0.72;
/** 막대 끝 손잡이 폭(px). 이 안에서 누르면 늘이기, 밖이면 옮기기 */
const HANDLE = 8;
/** 처음 열 때 오늘을 왼쪽에서 며칠 띄워 세우나. 지난 일(마크 0)이 몇 달 앞이어도 첫 화면은 지금부터다 */
const LEAD_DAYS = 7;
/** 달 이름을 적을 최소 폭(px). 범위 첫 달이 며칠만 걸치면 이름이 반쯤 잘려 보인다 */
const MONTH_LABEL_MIN = 48;
/** 주 눈금 글자가 오늘 알약과 겹친다고 보는 거리(일). 글자 "11/2" 가 사흘 폭쯤 쓴다 */
const TODAY_CLEAR_DAYS = 4;
/** 범위 앞뒤 여유(일). 첫 막대가 차트 왼쪽 끝에 붙지 않게 */
const PAD_BEFORE = 7;
const PAD_AFTER = 21;

/** 파트 색의 옅은 면. 막대 바탕(아직 안 한 몫). 색은 track-color 가 공통코드 순서로 정한다 */
const soft = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, var(--surface))`;

type Drag = { id: string; mode: "move" | "start" | "end"; x: number; by: number };

/** 월요일로 내린다 — 주 눈금이 월요일에 서게 */
const toMonday = (iso: string) => shiftDay(iso, -((weekdayOf(iso) + 6) % 7));
const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

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
    const ticks: { at: number; label: string; wd: number; holiday: string | null }[] = [];
    const weekends: number[] = [];
    const holidays: { at: number; name: string }[] = [];
    for (let i = 0; i < days; i++) {
      const iso = shiftDay(from, i);
      const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
      const last = months[months.length - 1];
      if (!last || d === 1) months.push({ at: i, span: 1, label: zoom === "month" ? `${y}.${m}` : `${y}년 ${m}월` });
      else last.span += 1;
      const wd = weekdayOf(iso);
      const holiday = holidayName(iso);
      if (holiday) holidays.push({ at: i, name: holiday });
      if (wd === 0 || wd === 6) weekends.push(i);
      if (zoom === "day") ticks.push({ at: i, label: String(d), wd, holiday });
      else if (zoom === "week" && wd === 1) ticks.push({ at: i, label: md(iso), wd, holiday: null });
    }
    return { months, ticks, weekends, holidays };
  }, [from, days, zoom]);
}

/** 쉬는 날의 까닭을 말풍선으로(공휴일 이름, 주말). 일 눈금은 날짜 칸 전체가, 주, 월 눈금은 머리 바닥의 빨간 점이 띄운다 */
function OffDayTip({ label, className, style, children }: { label: string | null; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  const { triggerProps, tooltip } = useTooltip<HTMLDivElement>(label ?? "", !!label, "tap");
  return (
    <>
      <div {...(label ? triggerProps : {})} aria-label={label ?? undefined} className={className} style={style}>
        {children}
      </div>
      {label && tooltip}
    </>
  );
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
  onOpen,
  onDelete,
  onAddBelow,
  onReorder,
  renamingId,
  setRenamingId,
  onAddRoot,
  onRename,
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
  /** 상세 팝업 열기(작업명 옆 "열기") */
  onOpen: (id: string) => void;
  /** 줄 지우기(줄의 휴지통) */
  onDelete: (id: string) => void;
  /** 바로 아래 같은 단계의 새 줄(줄의 "+") */
  onAddBelow: (id: string) => void;
  /** 끌어 놓기로 순서 바꾸기. 없으면 손잡이를 그리지 않는다(담당자별 보기는 시작일 순이라 순서가 없다) */
  onReorder?: (id: string, targetId: string, where: "before" | "after" | "inside") => void;
  /** 이름 칸이 열린 줄. 화면이 쥔다 — "+" 로 만든 새 줄은 만들자마자 이름 칸이 열려야 한다 */
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
  /** 맨 아래 "새 일정" 줄. 없으면 그 줄을 그리지 않는다(사람별 보기) */
  onAddRoot?: () => void;
  /** 작업명 그 자리 고치기 */
  onRename: (id: string, title: string) => void;
  onShift: (id: string, by: number) => void;
  onResize: (id: string, edge: "start" | "end", by: number) => void;
  /** 끌어서 고치기(마우스 기기, 고칠 권한) */
  editable: boolean;
}) {
  const px = PLAN_ZOOM_PX[zoom];
  const trackColor = useTrackColor();
  const range = useMemo(() => rangeOf(allRows, today), [allRows, today]);
  const from = range.from;
  // 판 폭(px). 일정이 적어 날짜 범위가 짧으면 오른쪽이 빈 판으로 남았다 — 범위를 판 폭까지 늘린다
  const [boxW, setBoxW] = useState(0);
  const days = Math.max(range.days, Math.ceil((boxW - LABEL_W) / px));
  const { months, ticks, weekends, holidays } = useScale(from, days, zoom);
  const headH = zoom === "day" ? HEAD_H_DAY : HEAD_H;
  const [drag, setDrag] = useState<Drag | null>(null);
  const commitRename = (id: string, text: string) => {
    if (text.trim()) onRename(id, text.trim());
    setRenamingId(null);
  };
  /** 손잡이로 끄는 줄과 놓일 자리 */
  const [reorder, setReorder] = useState<{ id: string; overId: string | null; where: "before" | "after" | "inside" } | null>(null);
  const reorderMove = (e: React.PointerEvent) => {
    if (!reorder) return;
    const rowEl = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-plan-row]");
    const overId = rowEl?.dataset.planRow ?? null;
    const ratio = rowEl ? (e.clientY - rowEl.getBoundingClientRect().top) / ROW_H : 0;
    const where = ratio < INSIDE_FROM ? "before" : ratio > INSIDE_TO || rowEl?.dataset.planKind === "milestone" ? (ratio < 0.5 ? "before" : "after") : "inside";
    if (overId !== reorder.overId || where !== reorder.where) setReorder({ ...reorder, overId, where });
  };
  const reorderEnd = () => {
    if (reorder?.overId && reorder.overId !== reorder.id) onReorder?.(reorder.id, reorder.overId, reorder.where);
    setReorder(null);
  };
  // 끈 뒤 따라오는 click 이 줄 고르기로 읽히지 않게 한 번 삼킨다
  const swallow = useRef(false);
  const width = days * px;
  const todayAt = dayOffset(from, today);

  // 열 때와 눈금을 바꿀 때만 오늘 쪽으로 굴린다 — 줄을 끌다 범위가 바뀌었다고 화면이 튀면 손이 놓친다.
  // 그리기 전에(layout effect) 굴린다: 그린 뒤 굴리면 왼쪽 끝(몇 달 전)이 한 장 보였다가 튄다
  const boxRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // 높이는 화면 바닥까지 잰 값이다(관리자 그리드와 같은 fit) — 고정 vh 로 두면 위 띠가 접히고 펴질 때마다 문서가 따로 굴렀다(사용자 "불필요한 세로 스크롤")
  const fitted = useFitHeight(boxRef, true);
  const scrolledAt = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || scrolledAt.current === px) return;
    scrolledAt.current = px;
    el.scrollLeft = Math.max(0, (dayOffset(from, today) - LEAD_DAYS) * px);
  }, [px, from, today]);

  // 바탕: 주 눈금 세로선 + (일 눈금이면) 주말 면. 줄마다 같은 그림이라 한 장을 깔고 줄은 투명하게 둔다
  const grid = useMemo(() => {
    const weekly = `repeating-linear-gradient(to right, color-mix(in oklab, var(--line) 90%, transparent) 0 1px, transparent 1px ${7 * px}px)`;
    // 하루 선은 옅게(일, 주 눈금). 막대의 시작과 끝이 어느 날에 서는지 눈금으로 읽힌다(사용자 "시작과 끝이 애매하다"). 월 눈금은 칸이 5px 라 뺀다
    const daily = zoom === "month" ? null : `repeating-linear-gradient(to right, color-mix(in oklab, var(--line) 45%, transparent) 0 1px, transparent 1px ${px}px)`;
    const lines = daily ? `${weekly},${daily}` : weekly;
    const band = (i: number, color: string) => `linear-gradient(to right, transparent ${i * px}px, ${color} ${i * px}px, ${color} ${(i + 1) * px}px, transparent ${(i + 1) * px}px)`;
    // 공휴일은 모든 눈금에서 옅은 빨강, 주말은 일 눈금에서만 회색 면(주, 월 눈금은 칸이 좁아 주말 면이 줄무늬가 된다)
    const off = holidays.map((h) => band(h.at, "color-mix(in oklab, var(--danger) 13%, transparent)"));
    const weekend = zoom === "day" ? weekends.map((i) => band(i, "var(--surface-2)")) : [];
    return [lines, ...off, ...weekend].join(",");
  }, [px, zoom, weekends, holidays]);

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
  /** 막대를 누르면(끌지 않고) 상세 서랍을 연다(사용자 "퍼센트 바 눌러도 수정 시트"). 끈 뒤 따라오는 click 은 삼킨다 */
  const openOnClick = (row: PlanRow) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (swallow.current) {
      swallow.current = false;
      return;
    }
    if (!row.id.startsWith(PERSON_ROW_PREFIX)) onOpen(row.id);
    else onToggle(row.id);
  };
  const dragProps = (row: PlanRow) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => begin(e, row),
    onPointerMove: move,
    onPointerUp: finish,
    onPointerCancel: () => setDrag(null),
  });

  /** 끄는 중이면 미리 옮긴 기간 */
  const spanOf = (row: PlanRow): { start: string | null; end: string | null } => {
    if (!drag || drag.id !== row.id) return { start: row.start, end: row.end };
    const next = drag.mode === "move" ? shiftItem(row, drag.by) : resizeItem(row, drag.mode, drag.by);
    return { start: next.startOn, end: next.kind === "milestone" ? next.startOn : next.endOn };
  };

  return (
    <div ref={boxRef} className="relative overflow-auto rounded-xl border border-line bg-surface shadow-hair" style={fitted ? { maxHeight: fitted.px } : undefined} role="group" aria-label={M.gantt}>
      <div className="relative" style={{ width: LABEL_W + width }}>
        {/* 머리: 달 줄 + 눈금 줄. 위로 붙는다 */}
        <div className="sticky top-0 z-20 flex border-b border-line bg-surface" style={{ height: headH }}>
          <div className="sticky left-0 z-10 flex shrink-0 items-end gap-1.5 border-r border-line bg-surface px-4 pb-2 text-[12.5px] font-semibold text-dim" style={{ width: LABEL_W }}>
            {M.colNo}
            <span className="text-line-strong">|</span>
            {M.colTitle}
          </div>
          <div className="relative text-[12px]" style={{ width }}>
            {months.map((m) => (
              <div key={m.at} className="absolute top-0 h-[26px] overflow-hidden whitespace-nowrap border-l border-line px-2 pt-1.5 text-[12.5px] font-bold text-ink" style={{ left: m.at * px, width: m.span * px }}>
                {m.span * px >= MONTH_LABEL_MIN ? m.label : null}
              </div>
            ))}
            {ticks.map((t) => {
              const red = t.wd === 0 || !!t.holiday;
              const blue = t.wd === 6 && !t.holiday;
              const why = t.holiday ?? (zoom === "day" && (t.wd === 0 || t.wd === 6) ? M.weekend(WEEKDAY[t.wd]!) : null);
              return (
                <OffDayTip
                  key={t.at}
                  label={why}
                  className={cn("absolute bottom-0 whitespace-nowrap tabular-nums", zoom === "day" ? "flex flex-col items-center pb-1 leading-tight" : "h-1/2 pl-1.5 pt-1 text-dim", red ? "text-danger" : blue ? "text-acc" : zoom === "day" && "text-dim", why && "cursor-help")}
                  style={{ left: t.at * px, width: zoom === "day" ? px : 7 * px }}
                >
                  {/* 오늘 알약과 겹치는 눈금 글자는 비운다(주 눈금은 글자가 오른쪽으로 7일 폭을 쓴다) */}
                  {zoom === "week" && t.at <= todayAt && todayAt - t.at < TODAY_CLEAR_DAYS ? null : (
                    <>
                      <span className={zoom === "day" ? "text-[12px] font-semibold" : undefined}>{t.label}</span>
                      {zoom === "day" && <span className="text-[10.5px]">{WEEKDAY[t.wd]}</span>}
                    </>
                  )}
                </OffDayTip>
              );
            })}
            {/* 주, 월 눈금: 공휴일 자리 머리 바닥선에 빨간 띠 + 이름 말풍선. 점을 날짜 글자 줄에 두니 글자를 가렸다(사용자) —
                띠는 글자 아래 바닥선에 붙고, 누르는 자리만 위로 조금 넓힌다 */}
            {zoom !== "day" &&
              holidays.map((h) => (
                <OffDayTip key={`h-${h.at}`} label={h.name} className="absolute bottom-0 z-[6] flex h-2.5 cursor-help items-end" style={{ left: h.at * px, width: Math.max(px, 4) }}>
                  <span className="h-[3px] w-full rounded-t-sm bg-danger" />
                </OffDayTip>
              ))}
            {todayAt >= 0 && todayAt < days && (
              <span className={cn("absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-danger px-1.5 py-px text-[11px] font-bold tabular-nums text-on-ink shadow-1", zoom === "day" ? "top-[3px]" : "bottom-1")} style={{ left: (todayAt + 0.5) * px }}>
                {md(today)}
              </span>
            )}
          </div>
        </div>

        {rows.length === 0 && <p className="sticky left-0 px-4 py-10 text-[13px] text-dim">{M.empty}</p>}

        <div className="relative">
          {/* 눈금 바탕 한 장(붙박이 칸 오른쪽) */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0" style={{ left: LABEL_W, width, backgroundImage: grid }} />

          {rows.map((row) => {
            const on = row.id === selected;
            const { start, end } = spanOf(row);
            const color = trackColor(row.track);
            const dragging = drag?.id === row.id;
            const left = start ? dayOffset(from, start) * px : 0;
            const person = row.id.startsWith(PERSON_ROW_PREFIX);
            const barW = start && end ? Math.max(px, spanDays(start, end) * px) : 0;
            return (
              <div
                key={row.id}
                data-plan-row={person ? undefined : row.id}
                data-plan-kind={row.kind}
                className={cn("group relative flex", row.depth === 0 && row.hasChildren && row.no !== "1" && "border-t border-line", reorder?.id === row.id && "opacity-50")}
                style={{ height: ROW_H }}
              >
                {/* 끌어 놓을 자리 줄 */}
                {reorder && reorder.overId === row.id && reorder.id !== row.id && (
                  reorder.where === "inside" ? (
                    <span aria-hidden className="pointer-events-none absolute inset-0.5 z-30 rounded-md ring-2 ring-acc" />
                  ) : (
                    <span aria-hidden className={cn("pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-acc", reorder.where === "before" ? "-top-px" : "-bottom-px")} />
                  )
                )}
                {/* 고른 줄 면. 붙박이 칸과 막대 자리를 한 띠로 칠한다 */}
                <div aria-hidden className={cn("pointer-events-none absolute inset-0 transition-colors duration-fast", on ? "bg-acc-row" : row.pct >= 100 && !row.hasChildren ? "bg-surface-2/70 group-hover:bg-surface-2" : "group-hover:bg-surface-2/60")} />

                {/* 왼쪽 붙박이 칸: 손잡이, 접기, 번호와 작업명, 줄 아이콘(+, 옆 보기) */}
                <div
                  className={cn("sticky left-0 z-10 flex shrink-0 items-center gap-1 border-r border-line pr-1.5 text-[14px]", on ? "bg-acc-row" : row.pct >= 100 && !row.hasChildren ? "bg-surface-2" : "bg-surface group-hover:bg-surface-2")}
                  style={{ width: LABEL_W, paddingLeft: 14 + row.depth * INDENT }}
                >
                  {on && <span aria-hidden className="absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-acc" />}
                  {onReorder && !person && editable ? (
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={M.reorder(row.title)}
                      onPointerDown={(e) => {
                        if (e.pointerType !== "mouse" || e.button !== 0) return;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        e.preventDefault();
                        setReorder({ id: row.id, overId: null, where: "before" });
                      }}
                      onPointerMove={reorderMove}
                      onPointerUp={reorderEnd}
                      onPointerCancel={() => setReorder(null)}
                      className="absolute left-0 top-1/2 flex h-6 w-3.5 -translate-y-1/2 cursor-grab items-center justify-center rounded text-dim-2 opacity-0 hover:bg-surface-3 hover:text-ink group-hover:opacity-100"
                    >
                      <GripIcon size={12} />
                    </span>
                  ) : null}
                  {row.hasChildren ? (
                    <button
                      type="button"
                      onClick={() => onToggle(row.id)}
                      aria-expanded={!collapsed.has(row.id)}
                      aria-label={collapsed.has(row.id) ? M.expand(row.title) : M.collapse(row.title)}
                      className="press flex size-5 shrink-0 items-center justify-center rounded text-dim hover:bg-surface-3 hover:text-ink"
                    >
                      <ChevronDownIcon size={13} className={cn("transition-transform duration-fast", collapsed.has(row.id) && "-rotate-90")} />
                    </button>
                  ) : (
                    <span className="flex w-5 shrink-0 justify-center" aria-hidden>
                      {row.pct >= 100 ? <CheckCircleIcon size={15} className="text-acc" /> : <span className="size-1.5 rounded-full" style={{ background: color }} />}
                    </span>
                  )}
                  {renamingId === row.id ? (
                    <input
                      autoFocus
                      aria-label={M.colTitle}
                      defaultValue={row.title}
                      onFocus={(e) => e.currentTarget.select()}
                      onBlur={(e) => commitRename(row.id, e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.nativeEvent.isComposing) return;
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="h-7 min-w-0 flex-1 rounded-md border border-acc bg-surface px-2 text-[16px] text-ink outline-none sm:text-[13.5px]"
                    />
                  ) : (
                    <button
                      type="button"
                      // 하위가 있는 줄(묶음, 사람 머리)은 이름을 눌러도 접고 편다(사용자 "이름 행 눌렀을 때 접었다 펴졌다")
                      onClick={() => {
                        onSelect(row.id);
                        if (row.hasChildren) onToggle(row.id);
                      }}
                      onDoubleClick={() => !person && setRenamingId(row.id)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    >
                      {person ? (
                        <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-acc-soft text-[12px] font-bold text-acc">
                          {row.title.trim().slice(0, 1) || "-"}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11.5px] tabular-nums text-dim">{row.no}</span>
                      )}
                      <Clamp className={cn("min-w-0", row.hasChildren ? "font-bold text-ink" : row.pct >= 100 ? "text-dim line-through decoration-dim/60" : "text-ink-2")}>{row.title}</Clamp>
                    </button>
                  )}
                  {/* 줄 아이콘: 바로 아래 새 줄, 옆 보기로 열기. 늘 보인다 */}
                  {!person && renamingId !== row.id && (
                    <span className="flex shrink-0 items-center">
                      <button type="button" onClick={() => onAddBelow(row.id)} aria-label={M.addBelow(row.title)} title={M.addBelow(row.title)} className="press flex size-6 items-center justify-center rounded-md text-dim hover:bg-surface-3 hover:text-ink">
                        <PlusIcon size={15} />
                      </button>
                      <button type="button" onClick={() => onOpen(row.id)} aria-label={M.openItem(row.title)} title={M.openItem(row.title)} className="press flex size-6 items-center justify-center rounded-md text-dim hover:bg-acc-soft hover:text-acc">
                        <SidePanelIcon size={15} />
                      </button>
                      <button type="button" onClick={() => onDelete(row.id)} aria-label={M.deleteRow(row.title)} title={M.deleteRow(row.title)} className="press flex size-6 items-center justify-center rounded-md text-dim hover:bg-danger-soft hover:text-danger">
                        <TrashIcon size={14} />
                      </button>
                    </span>
                  )}
                </div>

                {/* 막대 자리. 빈 곳을 눌러도 고른다 */}
                <div
                  className="relative shrink-0"
                  style={{ width }}
                  onClick={() => {
                    if (swallow.current) {
                      swallow.current = false;
                      return;
                    }
                    onSelect(row.id);
                  }}
                >
                  {/* 이정표: 갈래 색 마름모 + 날짜 알약 */}
                  {start && row.kind === "milestone" && !row.hasChildren && (
                    <>
                      <span
                        role="img"
                        aria-label={`${row.title} ${start}`}
                        {...dragProps(row)}
                        onClick={openOnClick(row)}
                        className={cn(
                          "absolute top-1/2 size-[15px] cursor-pointer -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] shadow-1 ring-[2.5px] ring-surface",
                          editable && "[@media(pointer:fine)]:cursor-ew-resize",
                        )}
                        style={{ left: (dayOffset(from, start) + 0.5) * px, background: row.pct >= 100 ? "var(--dim)" : color }}
                      />
                      <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-ink-2" style={{ left: (dayOffset(from, start) + 0.5) * px + 14 }}>
                        {md(start)}
                      </span>
                    </>
                  )}

                  {/* 상위 줄: 양 끝 꺾쇠가 달린 얇은 요약 막대 */}
                  {start && end && row.hasChildren && (
                    <div aria-label={`${row.title} ${start} ~ ${end} ${row.pct}%`} onClick={openOnClick(row)} className="absolute top-1/2 h-[7px] -translate-y-1/2 cursor-pointer before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']" style={{ left, width: barW }}>
                      <div className="absolute inset-0 overflow-hidden rounded-[2px]" style={{ background: soft(color, 30) }}>
                        <div className="h-full" style={{ width: `${row.pct}%`, background: color }} />
                      </div>
                      <span aria-hidden className="absolute -bottom-[5px] left-0 h-[9px] w-[3px] rounded-b-sm" style={{ background: color }} />
                      <span aria-hidden className="absolute -bottom-[5px] right-0 h-[9px] w-[3px] rounded-b-sm" style={{ background: color }} />
                      <span className="pointer-events-none absolute left-full top-1/2 ml-2 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap text-[12px] tabular-nums">
                        <span className="text-dim">{`${md(start)} ~ ${md(end)}`}</span>
                        <span className="text-line-strong">|</span>
                        <span className="font-bold" style={{ color }}>{row.pct}%</span>
                      </span>
                    </div>
                  )}

                  {/* 작업 막대: 옅은 알약 + 진행만큼 진한 채움, 진행률은 오른쪽 바깥 */}
                  {start && end && row.kind === "task" && !row.hasChildren && (
                    <div
                      {...dragProps(row)}
                      onClick={openOnClick(row)}
                      aria-label={`${row.title} ${start} ~ ${end} ${row.pct}%`}
                      className={cn(
                        "absolute top-1/2 h-[22px] -translate-y-1/2 rounded-[4px]",
                        !dragging && "transition-[left,width,box-shadow] duration-fast",
                        editable && "[@media(pointer:fine)]:cursor-grab [@media(pointer:fine)]:hover:shadow-2",
                        dragging && "z-10 cursor-grabbing shadow-2",
                        on && "ring-2 ring-offset-1 ring-offset-surface",
                      )}
                      style={{ left, width: barW, background: soft(color, 22), ["--tw-ring-color" as string]: color }}
                    >
                      {/* 막대 모서리를 둥글게 깎지 않는다(사용자 "너무 둥글다, 시작과 끝이 애매") — 알약 모양은 양 끝이 반 칸씩 날짜보다 짧아 보였다.
                          진한 왼쪽 끝 선이 시작일을 짚는다 */}
                      <div className="absolute inset-y-0 left-0 overflow-hidden rounded-l-[4px]" style={{ width: `${row.pct}%`, background: color }} />
                      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] rounded-l-[4px]" style={{ background: color }} />
                      {editable && (
                        <>
                          <span className="absolute inset-y-0 left-0 hidden [@media(pointer:fine)]:block [@media(pointer:fine)]:cursor-ew-resize" style={{ width: HANDLE }} />
                          <span className="absolute inset-y-0 right-0 hidden [@media(pointer:fine)]:block [@media(pointer:fine)]:cursor-ew-resize" style={{ width: HANDLE }} />
                        </>
                      )}
                      {/* 막대 오른쪽: 기간(시작 ~ 끝) | 진행률. 날짜를 글자로 적어 눈금을 세지 않아도 언제부터 언제까지인지 읽힌다 */}
                      <span className="pointer-events-none absolute left-full top-1/2 ml-2 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap text-[12px] tabular-nums">
                        <span className="text-dim">{start === end ? md(start) : `${md(start)} ~ ${md(end)}`}</span>
                        <span className="text-line-strong">|</span>
                        <span className={cn("font-semibold", row.pct >= 100 ? "text-acc" : "text-ink-2")}>{row.pct >= 100 ? M.doneLabel : `${row.pct}%`}</span>
                      </span>
                    </div>
                  )}

                  {/* 끄는 동안 바뀐 기간을 막대 위에 띄운다 */}
                  {dragging && drag.by !== 0 && start && (
                    <span className="pointer-events-none absolute -top-1 z-20 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-on-ink shadow-2" style={{ left }}>
                      {start === end ? start : `${start} ~ ${end}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* 새 일정 줄(노션의 "+ 새로 만들기") */}
          {onAddRoot && (
            <div className="relative flex" style={{ height: ROW_H }}>
              <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-line bg-surface pl-2.5" style={{ width: LABEL_W }}>
                <button type="button" onClick={onAddRoot} className="press flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] text-dim hover:bg-surface-2 hover:text-ink">
                  <PlusIcon size={14} />
                  {M.addRoot}
                </button>
              </div>
            </div>
          )}

          {/* 오늘 선 */}
          {todayAt >= 0 && todayAt < days && (
            <div aria-hidden className="pointer-events-none absolute inset-y-0 z-[5] w-px bg-danger/70" style={{ left: LABEL_W + (todayAt + 0.5) * px }} />
          )}
        </div>
      </div>
    </div>
  );
}
