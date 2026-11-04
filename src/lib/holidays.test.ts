import { describe, expect, it } from "vitest";
import { KR_HOLIDAYS } from "./holidays";
import { weekdayOf } from "./calendar";

describe("공휴일 표", () => {
  it("대체공휴일은 평일이고 날짜 모양이 맞다", () => {
    for (const [iso, name] of Object.entries(KR_HOLIDAYS)) {
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (name.startsWith("대체공휴일")) expect([0, 6]).not.toContain(weekdayOf(iso));
    }
  });
  it("설날, 추석 당일이 들어 있다", () => {
    expect(KR_HOLIDAYS["2026-02-17"]).toBe("설날");
    expect(KR_HOLIDAYS["2027-09-15"]).toBe("추석");
  });
});
