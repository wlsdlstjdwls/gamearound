"use client";
// 날짜 하나를 고르는 칸 + 펼치는 달력. 값은 "YYYY-MM-DD" 문자열이다(lib/calendar).
//
// 네이티브 <input type="date"> 를 걷은 이유(2026-10-28, 사용자: "년월일 달력 피커도 UI 개선좀"): 칸은
// 브라우저마다 "연도-월-일" 빈 틀과 회색 달력 그림을 그리고, 펼친 달력은 운영체제 것이라 색, 모서리, 글꼴에
// 우리 토큰이 하나도 안 닿는다. 드롭다운(ui/select)을 직접 그린 것과 같은 까닭이다.
//
// 펼친 판은 드롭다운과 같은 규칙으로 띄운다 — body 로 보내 fixed 로 세우고, <dialog> 안에서만 칸 옆에 붙인다
// (쌓임 맥락에 갇혀 카드 밑으로 깔리는 문제, select/core 머리 주석).
//
// 폼에서는 `name` 을 주면 숨은 칸으로 값을 실어 보낸다. 상태로 쥐는 자리는 `value` + `onChange` 로 쓴다.
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { CalendarIcon, ChevronLeftIcon, XIcon } from "@/components/ui/icons";
import { daysInMonth, isOutOfRange, monthGrid, parseIsoDate, shiftDay, shiftMonth, toIsoDate, todayIsoKst, weekdayOf, type YearMonth } from "@/lib/calendar";
import { DATE_FIELD_MESSAGES as M } from "@/lib/messages/date-field";

/** 펼친 판의 폭(px). 날 칸 40px 일곱 + 안쪽 여백 */
const PANEL_W = 300;
/** 판의 어림 높이(px). 아래 자리가 이보다 모자라면 위로 연다 */
const PANEL_H = 360;
/** 칸과 판 사이 틈(px) */
const PANEL_GAP = 6;
/** 화면 가장자리에서 띄울 최소 틈(px) */
const EDGE = 8;

/** 칸 높이와 글자. sm 은 관리자 폼처럼 칸이 한 줄에 여럿 서는 자리, md 는 일반 폼(TextField compact 와 같은 44px) */
const FIELD_SIZE = {
  sm: "h-11 text-[16px] sm:h-9 sm:text-[13.5px]",
  md: "h-11 text-[16px] sm:text-[14px]",
} as const;

type Place = { left: number; top?: number; bottom?: number };

export function DateField({
  label,
  hideLabel = false,
  name,
  value: controlled,
  defaultValue = null,
  onChange,
  min,
  max,
  clearable = true,
  size = "md",
  className,
}: {
  label: string;
  hideLabel?: boolean;
  /** 폼으로 보낼 이름. 주면 숨은 칸이 값을 싣는다(비면 빈 문자열) */
  name?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  min?: string | null;
  max?: string | null;
  clearable?: boolean;
  size?: keyof typeof FIELD_SIZE;
  className?: string;
}) {
  const id = useId();
  const [inner, setInner] = useState<string | null>(defaultValue || null);
  const value = controlled !== undefined ? controlled || null : inner;
  const parsed = parseIsoDate(value);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const today = todayIsoKst();
  /** 지금 펼친 달 */
  const [shown, setShown] = useState<YearMonth>(() => ym(value ?? today));
  /** 키보드로 훑는 날. 판 안에서 tabIndex 0 은 이 칸 하나다 */
  const [focus, setFocus] = useState<string>(value ?? today);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [inline, setInline] = useState(false);

  const set = (next: string | null) => {
    if (controlled === undefined) setInner(next);
    onChange?.(next);
  };

  const openPanel = () => {
    const start = value ?? today;
    setShown(ym(start));
    setFocus(start);
    setView("days");
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const pick = (iso: string) => {
    if (isOutOfRange(iso, min, max)) return;
    set(iso);
    close();
  };

  // 자리 재기 — 드롭다운과 같은 방식이다(select/core). 그리기 전에 재야 한 프레임 엉뚱한 자리에 뜨지 않는다
  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!open || !button) return;
    if (button.closest("dialog")) {
      setInline(true);
      return () => setInline(false);
    }
    const measure = (e?: Event) => {
      if (e && panelRef.current?.contains(e.target as Node)) return;
      const r = button.getBoundingClientRect();
      const left = Math.max(EDGE, Math.min(r.left, window.innerWidth - PANEL_W - EDGE));
      const below = window.innerHeight - r.bottom;
      const up = below < PANEL_H && r.top > below;
      const next: Place = up ? { left, bottom: window.innerHeight - r.top + PANEL_GAP } : { left, top: r.bottom + PANEL_GAP };
      setPlace((prev) => (prev && prev.left === next.left && prev.top === next.top && prev.bottom === next.bottom ? prev : next));
    };
    measure();
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, { capture: true });
      window.removeEventListener("resize", measure);
      setPlace(null);
    };
  }, [open]);

  // 바깥을 누르면 닫는다. mousedown, touchstart 로 듣는다(AGENTS 6장)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // 훑는 칸이 바뀌면 그 칸으로 초점을 옮긴다. 판이 열린 첫 순간에도 같은 일을 한다
  useEffect(() => {
    if (!open || view !== "days") return;
    panelRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${focus}"]`)?.focus({ preventScroll: true });
  }, [open, view, focus, place, inline]);

  const moveFocus = (iso: string) => {
    setFocus(iso);
    const next = ym(iso);
    if (next.year !== shown.year || next.month !== shown.month) setShown(next);
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    const map: Record<string, () => string> = {
      ArrowLeft: () => shiftDay(focus, -1),
      ArrowRight: () => shiftDay(focus, 1),
      ArrowUp: () => shiftDay(focus, -7),
      ArrowDown: () => shiftDay(focus, 7),
      Home: () => shiftDay(focus, -weekdayOf(focus)),
      End: () => shiftDay(focus, 6 - weekdayOf(focus)),
      PageUp: () => sameDayIn(focus, -1),
      PageDown: () => sameDayIn(focus, 1),
    };
    const go = map[e.key];
    if (!go) return;
    e.preventDefault();
    moveFocus(go());
  };

  const onPanelKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // 시트 안이면 시트까지 닫히지 않게
      close();
    }
  };

  const navBtn = "press tap flex size-8 items-center justify-center rounded-full text-mut transition-colors duration-fast hover:bg-surface-2 hover:text-ink";

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      onKeyDown={onPanelKey}
      style={place ? { position: "fixed", left: place.left, top: place.top, bottom: place.bottom, width: PANEL_W } : { width: PANEL_W }}
      className={cn(
        "animate-scale-in z-50 rounded-[var(--radius-md)] bg-surface p-3 shadow-3 ring-1 ring-line",
        place ? (place.bottom !== undefined ? "origin-bottom" : "origin-top") : "absolute left-0 top-full mt-1.5 origin-top",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => (view === "days" ? setShown(shiftMonth(shown, -1)) : setShown({ ...shown, year: shown.year - 1 }))}
          aria-label={view === "days" ? M.prevMonth : M.prevYear}
          className={navBtn}
        >
          <ChevronLeftIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => setView(view === "days" ? "months" : "days")}
          aria-label={`${view === "days" ? M.monthTitle(shown.year, shown.month) : M.yearTitle(shown.year)}, ${M.pickMonth}`}
          aria-expanded={view === "months"}
          className="press tap flex items-center gap-1 rounded-full px-3 py-1 text-[14px] font-bold tabular-nums text-ink transition-colors duration-fast hover:bg-surface-2"
        >
          {view === "days" ? M.monthTitle(shown.year, shown.month) : M.yearTitle(shown.year)}
          <svg aria-hidden viewBox="0 0 10 6" className={cn("w-2 text-dim transition-transform duration-base", view === "months" && "rotate-180")}>
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => (view === "days" ? setShown(shiftMonth(shown, 1)) : setShown({ ...shown, year: shown.year + 1 }))}
          aria-label={view === "days" ? M.nextMonth : M.nextYear}
          className={navBtn}
        >
          <ChevronLeftIcon size={16} className="rotate-180" />
        </button>
      </div>

      {view === "days" ? (
        <div role="grid" aria-label={M.monthTitle(shown.year, shown.month)} onKeyDown={onGridKey} className="animate-fade-in">
          <div role="row" className="grid grid-cols-7">
            {M.weekdays.map((w, i) => (
              <span key={w} role="columnheader" className={cn("pb-1 text-center text-[11.5px] font-medium", i === 0 ? "text-danger" : "text-dim")}>
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {monthGrid(shown).map((c) => {
              const selected = c.iso === value;
              const isToday = c.iso === today;
              const disabled = isOutOfRange(c.iso, min, max);
              return (
                <button
                  key={c.iso}
                  type="button"
                  role="gridcell"
                  data-iso={c.iso}
                  tabIndex={c.iso === focus ? 0 : -1}
                  aria-selected={selected}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={labelOf(c.iso)}
                  disabled={disabled}
                  onClick={() => pick(c.iso)}
                  className={cn(
                    "press mx-auto flex size-10 items-center justify-center rounded-full text-[13.5px] tabular-nums outline-none transition-colors duration-fast",
                    "focus-visible:ring-2 focus-visible:ring-acc",
                    selected
                      ? "bg-acc font-bold text-on-ink"
                      : cn(
                          "hover:bg-surface-2",
                          isToday && "font-bold text-acc ring-1 ring-inset ring-acc",
                          !isToday && (c.inMonth ? "text-ink" : "text-dim-2"),
                        ),
                    disabled && "cursor-not-allowed opacity-35 hover:bg-transparent",
                  )}
                >
                  {c.day}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid animate-fade-in grid-cols-3 gap-1.5 py-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const current = parsed?.year === shown.year && parsed.month === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setShown({ year: shown.year, month: m });
                  const day = Math.min(parseIsoDate(focus)?.day ?? 1, daysInMonth(shown.year, m));
                  setFocus(toIsoDate(shown.year, m, day));
                  setView("days");
                }}
                className={cn(
                  "press tap h-11 rounded-[var(--radius-sm)] text-[13.5px] transition-colors duration-fast",
                  current ? "bg-acc font-bold text-on-ink" : "text-ink hover:bg-surface-2",
                )}
              >
                {M.monthShort(m)}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-line-soft pt-2">
        <button
          type="button"
          onClick={() => pick(today)}
          disabled={isOutOfRange(today, min, max)}
          className="press tap rounded-full px-3 py-1 text-[13px] font-semibold text-acc transition-colors duration-fast hover:bg-acc-soft disabled:opacity-40"
        >
          {M.today}
        </button>
        {clearable && value && (
          <button
            type="button"
            onClick={() => {
              set(null);
              close();
            }}
            className="press tap rounded-full px-3 py-1 text-[13px] text-mut transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
          >
            {M.clear}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={cn("relative flex flex-col gap-1.5", className)}>
      <span id={`${id}-label`} className={cn("text-[12.5px] font-medium text-mut", hideLabel && "sr-only")}>
        {label}
      </span>
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={`${id}-label ${id}-value`}
          onClick={() => (open ? close(false) : openPanel())}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && !open) {
              e.preventDefault();
              openPanel();
            }
          }}
          className={cn(
            "press flex w-full items-center gap-2 rounded-[var(--radius-sm)] bg-surface pl-3 text-left tabular-nums transition-[box-shadow] duration-base ease-standard",
            clearable && value ? "pr-9" : "pr-3",
            FIELD_SIZE[size],
            open
              ? "shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]"
              : "shadow-[0_0_0_1px_var(--line-strong)] hover:shadow-[0_0_0_1px_var(--acc)]",
          )}
        >
          <CalendarIcon size={16} className={cn("shrink-0 transition-colors", open ? "text-acc" : "text-dim")} />
          <span id={`${id}-value`} className={cn("min-w-0 flex-1 truncate", value ? "font-medium text-ink" : "text-dim")}>
            {value ? labelOf(value) : M.placeholder}
          </span>
        </button>
        {/* 비우기는 칸 안이 아니라 곁에 선 단추다 — 단추 안에 단추를 넣을 수 없다 */}
        {clearable && value && (
          <button
            type="button"
            onClick={() => set(null)}
            aria-label={`${label} ${M.clear}`}
            className="press absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-dim transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
          >
            <XIcon size={14} />
          </button>
        )}
      </div>
      {open && (place ? createPortal(panel, document.body) : inline ? panel : null)}
    </div>
  );
}

function ym(iso: string): YearMonth {
  const d = parseIsoDate(iso);
  return d ? { year: d.year, month: d.month } : { year: 1970, month: 1 };
}

/** 한 달 앞뒤의 같은 날. 31일에서 2월로 가면 그 달 끝날에 멈춘다 */
function sameDayIn(iso: string, by: number): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  const t = shiftMonth({ year: d.year, month: d.month }, by);
  return toIsoDate(t.year, t.month, Math.min(d.day, daysInMonth(t.year, t.month)));
}

function labelOf(iso: string): string {
  const d = parseIsoDate(iso);
  return d ? M.value(d.year, d.month, d.day, M.weekdays[weekdayOf(iso)]) : iso;
}
