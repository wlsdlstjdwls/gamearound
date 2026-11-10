import { describe, expect, it } from "vitest";
import { listMove, orderMoves, priceMove, quoteSnapshot, sweepShare } from "./price-sweep";

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

describe("listMove", () => {
  const row = { listPrice: 62800, currentPrice: 62800, discountPct: 0 };
  it("정가가 같고 할인이 열리면 sale-started (FF7 리버스 -85%, 2026-11-10 실측)", () => {
    expect(listMove(row, { listPrice: 62800, currentPrice: 9420, discountPct: 85 })).toBe("sale-started");
  });
  it("정가가 다르면 에디션 가격일 수 있어 손대지 않는다", () => {
    expect(listMove({ listPrice: 89800, currentPrice: 89800, discountPct: 0 }, { listPrice: 112800, currentPrice: 112800, discountPct: 0 })).toBeNull();
  });
  it("DB 정가를 모르면 손대지 않는다", () => {
    expect(listMove({ ...row, listPrice: null }, { listPrice: 62800, currentPrice: 9420, discountPct: 85 })).toBeNull();
  });
  it("할인이 끝나면 changed", () => {
    expect(listMove({ listPrice: 62800, currentPrice: 9420, discountPct: 85 }, { listPrice: 62800, currentPrice: 62800, discountPct: 0 })).toBe("changed");
  });
});

describe("quoteSnapshot", () => {
  it("기기와 주소는 DB 행, 가격과 할인 칸은 목록 값", () => {
    const row = { gameId: "g", externalId: "10003999", slug: "ff7", platform: "ps5" as const, storeUrl: "https://store.playstation.com/ko-kr/concept/10003999", listPrice: 62800, currentPrice: 62800, discountPct: 0 };
    expect(quoteSnapshot(row, { storeExternalId: "10003999", listPrice: 62800, currentPrice: 9420, discountPct: 85 })).toEqual({
      platform: "ps5",
      storeExternalId: "10003999",
      storeUrl: row.storeUrl,
      listPrice: 62800,
      currentPrice: 9420,
      discountPct: 85,
      discountStartsAt: null,
      discountEndsAt: null,
      discountName: null,
    });
  });
});
