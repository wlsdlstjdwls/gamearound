import { describe, expect, it } from "vitest";
import { addDays, compactNumber, daySeries, daysIn, periodRange, presetPeriod, previousPeriod, resolvePeriod } from "./period";

const NOW = new Date("2026-10-30T03:00:00Z"); // 한국 2026-10-30 12시

describe("resolvePeriod", () => {
  it("값이 없으면 오늘까지 기본 일수", () => {
    expect(resolvePeriod({}, { defaultDays: 7, maxDays: 90, now: NOW })).toEqual({ from: "2026-10-24", to: "2026-10-30" });
  });
  it("거꾸로 준 기간은 바꿔 세운다", () => {
    expect(resolvePeriod({ from: "2026-10-10", to: "2026-10-01" }, { defaultDays: 7, maxDays: 90, now: NOW })).toEqual({ from: "2026-10-01", to: "2026-10-10" });
  });
  it("상한을 넘으면 끝일 기준으로 자른다", () => {
    expect(resolvePeriod({ from: "2026-01-01", to: "2026-10-30" }, { defaultDays: 7, maxDays: 30, now: NOW })).toEqual({ from: "2026-10-01", to: "2026-10-30" });
  });
  it("틀린 값은 버린다", () => {
    expect(resolvePeriod({ from: "2026-13-40", to: "x" }, { defaultDays: 1, maxDays: 30, now: NOW })).toEqual({ from: "2026-10-30", to: "2026-10-30" });
  });
});

describe("날짜 계산", () => {
  it("한국 날짜로 더하고 센다", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(daysIn({ from: "2026-10-01", to: "2026-10-30" })).toBe(30);
    expect(daySeries({ from: "2026-10-30", to: "2026-11-01" })).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });
  it("범위는 한국 0시부터 다음날 0시 전까지", () => {
    const r = periodRange({ from: "2026-10-30", to: "2026-10-30" });
    expect(r.start.toISOString()).toBe("2026-10-29T15:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-10-30T15:00:00.000Z");
  });
  it("앞 기간은 같은 길이", () => {
    expect(previousPeriod({ from: "2026-10-24", to: "2026-10-30" })).toEqual({ from: "2026-10-17", to: "2026-10-23" });
  });
});

describe("presetPeriod, compactNumber", () => {
  it("빠른 선택", () => {
    expect(presetPeriod("thisMonth", NOW)).toEqual({ from: "2026-10-01", to: "2026-10-30" });
    expect(presetPeriod("lastMonth", NOW)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(presetPeriod("d7", NOW)).toEqual({ from: "2026-10-24", to: "2026-10-30" });
  });
  it("만 단위로 줄인다", () => {
    expect(compactNumber(9900)).toBe("9,900");
    expect(compactNumber(120000)).toBe("12만");
    expect(compactNumber(125000)).toBe("12.5만");
  });
});
