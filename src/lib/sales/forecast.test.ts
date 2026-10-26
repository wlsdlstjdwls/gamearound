import { describe, expect, it } from "vitest";
import { forecastDiscount, forecastPriceRange } from "@/lib/sales/forecast";

describe("forecastDiscount", () => {
  const now = new Date("2026-10-26T00:00:00Z");

  it("스팀에 있으면 다음 스팀 세일까지 날짜를 센다", () => {
    const f = forecastDiscount({ platforms: ["steam", "ps5"], recordedLow: 12_000, currentLowest: 30_000, now });
    expect(f?.sale).not.toBeNull();
    expect(f?.sale?.daysUntil).toBeGreaterThanOrEqual(0);
    expect(f?.expectedPrice).toBe(12_000);
  });

  it("일정표가 없는 플랫폼뿐이면 날짜는 비우고 가격만", () => {
    const f = forecastDiscount({ platforms: ["switch"], recordedLow: 20_000, currentLowest: 40_000, now });
    expect(f?.sale).toBeNull();
    expect(f?.expectedPrice).toBe(20_000);
  });

  it("날짜도 기록도 없으면 예측하지 않는다", () => {
    expect(forecastDiscount({ platforms: ["switch"], recordedLow: null, currentLowest: 40_000, now })).toBeNull();
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
