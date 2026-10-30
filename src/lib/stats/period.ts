// 조회 기간 계산(2026-10-30). 알림발송관리, 매출현황, 이용현황이 주소(?from=&to=)로 받은 한국 날짜를 같은 규칙으로 읽는다.
// 날짜는 "2026-10-30" 글자로 다닌다(lib/format 의 kstDateKey 와 같은 꼴). 시각으로 바꿀 때만 +09:00 을 붙인다 —
// 서버(UTC)와 브라우저가 같은 날을 가리키게.
import { kstDateKey, WEEKDAY_LABEL } from "@/lib/format";

const KST_OFFSET = "+09:00";
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export type Period = { from: string; to: string };

export function isDayKey(v: unknown): v is string {
  return typeof v === "string" && DAY_KEY.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00${KST_OFFSET}`));
}

/** 그 한국 날짜 0시의 시각 */
export function kstDayStart(key: string): Date {
  return new Date(`${key}T00:00:00${KST_OFFSET}`);
}

export function addDays(key: string, n: number): string {
  return kstDateKey(new Date(kstDayStart(key).getTime() + n * DAY_MS));
}

/** 두 날짜 사이 날 수(같은 날이면 1) */
export function daysIn(p: Period): number {
  return Math.round((kstDayStart(p.to).getTime() - kstDayStart(p.from).getTime()) / DAY_MS) + 1;
}

/** 기간 안의 날짜 열쇠 전부(빈 날도 0 으로 그리려고) */
export function daySeries(p: Period): string[] {
  const out: string[] = [];
  for (let d = p.from; d <= p.to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 질의용 시각 범위 — 시작일 0시(포함)부터 끝일 다음날 0시(제외)까지 */
export function periodRange(p: Period): { start: Date; end: Date } {
  return { start: kstDayStart(p.from), end: kstDayStart(addDays(p.to, 1)) };
}

/**
 * 주소 값을 기간으로. 비거나 틀리면 오늘까지 defaultDays 일. 거꾸로면 바꿔 세우고, maxDays 를 넘으면 끝일 기준으로 자른다 —
 * 1년치 날짜를 한 번에 그리면 그래프 막대가 실선이 되고 질의도 무거워진다.
 */
export function resolvePeriod(raw: { from?: unknown; to?: unknown }, opts: { defaultDays: number; maxDays: number; now?: Date }): Period {
  const today = kstDateKey(opts.now ?? new Date());
  let to = isDayKey(raw.to) ? raw.to : today;
  let from = isDayKey(raw.from) ? raw.from : addDays(to, -(opts.defaultDays - 1));
  if (from > to) [from, to] = [to, from];
  if (daysIn({ from, to }) > opts.maxDays) from = addDays(to, -(opts.maxDays - 1));
  return { from, to };
}

/** 같은 길이의 바로 앞 기간(전기 대비) */
export function previousPeriod(p: Period): Period {
  const n = daysIn(p);
  return { from: addDays(p.from, -n), to: addDays(p.from, -1) };
}

export const PERIOD_PRESETS = ["d7", "d30", "thisMonth", "lastMonth"] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

/** 빠른 선택 기간. 달은 한국 날짜 기준 1일부터다 */
export function presetPeriod(kind: PeriodPreset, now: Date = new Date()): Period {
  const today = kstDateKey(now);
  const monthStart = `${today.slice(0, 8)}01`;
  switch (kind) {
    case "d7":
      return { from: addDays(today, -6), to: today };
    case "d30":
      return { from: addDays(today, -29), to: today };
    case "thisMonth":
      return { from: monthStart, to: today };
    case "lastMonth": {
      const lastEnd = addDays(monthStart, -1);
      return { from: `${lastEnd.slice(0, 8)}01`, to: lastEnd };
    }
  }
}

/** 축 눈금용 짧은 수. 만 단위로 줄인다(120,000 은 12만) — 금액 축이 칸을 넘지 않게 */
export function compactNumber(n: number): string {
  const MAN = 10_000;
  if (Math.abs(n) < MAN) return n.toLocaleString("ko-KR");
  const v = n / MAN;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}만`;
}

/** 표에 보일 날짜 "2026-10-30 (금)". 요일이 있어야 주말에 꺼지는 숫자를 읽는다 */
export function dayWithWeekday(key: string): string {
  // 한국 정오는 UTC 로도 같은 날(03시)이라 UTC 요일이 곧 한국 요일이다 — 서버, 브라우저 시간대와 상관없다
  const noon = new Date(`${key}T12:00:00${KST_OFFSET}`);
  return `${key} (${WEEKDAY_LABEL[noon.getUTCDay()]})`;
}
