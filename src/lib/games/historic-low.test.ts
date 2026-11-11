import { describe, expect, it } from "vitest";
import { HISTORIC_LOW_MIN_HISTORY_DAYS, isHistoricLow, longEnoughHistory } from "./historic-low";

const now = new Date("2026-11-11T00:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

describe("longEnoughHistory", () => {
  it(`${HISTORIC_LOW_MIN_HISTORY_DAYS}일 이상이면 참, 모르면 거짓`, () => {
    expect(longEnoughHistory(daysAgo(HISTORIC_LOW_MIN_HISTORY_DAYS), now)).toBe(true);
    expect(longEnoughHistory(daysAgo(HISTORIC_LOW_MIN_HISTORY_DAYS - 1), now)).toBe(false);
    expect(longEnoughHistory(null, now)).toBe(false);
  });
});

describe("isHistoricLow", () => {
  const base = { currentPrice: 20000, discountPct: 50, lowest: 20000, firstSeenAt: daysAgo(61), now };
  it("할인 중이고 기록 최저와 같거나 낮고 기록이 길면 참(동률 포함)", () => {
    expect(isHistoricLow(base)).toBe(true);
  });
  it("기록 최저보다 비싸면 거짓", () => {
    expect(isHistoricLow({ ...base, lowest: 18000 })).toBe(false);
  });
  it("기록이 짧으면 거짓", () => {
    expect(isHistoricLow({ ...base, firstSeenAt: daysAgo(10) })).toBe(false);
  });
  it("할인이 아니거나 값이 0, 모름이면 거짓", () => {
    expect(isHistoricLow({ ...base, discountPct: 0 })).toBe(false);
    expect(isHistoricLow({ ...base, currentPrice: 0 })).toBe(false);
    expect(isHistoricLow({ ...base, currentPrice: null })).toBe(false);
    expect(isHistoricLow({ ...base, lowest: null })).toBe(false);
  });
});
