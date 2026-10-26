import { describe, expect, it } from "vitest";
import { forecastDiscount, forecastPriceRange, nextByCycle, summarizeHistory, type ForecastRow } from "@/lib/sales/forecast";

const now = new Date("2026-10-26T00:00:00Z");
const row = (over: Partial<ForecastRow>): ForecastRow => ({
  platform: "steam",
  currentPrice: 30_000,
  listPrice: 30_000,
  discountPct: 0,
  discountEndsAt: null,
  discountName: null,
  ...over,
});

describe("summarizeHistory", () => {
  it("최저가, 최대 할인율, 할인 시작 시각을 뽑는다", () => {
    const h = summarizeHistory("ps5", [
      { t: "2026-07-01T00:00:00Z", price: 50_000, discountPct: 0 },
      { t: "2026-07-10T00:00:00Z", price: 25_000, discountPct: 50 },
      { t: "2026-07-20T00:00:00Z", price: 50_000, discountPct: 0 },
      { t: "2026-09-10T00:00:00Z", price: 30_000, discountPct: 40 },
    ]);
    expect(h.low).toEqual({ price: 25_000, at: "2026-07-10T00:00:00Z" });
    expect(h.maxDiscountPct).toBe(50);
    expect(h.saleStarts).toEqual(["2026-07-10T00:00:00Z", "2026-09-10T00:00:00Z"]);
  });

  it("첫 점부터 할인 중이면 시작을 모르니 세지 않는다", () => {
    expect(summarizeHistory("ps5", [{ t: "2026-07-01T00:00:00Z", price: 20_000, discountPct: 60 }]).saleStarts).toEqual([]);
  });

  it("짧은 간격의 재시작은 같은 행사로 본다", () => {
    const h = summarizeHistory("ps5", [
      { t: "2026-07-01T00:00:00Z", price: 50_000, discountPct: 0 },
      { t: "2026-07-02T00:00:00Z", price: 25_000, discountPct: 50 },
      { t: "2026-07-03T00:00:00Z", price: 50_000, discountPct: 0 },
      { t: "2026-07-04T00:00:00Z", price: 25_000, discountPct: 50 },
    ]);
    expect(h.saleStarts).toEqual(["2026-07-02T00:00:00Z"]);
  });

  it("0원은 최저가로 치지 않는다", () => {
    expect(summarizeHistory("epic", [{ t: "2026-07-01T00:00:00Z", price: 0, discountPct: 100 }]).low).toBeNull();
  });
});

describe("nextByCycle", () => {
  it("평균 간격으로 기준 뒤 첫 회차를 민다", () => {
    const c = nextByCycle(["2026-06-01T00:00:00Z", "2026-07-01T00:00:00Z", "2026-07-31T00:00:00Z"], now);
    expect(c?.cycleDays).toBe(30);
    expect(c?.at.toISOString()).toBe("2026-10-29T00:00:00.000Z");
  });

  it("시작이 하나면 간격이 없다", () => {
    expect(nextByCycle(["2026-06-01T00:00:00Z"], now)).toBeNull();
  });
});

describe("forecastDiscount", () => {
  it("할인 중이면 진행 중 할인을 먼저 말하고, 다음 할인은 그 할인이 끝난 뒤로 센다", () => {
    const f = forecastDiscount({
      rows: [row({ currentPrice: 1_880, listPrice: 23_500, discountPct: 92, discountEndsAt: "2026-11-05T18:00:00Z", discountName: "특별 할인" })],
      history: [],
      now,
    });
    expect(f?.running).toEqual({ name: "특별 할인", pct: 92, daysLeft: 11 });
    // 10-26 시작 할로윈 세일이 아니라, 11-05 뒤에 시작하는 회차여야 한다
    expect(f?.next?.daysUntil).toBeGreaterThan(11);
    // 위쪽 한계는 지금 할인가가 아니라 끝난 뒤의 정가
    expect(f?.expected).toMatchObject({ price: 1_880, basis: "recorded-low", low: 1_692, high: 2_068 });
  });

  it("스팀 행에 값이 없으면 스팀 일정을 붙이지 않는다", () => {
    const f = forecastDiscount({
      rows: [row({ platform: "steam", currentPrice: null, listPrice: null }), row({ platform: "ps5", currentPrice: 88_900, listPrice: 88_900 })],
      history: [summarizeHistory("ps5", [{ t: "2026-10-20T00:00:00Z", price: 88_900, discountPct: 0 }])],
      now,
    });
    expect(f).toBeNull();
  });

  it("스팀이 없으면 그 게임의 지난 할인 주기로 다음 할인을 센다", () => {
    const f = forecastDiscount({
      rows: [row({ platform: "ps5", currentPrice: 60_000, listPrice: 60_000 })],
      history: [
        summarizeHistory("ps5", [
          { t: "2026-06-01T00:00:00Z", price: 60_000, discountPct: 0 },
          { t: "2026-06-10T00:00:00Z", price: 30_000, discountPct: 50 },
          { t: "2026-06-25T00:00:00Z", price: 60_000, discountPct: 0 },
          { t: "2026-08-10T00:00:00Z", price: 36_000, discountPct: 40 },
          { t: "2026-08-25T00:00:00Z", price: 60_000, discountPct: 0 },
        ]),
      ],
      now,
    });
    expect(f?.next).toMatchObject({ name: null, basis: "cycle", cycleDays: 61 });
    expect(f?.expected).toMatchObject({ price: 30_000, basis: "recorded-low", at: "2026-06-10T00:00:00Z" });
  });

  it("더 싼 기록이 없으면 같은 스토어의 최대 할인율을 정가에 곱한다", () => {
    const f = forecastDiscount({
      rows: [row({ platform: "ps5", currentPrice: 40_000, listPrice: 40_000 })],
      // 정가가 올라 옛 할인가가 지금 값보다 비싸지 않은 경우 — 기록 최저가로는 말할 수 없다
      history: [{ platform: "ps5", low: { price: 40_000, at: "2026-09-01T00:00:00Z" }, maxDiscountPct: 50, saleStarts: [] }],
      now,
    });
    expect(f?.expected).toMatchObject({ price: 20_000, basis: "best-rate", pct: 50, low: 18_000, high: 22_000 });
  });

  it("다른 스토어의 할인율은 곱하지 않는다", () => {
    const f = forecastDiscount({
      rows: [row({ platform: "ps5", currentPrice: 40_000, listPrice: 40_000 })],
      history: [{ platform: "xbox", low: null, maxDiscountPct: 50, saleStarts: [] }],
      now,
    });
    expect(f).toBeNull();
  });

  it("스팀에서 팔면 지금 기준 다음 스팀 세일을 센다", () => {
    const f = forecastDiscount({ rows: [row({})], history: [], now });
    expect(f?.running).toBeNull();
    expect(f?.next?.basis).not.toBe("cycle");
    expect(f?.next?.daysUntil).toBeGreaterThanOrEqual(1);
    expect(f?.expected).toBeNull();
  });

  it("끝난 날이 지난 할인 행은 진행 중으로 치지 않는다", () => {
    const f = forecastDiscount({ rows: [row({ currentPrice: 15_000, discountPct: 50, discountEndsAt: "2026-10-20T00:00:00Z" })], history: [], now });
    expect(f?.running).toBeNull();
  });
});

describe("forecastPriceRange", () => {
  it("예상가의 위아래 10% 를 준다", () => {
    expect(forecastPriceRange(20_000, null)).toEqual({ low: 18_000, high: 22_000 });
  });

  it("위쪽은 지금 값을 넘지 않는다", () => {
    expect(forecastPriceRange(20_000, 21_000)).toEqual({ low: 18_000, high: 21_000 });
  });

  it("지금 값이 곧 예상가면 위쪽은 예상가에서 멈춘다", () => {
    expect(forecastPriceRange(20_000, 20_000)).toEqual({ low: 18_000, high: 20_000 });
  });
});
