import { describe, expect, it } from "vitest";
import { byYear, pickUpcomingMonth, upcomingMonthHref } from "./upcoming";

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

describe("pickUpcomingMonth", () => {
  const keys = ["2026-10", "2026-11"];
  it("주소가 고른 달이 있으면 그 달", () => expect(pickUpcomingMonth(keys, "2026-11")).toBe("2026-11"));
  it("없거나 목록에 없는 달이면 첫 달", () => {
    expect(pickUpcomingMonth(keys, undefined)).toBe("2026-10");
    expect(pickUpcomingMonth(keys, "2030-01")).toBe("2026-10");
  });
  it("달이 하나도 없으면 undefined", () => expect(pickUpcomingMonth([], "2026-10")).toBeUndefined());
});

describe("upcomingMonthHref", () => {
  it("첫 달은 꼬리 없는 주소 — 같은 화면이 늘 같은 주소", () => expect(upcomingMonthHref("2026-10", "2026-10")).toBe("/upcoming"));
  it("다른 달은 ?month=", () => expect(upcomingMonthHref("2026-11", "2026-10")).toBe("/upcoming?month=2026-11"));
});
