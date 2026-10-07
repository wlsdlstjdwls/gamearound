// 가격 알림 조건 판정 — 순수 함수. 목록 화면의 "지금 조건에 맞나" 와 발송(sync/dispatch-alerts)이 같은 규칙을 본다.
//
// 조건은 둘 중 하나다(2026-10-07): 할인율 하한(minDiscountPct) 또는 목표가(targetPrice). 둘 다 채워진 옛 행은 없지만
// 그런 행이 와도 "둘 중 하나라도 맞으면" 으로 읽는다 — 알림은 덜 보내는 쪽보다 한 번 더 보내는 쪽이 덜 아프다.
// 목표가는 원화 행에만 견준다. 환산하지 않는다는 통화 규칙(lib/currency) 그대로다.
import { DISPLAY_CURRENCY } from "@/lib/currency";
import type { Currency } from "@/server/db/schema";

export type AlertCondition = { minDiscountPct: number | null; targetPrice: number | null };

/** 판정에 필요한 플랫폼 행 한 줄 */
export type AlertPriceRow = { platform: string; currentPrice: number | null; currency: Currency; discountPct: number | null };

export type AlertMode = "discount" | "price";

export function conditionMode(c: AlertCondition): AlertMode {
  return c.targetPrice !== null && c.minDiscountPct === null ? "price" : "discount";
}

export function meetsCondition(c: AlertCondition, row: AlertPriceRow): boolean {
  if (row.currentPrice === null) return false;
  const byDiscount = c.minDiscountPct !== null && (row.discountPct ?? 0) >= c.minDiscountPct;
  const byPrice = c.targetPrice !== null && row.currency === DISPLAY_CURRENCY && row.currentPrice <= c.targetPrice;
  return byDiscount || byPrice;
}

/**
 * 조건까지 남은 거리. 맞으면 null.
 * discount: 할인율이 몇 %p 더 올라야 하나, price: 값이 얼마 더 내려야 하나.
 */
export type AlertGap = { kind: "discount"; pct: number } | { kind: "price"; amount: number };

export type AlertStatus = {
  /** 화면에 세울 행 — 맞는 행 중 가장 싼 것, 없으면 원화 행 중 가장 싼 것 */
  best: AlertPriceRow | null;
  met: boolean;
  gap: AlertGap | null;
};

/**
 * 알림 하나의 지금 상태. platform 이 null 이면 모든 플랫폼을 본다(알림의 "전체 플랫폼").
 * 값 없는 행, 원화가 아닌 행은 "가장 싼" 비교에서 뺀다 — 다른 통화끼리 대소는 뜻이 없다.
 */
export function alertStatus(c: AlertCondition, rows: AlertPriceRow[], platform: string | null): AlertStatus {
  const scoped = rows.filter((r) => (platform === null || r.platform === platform) && r.currentPrice !== null && r.currency === DISPLAY_CURRENCY);
  const cheapest = (list: AlertPriceRow[]) => list.reduce<AlertPriceRow | null>((a, r) => (a === null || (r.currentPrice ?? 0) < (a.currentPrice ?? 0) ? r : a), null);
  const metRow = cheapest(scoped.filter((r) => meetsCondition(c, r)));
  if (metRow) return { best: metRow, met: true, gap: null };

  const best = cheapest(scoped);
  if (!best || best.currentPrice === null) return { best: null, met: false, gap: null };
  if (conditionMode(c) === "price" && c.targetPrice !== null) return { best, met: false, gap: { kind: "price", amount: best.currentPrice - c.targetPrice } };
  // 할인율 거리는 행마다 다르다 — 가장 많이 깎인 행 기준으로 잰다(가장 가까운 거리)
  const topPct = Math.max(...scoped.map((r) => r.discountPct ?? 0));
  return { best, met: false, gap: { kind: "discount", pct: Math.max(0, (c.minDiscountPct ?? 1) - topPct) } };
}
