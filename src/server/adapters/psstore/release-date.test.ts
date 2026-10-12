import { describe, expect, it } from "vitest";
import { psstoreReleaseDate } from "./release-date";

describe("psstoreReleaseDate", () => {
  it("한국 자정으로 적힌 UTC 값을 한국 날짜로 옮긴다", () => {
    expect(psstoreReleaseDate({ type: "DAY_MONTH_YEAR", value: "2022-07-27T15:00:00Z" })).toBe("2022-07-28");
    expect(psstoreReleaseDate({ type: "DAY_MONTH_YEAR", value: "2020-04-23T00:00:00Z" })).toBe("2020-04-23");
  });

  it("달 정확도는 남긴다", () => {
    expect(psstoreReleaseDate({ type: "MONTH_YEAR", value: "2023-08-31T00:00:00Z" })).toBe("2023-08-31");
  });

  it("해 정확도의 12-31 은 날짜로 믿지 않는다(붉은사막 10002363)", () => {
    expect(psstoreReleaseDate({ type: "YEAR", value: "2026-12-31T00:00:00Z" })).toBeNull();
  });

  it("type 이 없거나 모르는 값이면 버린다", () => {
    expect(psstoreReleaseDate({ value: "2026-01-01T00:00:00Z" })).toBeNull();
    expect(psstoreReleaseDate({ type: "QUARTER_YEAR", value: "2026-03-31T00:00:00Z" })).toBeNull();
    expect(psstoreReleaseDate({ type: "DAY_MONTH_YEAR", value: "not a date" })).toBeNull();
    expect(psstoreReleaseDate(null)).toBeNull();
  });
});
