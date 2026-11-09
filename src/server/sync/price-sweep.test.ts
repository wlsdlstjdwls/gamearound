import { describe, expect, it } from "vitest";
import { orderMoves, priceMove } from "./price-sweep";

describe("priceMove", () => {
  it("할인이 새로 열리면 sale-started", () => {
    expect(priceMove({ currentPrice: 64800, discountPct: 0 }, { currentPrice: 32400, discountPct: 50 })).toBe("sale-started");
    expect(priceMove({ currentPrice: 64800, discountPct: null }, { currentPrice: 32400, discountPct: 50 })).toBe("sale-started");
  });
  it("할인이 끝나거나 할인율, 값이 바뀌면 changed", () => {
    expect(priceMove({ currentPrice: 32400, discountPct: 50 }, { currentPrice: 64800, discountPct: 0 })).toBe("changed");
    expect(priceMove({ currentPrice: 32400, discountPct: 50 }, { currentPrice: 19440, discountPct: 70 })).toBe("changed");
    expect(priceMove({ currentPrice: 64800, discountPct: 0 }, { currentPrice: 69800, discountPct: 0 })).toBe("changed");
  });
  it("같으면 null, 할인율 null 과 0 은 같은 뜻", () => {
    expect(priceMove({ currentPrice: 64800, discountPct: null }, { currentPrice: 64800, discountPct: 0 })).toBeNull();
  });
  it("스토어가 값을 못 주면 변동으로 치지 않는다", () => {
    expect(priceMove({ currentPrice: 64800, discountPct: 0 }, { currentPrice: null, discountPct: null })).toBeNull();
  });
});

describe("orderMoves", () => {
  it("새 할인이 먼저, 갈래 안에서는 들어온 순서", () => {
    const out = orderMoves([
      { row: "a", move: "changed" },
      { row: "b", move: "sale-started" },
      { row: "c", move: "changed" },
      { row: "d", move: "sale-started" },
    ]);
    expect(out).toEqual(["b", "d", "a", "c"]);
  });
});
