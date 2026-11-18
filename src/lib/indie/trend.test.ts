import { describe, expect, it } from "vitest";
import { trendChange } from "./trend";

describe("증감", () => {
  it("늘고 준 개수를 크기로, 방향은 kind 로", () => {
    expect(trendChange(8, 4)).toEqual({ kind: "up", diff: 4 });
    expect(trendChange(3, 5)).toEqual({ kind: "down", diff: 2 });
  });
  it("앞 구간이 0 이어도 개수 그대로", () => {
    expect(trendChange(4, 0)).toEqual({ kind: "up", diff: 4 });
  });
  it("같으면 flat", () => {
    expect(trendChange(0, 0)).toEqual({ kind: "flat", diff: 0 });
  });
});
