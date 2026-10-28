import { describe, expect, it } from "vitest";
import { CALENDAR_CELLS, isOutOfRange, monthGrid, parseIsoDate, shiftDay, shiftMonth, todayIsoKst, weekdayOf } from "@/lib/calendar";

describe("calendar", () => {
  it("없는 날짜는 읽지 않는다", () => {
    expect(parseIsoDate("2026-02-29")).toBeNull();
    expect(parseIsoDate("2028-02-29")).toEqual({ year: 2028, month: 2, day: 29 });
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
  });

  it("달과 날을 해 경계 너머로 옮긴다", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("달력 한 장은 일요일에 시작하는 42칸이다", () => {
    // 2026-10-01 은 목요일이다
    expect(weekdayOf("2026-10-01")).toBe(4);
    const grid = monthGrid({ year: 2026, month: 10 });
    expect(grid).toHaveLength(CALENDAR_CELLS);
    expect(grid[0]).toEqual({ iso: "2026-09-27", day: 27, inMonth: false });
    expect(grid[4]).toEqual({ iso: "2026-10-01", day: 1, inMonth: true });
    expect(grid.filter((c) => c.inMonth)).toHaveLength(31);
  });

  it("오늘은 한국 날짜다", () => {
    // UTC 10-27 16:00 은 한국 10-28 01:00
    expect(todayIsoKst(Date.UTC(2026, 9, 27, 16))).toBe("2026-10-28");
  });

  it("범위 밖을 가린다", () => {
    expect(isOutOfRange("2026-10-01", "2026-10-02")).toBe(true);
    expect(isOutOfRange("2026-10-03", "2026-10-02", "2026-10-03")).toBe(false);
    expect(isOutOfRange("2026-10-04", null, "2026-10-03")).toBe(true);
  });
});
