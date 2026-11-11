// 가격 이력 차트의 데이터 다듬기 — 순수 함수라 화면(chart.tsx)과 떼어 둔다(2026-10-26, 300줄 규약으로 쪼갰다).
// 규칙은 chart.tsx 머리 주석 그대로다: 마지막 기록 → 지금까지 수평으로 잇고, 구간 시작에는 앵커 점을 만든다.
import { brandOf, PLATFORM_BRANDS } from "@/lib/platform";
import { PLATFORM_LABEL } from "@/lib/format";
import type { Platform } from "@/server/db/schema";
import type { PriceSeries } from "@/server/services/prices";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type MergedPoint = { t: number } & Partial<Record<Platform, number>>;

export type Prepared = {
  data: MergedPoint[];
  platforms: Platform[];
  /** 플랫폼이 하나일 때만 채워지는 보조 표시값 */
  single: { platform: Platform; listPrice: number | null; low: { t: number; price: number } | null; saleFrom: number | null; saleTo: number | null } | null;
};

/** 그래프 칩, 범례, 말풍선의 이름 — 세대 묶음(PS5, PS4)은 합친 선이라 묶음 이름(PlayStation)으로 부른다 */
export function seriesLabel(platform: Platform): string {
  const brand = brandOf(platform);
  return brand ? PLATFORM_BRANDS[brand].label : (PLATFORM_LABEL[platform] ?? platform);
}

/** 시각 t 에 이 계열이 갖던 값 — t 이전 마지막 기록(계단 그래프와 같은 읽기). 기록 전이면 null */
function priceAt(points: { t: number; price: number }[], t: number): number | null {
  let out: number | null = null;
  for (const p of points) {
    if (p.t > t) break;
    out = p.price;
  }
  return out;
}

/**
 * 같은 세대 묶음(PS5, PS4 / Switch, Switch 2)의 계열을 선 하나로 합친다 — 시각마다 **더 싼 값**이다(2026-11-11 사용자 "가격변동추이에서도 합쳐야").
 * 가격 카드도 한 장으로 합쳤고, 사는 사람에게 묶음의 값은 "그 기기로 살 수 있는 가장 싼 값" 이다.
 * 합친 계열의 platform 은 묶음의 첫 계열 것을 쓴다(선 색, 칩 열쇠). 통화가 다른 계열은 합치지 않는다
 */
export function mergeBrandSeries(series: PriceSeries[]): PriceSeries[] {
  const out: PriceSeries[] = [];
  const used = new Set<PriceSeries>();
  for (const s of series) {
    if (used.has(s)) continue;
    const brand = brandOf(s.platform);
    const mates = brand ? series.filter((o) => !used.has(o) && brandOf(o.platform) === brand && o.currency === s.currency) : [s];
    mates.forEach((m) => used.add(m));
    if (mates.length === 1) {
      out.push(s);
      continue;
    }
    const sorted = mates.map((m) => m.points.map((p) => ({ ...p, ms: new Date(p.t).getTime() })).sort((a, b) => a.ms - b.ms));
    const times = [...new Set(sorted.flatMap((pts) => pts.map((p) => p.ms)))].sort((a, b) => a - b);
    const points = times.flatMap((ms) => {
      const prices = sorted.map((pts) => priceAt(pts.map((p) => ({ t: p.ms, price: p.price })), ms)).filter((v): v is number => v !== null);
      if (prices.length === 0) return [];
      const price = Math.min(...prices);
      // 할인율, 행사명은 그 값을 낸 계열의 그 시각 기록을 따른다
      const src = sorted.map((pts) => [...pts].reverse().find((p) => p.ms <= ms)).find((p) => p?.price === price);
      return [{ t: new Date(ms).toISOString(), price, discountPct: src?.discountPct ?? 0, discountName: src?.discountName ?? null }];
    });
    // 현재 상태(정가선, 진행 중 할인)는 지금 더 싼 계열 것 — 값을 모르는 계열은 뒤로 민다
    const now = [...mates].sort((a, b) => (a.currentPrice ?? Infinity) - (b.currentPrice ?? Infinity))[0];
    out.push({ ...now, platform: s.platform, points });
  }
  return out;
}

/** 한 플랫폼의 시계열을 [구간 시작, ..., 지금] 으로 정규화 */
function clampSeries(s: PriceSeries, from: number | null, now: number): Array<{ t: number; price: number }> {
  const sorted = s.points
    .map((p) => ({ t: new Date(p.t).getTime(), price: p.price }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);
  if (sorted.length === 0) return [];

  const out: Array<{ t: number; price: number }> = [];
  if (from !== null) {
    const prior = [...sorted].reverse().find((p) => p.t < from);
    if (prior) out.push({ t: from, price: prior.price }); // 구간 시작 앵커
    out.push(...sorted.filter((p) => p.t >= from));
  } else {
    out.push(...sorted);
  }
  if (out.length === 0) return [];

  // 마지막 기록 → 지금까지 수평 유지 (현재가가 있으면 그 값으로)
  const last = out[out.length - 1];
  const currentPrice = s.currentPrice ?? last.price;
  if (now > last.t) out.push({ t: now, price: currentPrice });
  return out;
}

export function prepare(series: PriceSeries[], rangeDays: number | null, now: number): Prepared {
  const from = rangeDays === null ? null : now - rangeDays * MS_PER_DAY;
  const byT = new Map<number, MergedPoint>();
  const platforms: Platform[] = [];

  for (const s of series) {
    const points = clampSeries(s, from, now);
    if (points.length === 0) continue;
    platforms.push(s.platform);
    for (const p of points) {
      const row = byT.get(p.t) ?? { t: p.t };
      row[s.platform] = p.price;
      byT.set(p.t, row);
    }
  }

  const data = [...byT.values()].sort((a, b) => a.t - b.t);

  if (series.length === 1 && platforms.length === 1) {
    const s = series[0];
    const inRange = clampSeries(s, from, now);
    const low = inRange.reduce<{ t: number; price: number } | null>((acc, p) => (acc === null || p.price < acc.price ? p : acc), null);
    const onSale = (s.discountPct ?? 0) > 0;
    const saleTo = onSale && s.discountEndsAt ? new Date(s.discountEndsAt).getTime() : null;
    // 시작을 아는 소스(xbox)는 그 시각부터, 모르는 소스(steam)는 "지금부터 종료까지"만 음영 처리
    const saleFrom = onSale ? (s.discountStartsAt ? new Date(s.discountStartsAt).getTime() : now) : null;
    return { data, platforms, single: { platform: s.platform, listPrice: s.listPrice, low, saleFrom, saleTo } };
  }
  return { data, platforms, single: null };
}

