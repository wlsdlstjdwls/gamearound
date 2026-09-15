// 포맷 유틸 테스트 — 할인 기간 표시(순수 함수, now 를 인자로 받는다)
import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatSaleWindow, formatShortDateTime, saleRemaining } from "./format";

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
    expect(formatSaleWindow("2026-09-10T00:00:00Z", "2026-09-16T14:59:59Z")).toContain("~");
  });
});

// 런타임(Node, 브라우저)마다 ICU 판이 달라도 같은 글자가 나와야 한다 — 다르면 React 가 수분화에 실패하고
// 그 트리를 클라이언트에서 다시 그린다(화면이 한 번 깜빡인다). 그래서 표기를 직접 만든다
describe("날짜 표기", () => {
  // 2026-09-14T17:00:00Z = KST 2026-09-15 02:00
  const AT = "2026-09-14T17:00:00Z";

  it("KST 로 읽는다", () => {
    expect(formatDate(AT)).toBe("2026. 09. 15.");
    expect(formatShortDateTime(AT)).toBe("9월 15일 02:00");
    expect(formatDateTime(AT)).toBe("26. 9. 15. 02:00");
  });

  it("오전/오후 대신 24시간제로 적는다", () => {
    expect(formatShortDateTime("2026-09-15T05:30:00Z")).toBe("9월 15일 14:30");
  });

  it("값이 없거나 망가졌으면 '-'", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDateTime("아무 글자")).toBe("-");
    expect(formatShortDateTime(undefined)).toBe("-");
  });
});
