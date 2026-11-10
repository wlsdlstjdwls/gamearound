import { describe, expect, it } from "vitest";
import { orderMoves, priceMove, sweepShare } from "./price-sweep";

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

describe("sweepShare", () => {
  const base = { limit: 300, detailTop: 55, shareMax: 0.7 };
  it("변동이 평소 자리(300 x 0.7 - 55 = 155) 안이면 평소대로", () => {
    expect(sweepShare({ ...base, moves: 40, surgeLimit: 2500 })).toEqual({ limit: 300, detailTop: 55, swept: 40, surge: false });
  });
  it("넘치면 큰 세일 회차: 상세를 쉬고 변동을 다 싣는다", () => {
    expect(sweepShare({ ...base, moves: 1000, surgeLimit: 2500 })).toEqual({ limit: 1000, detailTop: 0, swept: 1000, surge: true });
  });
  it("상한을 넘는 변동은 상한까지만, 나머지는 다음 회차", () => {
    expect(sweepShare({ ...base, moves: 4000, surgeLimit: 2500 })).toEqual({ limit: 2500, detailTop: 0, swept: 2500, surge: true });
  });
  it("상한이 없는 소스는 넘쳐도 평소대로", () => {
    expect(sweepShare({ ...base, moves: 1000 })).toEqual({ limit: 300, detailTop: 55, swept: 155, surge: false });
  });
  it("변동이 평소 몫보다 적어도 늘린 몫은 평소 몫 밑으로 안 내려간다", () => {
    expect(sweepShare({ ...base, detailTop: 200, moves: 50, surgeLimit: 2500 }).limit).toBe(300);
  });
});
