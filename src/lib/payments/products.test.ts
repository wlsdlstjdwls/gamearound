import { describe, expect, it } from "vitest";
import { isProductKey, makeOrderId, PRODUCTS } from "@/lib/payments/products";

describe("makeOrderId", () => {
  it("토스 규칙(영숫자, -, _)만 남기고 64자로 자른다", () => {
    expect(makeOrderId("boost", "ab12CD")).toBe("boost_ab12CD");
    expect(makeOrderId("boost", "a.b/c!")).toBe("boost_abc");
    expect(makeOrderId("boost", "x".repeat(100))).toHaveLength(64);
  });
  it("32자 hex 꼬리를 붙이면 6~64자 안이다", () => {
    const id = makeOrderId("boost", "0123456789abcdef0123456789abcdef");
    expect(id.length).toBeGreaterThanOrEqual(6);
    expect(id.length).toBeLessThanOrEqual(64);
  });
});

describe("PRODUCTS", () => {
  it("부스트 7일은 9,900원(2026-10-27 사용자 확정)", () => {
    expect(PRODUCTS.boost_indie_7d.amount).toBe(9900);
    expect(PRODUCTS.boost_indie_7d.days).toBe(7);
  });
});

describe("isProductKey", () => {
  it("표에 있는 열쇠만 받는다 — 브라우저에서 온 값을 거른다", () => {
    expect(isProductKey("pin_promo_7d")).toBe(true);
    expect(isProductKey("toString")).toBe(false);
    expect(isProductKey("free")).toBe(false);
  });
});
