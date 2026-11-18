import { describe, expect, it } from "vitest";
import { trendChange } from "./trend";

describe("증감률", () => {
  it("오르면 up, 내리면 down, 크기만 담는다", () => {
    expect(trendChange(12, 8)).toEqual({ kind: "up", pct: 50 });
    expect(trendChange(3, 4)).toEqual({ kind: "down", pct: 25 });
  });
  it("반올림해서 0 이면 변화 없음", () => {
    expect(trendChange(1001, 1000)).toEqual({ kind: "flat", pct: 0 });
  });
  it("앞 구간이 0 이면 비율 대신 새로 생김 / 없음", () => {
    expect(trendChange(5, 0)).toEqual({ kind: "new" });
    expect(trendChange(0, 0)).toEqual({ kind: "none" });
  });
});
