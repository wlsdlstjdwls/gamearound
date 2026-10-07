import { describe, expect, it } from "vitest";
import { alertStatus, conditionMode, meetsCondition, type AlertPriceRow } from "./condition";

const row = (o: Partial<AlertPriceRow>): AlertPriceRow => ({ platform: "steam", currentPrice: 30000, currency: "KRW", discountPct: 0, ...o });

describe("meetsCondition", () => {
  it("할인율 하한 이상이면 맞다", () => {
    expect(meetsCondition({ minDiscountPct: 40, targetPrice: null }, row({ discountPct: 40 }))).toBe(true);
    expect(meetsCondition({ minDiscountPct: 40, targetPrice: null }, row({ discountPct: 39 }))).toBe(false);
  });
  it("목표가 이하면 맞다, 원화 행만 견준다", () => {
    expect(meetsCondition({ minDiscountPct: null, targetPrice: 30000 }, row({}))).toBe(true);
    expect(meetsCondition({ minDiscountPct: null, targetPrice: 29999 }, row({}))).toBe(false);
    expect(meetsCondition({ minDiscountPct: null, targetPrice: 99999 }, row({ currency: "JPY" }))).toBe(false);
  });
  it("값을 모르면 맞지 않는다", () => {
    expect(meetsCondition({ minDiscountPct: 1, targetPrice: null }, row({ currentPrice: null, discountPct: 50 }))).toBe(false);
  });
});

describe("conditionMode", () => {
  it("목표가만 있으면 price, 나머지는 discount", () => {
    expect(conditionMode({ minDiscountPct: null, targetPrice: 1000 })).toBe("price");
    expect(conditionMode({ minDiscountPct: 1, targetPrice: null })).toBe("discount");
  });
});

describe("alertStatus", () => {
  const rows = [row({ platform: "steam", currentPrice: 30000, discountPct: 25 }), row({ platform: "epic", currentPrice: 20000, discountPct: 50 })];
  it("맞는 행 중 가장 싼 것을 세운다", () => {
    const s = alertStatus({ minDiscountPct: 50, targetPrice: null }, rows, null);
    expect(s.met).toBe(true);
    expect(s.best?.platform).toBe("epic");
  });
  it("플랫폼을 고른 알림은 그 행만 본다", () => {
    const s = alertStatus({ minDiscountPct: 50, targetPrice: null }, rows, "steam");
    expect(s.met).toBe(false);
    expect(s.gap).toEqual({ kind: "discount", pct: 25 });
  });
  it("목표가 거리는 가장 싼 값에서 잰다", () => {
    const s = alertStatus({ minDiscountPct: null, targetPrice: 15000 }, rows, null);
    expect(s.gap).toEqual({ kind: "price", amount: 5000 });
  });
  it("원화 값이 없으면 best 가 없다", () => {
    expect(alertStatus({ minDiscountPct: 1, targetPrice: null }, [row({ currency: "JPY" })], null).best).toBeNull();
  });
});
