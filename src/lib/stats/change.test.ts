import { describe, expect, it } from "vitest";
import { changeRate } from "./change";

describe("changeRate", () => {
  it("앞 기간 대비 백분율(반올림)", () => {
    expect(changeRate(150, 100)).toBe(50);
    expect(changeRate(50, 100)).toBe(-50);
    expect(changeRate(100, 300)).toBe(-67);
  });
  it("앞 기간이 0 이면 null", () => {
    expect(changeRate(10, 0)).toBeNull();
  });
});
