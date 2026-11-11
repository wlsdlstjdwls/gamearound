import { describe, expect, it } from "vitest";
import { mergeBrandSeries, seriesLabel } from "@/components/price-chart/prepare";
import type { PriceSeries } from "@/server/services/prices";

function series(platform: PriceSeries["platform"], points: [string, number][], currentPrice: number | null): PriceSeries {
  return {
    platform,
    currency: "KRW",
    points: points.map(([t, price]) => ({ t, price, discountPct: 0, discountName: null })),
    listPrice: 64800,
    currentPrice,
    discountPct: null,
    discountStartsAt: null,
    discountEndsAt: null,
    discountName: null,
    storeUrl: null,
  };
}

describe("mergeBrandSeries", () => {
  it("PS5, PS4 를 선 하나로 합치고 시각마다 더 싼 값을 쓴다", () => {
    const ps5 = series("ps5", [["2026-09-01T00:00:00.000Z", 64800], ["2026-10-01T00:00:00.000Z", 32400]], 32400);
    const ps4 = series("ps4", [["2026-09-15T00:00:00.000Z", 50000]], 50000);
    const out = mergeBrandSeries([ps5, ps4]);
    expect(out).toHaveLength(1);
    expect(out[0].platform).toBe("ps5");
    expect(out[0].points.map((p) => p.price)).toEqual([64800, 50000, 32400]);
    expect(out[0].currentPrice).toBe(32400);
  });

  it("묶음이 아닌 계열과 통화가 다른 계열은 그대로 둔다", () => {
    const steam = series("steam", [["2026-09-01T00:00:00.000Z", 10000]], 10000);
    const ps5 = series("ps5", [["2026-09-01T00:00:00.000Z", 20000]], 20000);
    const ps4 = { ...series("ps4", [["2026-09-01T00:00:00.000Z", 15]], 15), currency: "USD" as const };
    expect(mergeBrandSeries([steam, ps5, ps4])).toEqual([steam, ps5, ps4]);
  });
});

describe("seriesLabel", () => {
  it("세대 묶음은 묶음 이름, 나머지는 플랫폼 이름", () => {
    expect(seriesLabel("ps4")).toBe("PlayStation");
    expect(seriesLabel("xbox")).toBe("Xbox");
  });
});
