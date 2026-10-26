import { describe, expect, it } from "vitest";
import { formatPostDate } from "@/lib/format";

describe("formatPostDate", () => {
  const now = new Date("2026-10-26T06:00:00Z"); // KST 15:00
  it("오늘은 시각, 올해는 월.일, 그 전은 연.월.일", () => {
    expect(formatPostDate(new Date("2026-10-26T01:05:00Z"), now)).toBe("10:05");
    expect(formatPostDate(new Date("2026-03-02T01:05:00Z"), now)).toBe("03.02");
    expect(formatPostDate(new Date("2025-12-31T01:05:00Z"), now)).toBe("25.12.31");
  });
  it("KST 자정을 넘긴 UTC 전날 글은 오늘이다", () => {
    expect(formatPostDate(new Date("2026-10-25T15:30:00Z"), now)).toBe("00:30");
  });
});
