import { describe, expect, it } from "vitest";
import { BUNDLE_DISCOUNT_RATE, BUNDLE_SAVING, discountRate, isProductKey, isSingleProduct, makeOrderId, perDay, PRODUCTS } from "@/lib/payments/products";

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
  it("낱개 7일은 6,900원, 둘을 같이 사면 9,900원(2026-10-27 사용자 확정)", () => {
    expect(PRODUCTS.boost_indie_7d.amount).toBe(6900);
    expect(PRODUCTS.pin_promo_7d.amount).toBe(6900);
    expect(PRODUCTS.bundle_7d.amount).toBe(9900);
    expect(BUNDLE_SAVING).toBe(3900);
  });
  it("묶음은 인디 게임이 주 대상, 홍보 글이 둘째", () => {
    expect(PRODUCTS.bundle_7d.target).toBe("indie_post");
    expect(PRODUCTS.bundle_7d.extra.target).toBe("board_post");
    expect(isSingleProduct("bundle_7d")).toBe(false);
    expect(isSingleProduct("pin_promo_7d")).toBe(true);
  });
});

describe("isProductKey", () => {
  it("표에 있는 열쇠만 받는다 — 브라우저에서 온 값을 거른다", () => {
    expect(isProductKey("pin_promo_7d")).toBe(true);
    expect(isProductKey("toString")).toBe(false);
    expect(isProductKey("free")).toBe(false);
  });
});

describe("discountRate", () => {
  it("소수점을 버린다(28.26% 는 28%)", () => {
    expect(discountRate(13_800, 9_900)).toBe(28);
    expect(BUNDLE_DISCOUNT_RATE).toBe(28);
  });
  it("정가가 없거나 할인이 아니면 0", () => {
    expect(discountRate(0, 100)).toBe(0);
    expect(discountRate(100, 100)).toBe(0);
    expect(discountRate(100, 120)).toBe(0);
  });
});

describe("perDay", () => {
  it("하루 값을 내린다", () => {
    expect(perDay(19_900, 30)).toBe(663);
    expect(perDay(9_900, 7)).toBe(1414);
  });
  it("기간이 0 이면 값 그대로", () => {
    expect(perDay(500, 0)).toBe(500);
  });
});
