import { describe, expect, it } from "vitest";
import { BUNDLE_SAVING, isProductKey, isSingleProduct, makeOrderId, PRODUCTS } from "@/lib/payments/products";

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
