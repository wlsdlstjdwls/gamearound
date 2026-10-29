import { describe, expect, it } from "vitest";
import { isProductIdLike, makeOrderId, productShape } from "@/lib/payments/products";

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

describe("productShape", () => {
  it("묶음은 인디 게임이 주 대상, 홍보 글이 둘째 — 자리 순서와 상관없이", () => {
    const b = productShape({ slots: ["promo_pin", "indie_top"] });
    expect(b.target).toBe("indie_post");
    expect(b.extra?.target).toBe("board_post");
    expect(productShape({ slots: ["promo_pin"] })).toEqual({ slot: "promo_pin", target: "board_post" });
  });
});

describe("isProductIdLike", () => {
  it("주문 번호에 들어갈 꼴만 받는다 — 있는 상품인지는 서버가 설정에서 다시 찾는다", () => {
    expect(isProductIdLike("pin_promo_7d")).toBe(true);
    expect(isProductIdLike("p-3fa9")).toBe(true);
    expect(isProductIdLike("a b")).toBe(false);
    expect(isProductIdLike("")).toBe(false);
    expect(isProductIdLike(42)).toBe(false);
  });
});
