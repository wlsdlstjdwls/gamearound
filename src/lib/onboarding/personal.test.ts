import { describe, expect, it } from "vitest";
import { alertDefaults, dealFloor } from "./personal";

describe("dealFloor", () => {
  it("답이 없으면 아무 할인이나", () => {
    expect(dealFloor(null)).toEqual({ minDiscountPct: 1, historicLow: false });
  });
  it("정가 성향도 할인 중인 것은 보여 준다", () => {
    expect(dealFloor("full_price")).toEqual({ minDiscountPct: 1, historicLow: false });
  });
  it("반값 성향은 50% 이상", () => {
    expect(dealFloor("wait_deep")).toEqual({ minDiscountPct: 50, historicLow: false });
  });
  it("역대 최저가 성향은 할인율이 아니라 가격 이력으로 거른다", () => {
    expect(dealFloor("historic_low")).toEqual({ minDiscountPct: 1, historicLow: true });
  });
});

describe("alertDefaults", () => {
  it("취향이 없으면 폼 기본값에 맡긴다", () => {
    expect(alertDefaults({ dealStyle: null, platforms: null })).toEqual({ minDiscountPct: null, platform: null });
  });
  it("조금이라도 깎이면 성향은 20%", () => {
    expect(alertDefaults({ dealStyle: "wait_small", platforms: null }).minDiscountPct).toBe(20);
  });
  it("정가 성향은 슬라이더 하한 1% 로 올린다", () => {
    expect(alertDefaults({ dealStyle: "full_price", platforms: null }).minDiscountPct).toBe(1);
  });
  it("역대 최저가 성향은 가장 가까운 50% 를 쓴다", () => {
    expect(alertDefaults({ dealStyle: "historic_low", platforms: null }).minDiscountPct).toBe(50);
  });
  it("플랫폼은 하나만 골랐을 때만 미리 고른다", () => {
    expect(alertDefaults({ dealStyle: null, platforms: ["ps5"] }).platform).toBe("ps5");
    expect(alertDefaults({ dealStyle: null, platforms: ["ps5", "steam"] }).platform).toBeNull();
  });
});
