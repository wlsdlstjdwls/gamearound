import { describe, expect, it } from "vitest";
import { xboxReleaseDate } from "./xbox";

const product = (original: string | null, starts: Array<[string, string[]]>) => ({
  MarketProperties: [{ OriginalReleaseDate: original }],
  DisplaySkuAvailabilities: [{ Availabilities: starts.map(([d, actions]) => ({ Actions: actions, Conditions: { StartDate: d } })) }],
});

describe("xboxReleaseDate", () => {
  it("다시 올린 상품은 첫 판매 시작일(사이버펑크 2077 한국 실측)", () => {
    expect(xboxReleaseDate(product("2026-10-22T00:00:00Z", [["2026-11-05T10:00:00Z", ["Purchase"]], ["2020-12-09T15:00:00Z", ["Details", "Redeem"]], ["1753-01-01T00:00:00Z", ["License", "Details"]], ["2019-01-01T00:00:00Z", ["License"]]]))).toBe("2020-12-09T15:00:00Z");
  });
  it("예약 판매는 원래 출시일 그대로", () => {
    expect(xboxReleaseDate(product("2027-03-01T00:00:00Z", [["2026-11-01T00:00:00Z", ["Purchase"]]]))).toBe("2027-03-01T00:00:00Z");
  });
  it("판매 구간만 보고 구매가 아닌 줄은 무시한다", () => {
    expect(xboxReleaseDate(product("2026-10-22T00:00:00Z", [["2019-01-01T00:00:00Z", ["Browse"]]]))).toBe("2026-10-22T00:00:00Z");
  });
});
