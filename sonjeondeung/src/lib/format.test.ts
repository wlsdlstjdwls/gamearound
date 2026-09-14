// 포맷 유틸 테스트 — 할인 기간 표시(순수 함수, now 를 인자로 받는다)
import { describe, expect, it } from "vitest";
import { formatSaleWindow, saleRemaining } from "./format";

const NOW = Date.parse("2026-09-14T00:00:00Z");

describe("saleRemaining", () => {
  it("남은 일수 (올림)", () => {
    expect(saleRemaining("2026-09-16T23:59:59Z", NOW)).toMatchObject({ days: 3, urgent: true });
    expect(saleRemaining("2026-09-30T00:00:00Z", NOW)).toMatchObject({ days: 16, urgent: false });
  });
  it("24시간 미만은 시간 단위 + urgent", () => {
    expect(saleRemaining("2026-09-14T05:00:00Z", NOW)).toMatchObject({ text: "5시간 남음", days: 0, urgent: true });
  });
  it("이미 끝났거나 값이 없으면 null", () => {
    expect(saleRemaining("2026-09-13T00:00:00Z", NOW)).toBeNull();
    expect(saleRemaining(null, NOW)).toBeNull();
    expect(saleRemaining("깨진값", NOW)).toBeNull();
  });
});

describe("formatSaleWindow", () => {
  it("있는 쪽만 쓴다", () => {
    expect(formatSaleWindow(null, null)).toBeNull();
    expect(formatSaleWindow("2026-09-10T00:00:00Z", null)).toContain("시작");
    expect(formatSaleWindow(null, "2026-09-16T14:59:59Z")).toContain("종료");
    expect(formatSaleWindow("2026-09-10T00:00:00Z", "2026-09-16T14:59:59Z")).toContain("→");
  });
});
