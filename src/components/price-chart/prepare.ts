// 가격 이력 차트의 데이터 다듬기 — 순수 함수라 화면(chart.tsx)과 떼어 둔다(2026-10-26, 300줄 규약으로 쪼갰다).
// 규칙은 chart.tsx 머리 주석 그대로다: 마지막 기록 → 지금까지 수평으로 잇고, 구간 시작에는 앵커 점을 만든다.
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

