import { describe, expect, it } from "vitest";
import { activeMonthIndex, byYear, monthAnchor } from "./upcoming";

describe("byYear", () => {
  it("연도가 바뀌는 자리에서만 묶음을 새로 연다", () => {
    const out = byYear([
      { key: "2026-11", total: 21 },
      { key: "2026-12", total: 47 },
      { key: "2027-01", total: 9 },
    ]);
    expect(out).toEqual([
      {
        year: "2026",
        months: [
          { key: "2026-11", month: "11월", total: 21 },
          { key: "2026-12", month: "12월", total: 47 },
        ],
      },
      { year: "2027", months: [{ key: "2027-01", month: "1월", total: 9 }] },
    ]);
  });

  it("빈 목록은 빈 묶음", () => {
    expect(byYear([])).toEqual([]);
  });
});

describe("activeMonthIndex", () => {
  const tops = [100, 900, 1500];
  it("아무것도 안 지났으면 첫 달", () => expect(activeMonthIndex(tops, 50)).toBe(0));
  it("눈금을 지난 마지막 마디", () => expect(activeMonthIndex(tops, 1000)).toBe(1));
  it("눈금과 같은 자리는 지난 것으로 친다", () => expect(activeMonthIndex(tops, 1500)).toBe(2));
});

it("monthAnchor", () => expect(monthAnchor("2026-10")).toBe("m2026-10"));
