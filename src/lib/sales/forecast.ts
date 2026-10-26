// 할인 예측(기획서 v2.0 S-05 "다음 할인까지 예상 일수와 예상 가격(±10% 범위)"). 화면은 이 결과를 그리기만 한다.
//
// 세 가지를 따로 말한다(2026-10-26 고침):
//   1. 지금 할인 중인가 — 진행 중인 할인이 있으면 그게 먼저다. 예전에는 -92% 진행 중인 게임에 "다음 할인까지 약 1일" 을 띄웠다.
//      "다음" 은 진행 중 할인이 끝난 뒤를 기준으로 센다.
//   2. 다음 할인은 언제쯤인가 — 근거가 둘이다.
//      a. 스팀에서 실제로 파는 게임(스팀 행에 값이 있다)이면 스팀 세일 일정표(lib/sales/calendar). 스팀 행만 있고 값이 없는
//         게임(콜 오브 듀티처럼 스팀에서 안 파는 판)에 스팀 날짜를 붙이면 거짓이다.
//      b. 그 밖에는 그 게임이 지난 기록에서 할인을 시작한 간격(가격 스냅샷). 시작이 두 번 이상 보여야 간격이 생긴다.
//      둘 다 없으면 날짜를 말하지 않는다.
//   3. 그때 값은 얼마쯤인가 — 근거가 둘이다.
//      a. 지금 기대값보다 싸게 판 것을 본 적이 있으면 그 값(기록 최저가, 플랫폼이 여럿이면 가장 싼 쪽).
//      b. 그런 값이 없으면 같은 스토어에서 이 게임이 받은 가장 큰 할인율을 지금 정가에 곱한 값.
//      둘 다 없으면 값을 말하지 않는다.
// 맞히는 것이 아니라 "기다리면 이 정도" 를 말하는 값이라, 근거가 무엇인지를 함께 돌려준다.
import { upcomingSales } from "@/lib/sales/calendar";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 할인이 다시 시작했다고 보는 최소 간격(일).
 * 스토어 행사는 1~2주 간다(스팀 계절 세일 7~18일, PlayStation 정기 할인 2주). 그보다 짧은 간격의 "재시작" 은
 * 같은 행사를 수집이 한 번 놓쳤다(할인율 0 으로 읽었다) 다시 본 것이라 새 주기로 세지 않는다.
 */
export const MIN_CYCLE_DAYS = 14;

/** 일정표가 주는 근거가 스팀에만 있다 — 스팀 행의 플랫폼 값 */
const CALENDAR_PLATFORM = "steam";

/** 예상 가격의 폭(기획서 v2.0 S-05 "예상 가격(±10% 범위)") */
export const FORECAST_RANGE_PCT = 10;

/** 한 플랫폼의 가격 스냅샷 한 점 */
export type HistoryPoint = { t: string; price: number; discountPct: number };

/** 한 플랫폼의 할인 기록 요약(스냅샷에서 뽑는다, summarizeHistory) */
export type PlatformHistory = {
  platform: string;
  /** 본 적 있는 가장 싼 값과 그때. 0원(무료 배포)은 세지 않는다 */
  low: { price: number; at: string } | null;
  /** 본 적 있는 가장 큰 할인율(0~100) */
  maxDiscountPct: number;
  /** 할인이 시작된 것을 본 시각들(오래된 순). 첫 스냅샷부터 할인 중이면 시작을 모르니 넣지 않는다 */
  saleStarts: string[];
};

/** 지금 값 한 행(한국, 기준 통화). 게임 DTO 의 플랫폼 행에서 그대로 옮긴다 */
export type ForecastRow = {
  platform: string;
  currentPrice: number | null;
  listPrice: number | null;
  discountPct: number | null;
  discountEndsAt: string | null;
  discountName: string | null;
};

export type Forecast = {
  /** 지금 진행 중인 할인. daysLeft 는 끝나는 날을 스토어가 알려 줬을 때만 */
  running: { name: string | null; pct: number; daysLeft: number | null } | null;
  /** 다음 할인까지. basis 가 cycle 이면 name 이 없고 cycleDays 가 붙는다 */
  next: { name: string | null; daysUntil: number; basis: "confirmed" | "estimated" | "cycle"; cycleDays: number | null } | null;
  /** 예상 가격과 그 폭. recorded-low 는 at(본 날), best-rate 는 pct(할인율)가 붙는다 */
  expected: { price: number; low: number; high: number; basis: "recorded-low"; at: string } | { price: number; low: number; high: number; basis: "best-rate"; pct: number } | null;
};

/** 스냅샷 몇 점을 한 플랫폼의 할인 기록 요약으로 접는다. 순서가 섞여 와도 된다 */
export function summarizeHistory(platform: string, points: HistoryPoint[]): PlatformHistory {
  const sorted = [...points].sort((a, b) => a.t.localeCompare(b.t));
  let low: PlatformHistory["low"] = null;
  let maxDiscountPct = 0;
  const saleStarts: string[] = [];
  let prevOnSale: boolean | null = null;
  for (const p of sorted) {
    if (p.price > 0 && (low === null || p.price < low.price)) low = { price: p.price, at: p.t };
    if (p.discountPct > maxDiscountPct) maxDiscountPct = p.discountPct;
    const onSale = p.discountPct > 0;
    if (onSale && prevOnSale === false) {
      const last = saleStarts.at(-1);
      if (!last || Date.parse(p.t) - Date.parse(last) >= MIN_CYCLE_DAYS * DAY_MS) saleStarts.push(p.t);
    }
    prevOnSale = onSale;
  }
  return { platform, low, maxDiscountPct, saleStarts };
}

/**
 * 지난 시작 간격으로 다음 시작을 민다. 간격은 평균이다 — 기록이 짧아(2026-09 부터) 더 정교한 추정은 근거가 못 된다.
 * 기준 시각(from) 뒤의 첫 회차를 돌려준다. 시작이 둘 미만이면 null.
 */
export function nextByCycle(saleStarts: string[], from: Date): { at: Date; cycleDays: number } | null {
  if (saleStarts.length < 2) return null;
  const times = saleStarts.map((s) => Date.parse(s));
  const interval = (times[times.length - 1] - times[0]) / (times.length - 1);
  if (interval < MIN_CYCLE_DAYS * DAY_MS) return null;
  let at = times[times.length - 1] + interval;
  while (at <= from.getTime()) at += interval;
  return { at: new Date(at), cycleDays: Math.round(interval / DAY_MS) };
}

const daysBetween = (from: Date, to: Date) => Math.max(1, Math.ceil((to.getTime() - from.getTime()) / DAY_MS));

/**
 * 예상 가격의 폭. 점 하나로 말하면 "꼭 그 값이 된다" 로 읽힌다 — 같은 게임도 세일마다 할인율이 조금씩 달라서다.
 * 위쪽은 cap(기다리지 않고 살 수 있는 값)에서 자른다: 기다린 끝의 값이 그보다 비싸다는 예측은 기다릴 이유를 지운다.
 */
export function forecastPriceRange(expected: number, cap: number | null, pct: number = FORECAST_RANGE_PCT): { low: number; high: number } {
  const low = Math.round(expected * (1 - pct / 100));
  const raw = Math.round(expected * (1 + pct / 100));
  const high = cap !== null ? Math.max(expected, Math.min(raw, cap)) : raw;
  return { low, high };
}

export function forecastDiscount(input: { rows: ForecastRow[]; history: PlatformHistory[]; now: Date }): Forecast | null {
  const { now } = input;
  const priced = input.rows.filter((r) => r.currentPrice !== null && r.currentPrice > 0);
  if (priced.length === 0) return null;

  // 1. 진행 중 할인 — 할인 행 중 가장 싼 것. 끝나는 날이 지난 행은 수집이 아직 못 지운 것이라 진행 중으로 치지 않는다
  const onSale = priced
    .filter((r) => (r.discountPct ?? 0) > 0 && (!r.discountEndsAt || Date.parse(r.discountEndsAt) > now.getTime()))
    .sort((a, b) => a.currentPrice! - b.currentPrice!)[0];
  const endsAt = onSale?.discountEndsAt ? new Date(onSale.discountEndsAt) : null;
  const running = onSale ? { name: onSale.discountName, pct: onSale.discountPct!, daysLeft: endsAt ? daysBetween(now, endsAt) : null } : null;

  // 2. 다음 할인 — 진행 중이면 그 할인이 끝난 뒤부터 센다(끝을 모르면 지금부터)
  const from = endsAt ?? now;
  let next: Forecast["next"] = null;
  if (priced.some((r) => r.platform === CALENDAR_PLATFORM)) {
    // 시작이 기준 뒤인 회차만. 지금 스팀 세일이 진행 중인데 이 게임이 할인하지 않으면 그 세일은 이 게임의 할인이 아니다
    const sale = upcomingSales(now).find((s) => s.startsAt.getTime() > from.getTime());
    if (sale) next = { name: sale.sale.name, daysUntil: daysBetween(now, sale.startsAt), basis: sale.source, cycleDays: null };
  } else {
    const pricedPlatforms = new Set(priced.map((r) => r.platform));
    const best = input.history
      .filter((h) => pricedPlatforms.has(h.platform))
      .map((h) => nextByCycle(h.saleStarts, from))
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => a.at.getTime() - b.at.getTime())[0];
    if (best) next = { name: null, daysUntil: daysBetween(now, best.at), basis: "cycle", cycleDays: best.cycleDays };
  }

  // 3. 예상 가격 — 위쪽 한계는 기다리지 않고 살 수 있는 값이다. 진행 중이면 그 할인이 끝난 뒤의 값(정가)이 기준이다
  const currentLowest = Math.min(...priced.map((r) => r.currentPrice!));
  const cap = onSale ? (onSale.listPrice ?? currentLowest) : currentLowest;
  const seen = [
    ...input.history.filter((h) => h.low !== null).map((h) => h.low!),
    // 스냅샷이 아직 못 담은 지금 할인가도 본 값이다
    ...(onSale ? [{ price: onSale.currentPrice!, at: now.toISOString() }] : []),
  ].sort((a, b) => a.price - b.price)[0];
  let expected: Forecast["expected"] = null;
  if (seen && seen.price < cap) {
    expected = { price: seen.price, ...forecastPriceRange(seen.price, cap), basis: "recorded-low", at: seen.at };
  } else {
    // 같은 스토어 안에서만 할인율을 곱한다 — 다른 스토어의 할인율은 이 정가에 대해 아무것도 말하지 않는다
    const byRate = priced
      .map((r) => {
        const pct = Math.max(r.discountPct ?? 0, input.history.find((h) => h.platform === r.platform)?.maxDiscountPct ?? 0);
        return r.listPrice && pct > 0 ? { price: Math.round(r.listPrice * (1 - pct / 100)), pct } : null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null && c.price < cap)
      .sort((a, b) => a.price - b.price)[0];
    if (byRate) expected = { price: byRate.price, ...forecastPriceRange(byRate.price, cap), basis: "best-rate", pct: byRate.pct };
  }

  if (!running && !next && !expected) return null;
  return { running, next, expected };
}
