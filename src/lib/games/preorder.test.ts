import { describe, expect, it } from "vitest";
import { isPreorder } from "./preorder";

const TODAY = "2026-10-06";

describe("isPreorder", () => {
  it("출시일이 오늘 뒤이고 값이 있으면 예약이다", () => {
    expect(isPreorder({ releaseDate: "2026-11-18", currentPrice: 89800 }, TODAY)).toBe(true);
    expect(isPreorder({ releaseDate: "2026-10-07", currentPrice: 1 }, TODAY)).toBe(true);
  });

  it("오늘 출시하거나 이미 나온 판은 예약이 아니다", () => {
    expect(isPreorder({ releaseDate: TODAY, currentPrice: 89800 }, TODAY)).toBe(false);
    expect(isPreorder({ releaseDate: "2025-01-01", currentPrice: 89800 }, TODAY)).toBe(false);
  });

  it("값이 없거나 0원이면 예약이 아니다(스팀은 예약을 안 열면 0 으로 준다)", () => {
    expect(isPreorder({ releaseDate: "2027-02-24", currentPrice: 0 }, TODAY)).toBe(false);
    expect(isPreorder({ releaseDate: "2027-02-24", currentPrice: null }, TODAY)).toBe(false);
  });

  it("출시일을 모르면 예약이라고 말하지 않는다", () => {
    expect(isPreorder({ releaseDate: null, currentPrice: 79800 }, TODAY)).toBe(false);
  });

  it("시각이 붙은 값도 날짜만 본다", () => {
    expect(isPreorder({ releaseDate: "2026-10-07T00:00:00.000Z", currentPrice: 100 }, TODAY)).toBe(true);
  });
});
