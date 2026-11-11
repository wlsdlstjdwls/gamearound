import { describe, expect, it } from "vitest";
import { wishSaleReason } from "./wish-sale";

const long = { longHistory: true };

describe("wishSaleReason", () => {
  it("할인이 붙은 하락이면 sale", () => {
    expect(wishSaleReason({ previousPrice: 30000, newPrice: 21000, discountPct: 30, priorLowest: 15000, ...long })).toBe("sale");
  });
  it("지금까지 본 값보다 낮으면 recordLow", () => {
    expect(wishSaleReason({ previousPrice: 30000, newPrice: 12000, discountPct: 60, priorLowest: 15000, ...long })).toBe("recordLow");
  });
  it("기록이 짧으면 최저를 새로 찍어도 sale(역대를 말할 근거가 없다)", () => {
    expect(wishSaleReason({ previousPrice: 30000, newPrice: 12000, discountPct: 60, priorLowest: 15000, longHistory: false })).toBe("sale");
  });
  it("같은 최저가는 기록 갱신이 아니다", () => {
    expect(wishSaleReason({ previousPrice: 30000, newPrice: 15000, discountPct: 50, priorLowest: 15000, ...long })).toBe("sale");
  });
  it("할인 딱지 없는 하락, 오름, 직전 값 없음, 무료 전환은 알리지 않는다", () => {
    expect(wishSaleReason({ previousPrice: 30000, newPrice: 29000, discountPct: 0, priorLowest: null, ...long })).toBeNull();
    expect(wishSaleReason({ previousPrice: 20000, newPrice: 30000, discountPct: 10, priorLowest: null, ...long })).toBeNull();
    expect(wishSaleReason({ previousPrice: null, newPrice: 20000, discountPct: 30, priorLowest: null, ...long })).toBeNull();
    expect(wishSaleReason({ previousPrice: 20000, newPrice: 0, discountPct: 100, priorLowest: null, ...long })).toBeNull();
  });
  it("기록이 없으면 최저를 말하지 않는다", () => {
    expect(wishSaleReason({ previousPrice: 30000, newPrice: 1000, discountPct: 90, priorLowest: null, ...long })).toBe("sale");
  });
});
