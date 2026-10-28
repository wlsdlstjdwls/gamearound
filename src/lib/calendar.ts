// 달력 피커(components/ui/date-field)가 쓰는 순수 날짜 계산. 값은 늘 "YYYY-MM-DD" 문자열이다.
//
// Date 객체를 값으로 들고 다니지 않는 이유: 폼과 DB 가 주고받는 것이 이 문자열이고(<input type="date"> 와 같은 꼴),
// Date 로 바꾸는 순간 시간대가 끼어 자정 부근에서 하루가 밀린다. 계산할 때만 UTC 정오로 세워 쓴다 —
// 정오는 어느 시간대로 옮겨도 날짜가 바뀌지 않는다.

/** 달 하나를 그리는 칸 수(6주 x 7일). 늘 같은 높이라 달을 넘길 때 판이 출렁이지 않는다 */
export const CALENDAR_CELLS = 42;

export type YearMonth = { year: number; month: number };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" 를 읽는다. 없는 날짜(2월 30일)는 null 이다 */
export function parseIsoDate(value: string | null | undefined): { year: number; month: number; day: number } | null {
  const m = value ? ISO_DATE.exec(value) : null;
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 달을 앞뒤로 옮긴다. 12월 다음은 이듬해 1월이다 */
export function shiftMonth({ year, month }: YearMonth, by: number): YearMonth {
  const idx = year * 12 + (month - 1) + by;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

/** 날짜를 하루 단위로 옮긴다(키보드 화살표) */
export function shiftDay(iso: string, by: number): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + by, 12));
  return toIsoDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** 요일. 0 이 일요일이다 */
export function weekdayOf(iso: string): number {
  const d = parseIsoDate(iso);
  return d ? new Date(Date.UTC(d.year, d.month - 1, d.day, 12)).getUTCDay() : 0;
}

/**
 * 달력 한 장의 칸 42개. 앞뒤 달 날짜로 빈칸을 채운다 — 빈칸으로 두면 첫 주와 끝 주가
 * 덜 찬 줄로 보여 판의 모양이 달마다 달라진다. 주는 일요일에 시작한다(한국 달력 관례).
 */
export function monthGrid({ year, month }: YearMonth): Array<{ iso: string; day: number; inMonth: boolean }> {
  const lead = weekdayOf(toIsoDate(year, month, 1));
  const first = shiftDay(toIsoDate(year, month, 1), -lead);
  const cells: Array<{ iso: string; day: number; inMonth: boolean }> = [];
  let iso = first;
  for (let i = 0; i < CALENDAR_CELLS; i++) {
    const d = parseIsoDate(iso)!;
    cells.push({ iso, day: d.day, inMonth: d.month === month && d.year === year });
    iso = shiftDay(iso, 1);
  }
  return cells;
}

/** 오늘(한국 시각). 서비스가 한국 스토어 기준이라 관리자가 고르는 날짜도 한국 날짜다 */
export function todayIsoKst(now: number = Date.now()): string {
  // 한국은 서머타임이 없어 +9시간 고정이다
  const kst = new Date(now + 9 * 60 * 60 * 1000);
  return toIsoDate(kst.getUTCFullYear(), kst.getUTCMonth() + 1, kst.getUTCDate());
}

/** 날짜가 [min, max] 밖인지. 문자열 비교로 충분하다 — 같은 꼴(YYYY-MM-DD)이라 사전순이 곧 날짜순이다 */
export function isOutOfRange(iso: string, min?: string | null, max?: string | null): boolean {
  return Boolean((min && iso < min) || (max && iso > max));
}
