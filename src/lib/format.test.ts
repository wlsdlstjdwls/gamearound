// 포맷 유틸 테스트 — 할인 기간 표시(순수 함수, now 를 인자로 받는다)
import { describe, expect, it } from "vitest";
import { formatAgo, formatDate, formatDateTime, formatLongDateTime, formatMonthLabel, formatReleaseDay, formatSaleWindow, formatShortDateTime, saleRemaining } from "./format";

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
    // 요일도 KST 달력에서 나와야 한다 — UTC 로는 9/14(월)이지만 한국에서는 9/15(화)다
    expect(formatDate(AT)).toBe("2026년 9월 15일 (화)");
    expect(formatShortDateTime(AT)).toBe("9월 15일 02:00");
    expect(formatDateTime(AT)).toBe("26. 9. 15. 02:00");
    expect(formatLongDateTime(AT)).toBe("2026년 9월 15일 02:00");
    expect(formatLongDateTime(null)).toBe("-");
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

// 출시일은 시각이 없는 date 값이라 시간대를 옮기면 하루가 밀린다 — 그 사실을 여기서 못 박는다
describe("출시일 표기", () => {
  it("날짜와 요일을 적는다", () => {
    expect(formatReleaseDay("2026-09-24")).toBe("9월 24일 (목)");
    expect(formatReleaseDay("2026-10-01")).toBe("10월 1일 (목)");
  });

  it("시간대 때문에 하루가 밀리지 않는다 — 달의 첫날이 전달로 가지 않는다", () => {
    expect(formatReleaseDay("2026-11-01")).toBe("11월 1일 (일)");
  });

  it("형식이 깨졌으면 받은 값을 그대로 돌려준다", () => {
    expect(formatReleaseDay("미정")).toBe("미정");
  });

  it("달 열쇠를 한국어 머리로 바꾼다", () => {
    expect(formatMonthLabel("2026-10")).toBe("2026년 10월");
    expect(formatMonthLabel("나중")).toBe("나중");
  });
});

describe("formatAgo", () => {
  const now = Date.UTC(2026, 8, 21, 12, 0, 0);
  const ago = (min: number) => formatAgo(new Date(now - min * 60000), now);

  it("단위가 바뀌는 자리를 적는다", () => {
    expect(ago(0)).toBe("방금");
    expect(ago(1)).toBe("방금");
    expect(ago(2)).toBe("2분 전");
    expect(ago(59)).toBe("59분 전");
    expect(ago(60)).toBe("1시간 전");
    expect(ago(60 * 24 - 1)).toBe("23시간 전");
    expect(ago(60 * 24)).toBe("1일 전");
    expect(ago(60 * 24 * 9)).toBe("9일 전");
  });

  it("시계가 어긋나 미래로 읽히는 값은 방금으로 접는다", () => {
    expect(formatAgo(new Date(now + 60_000), now)).toBe("방금");
  });

  it("값이 없으면 대시", () => {
    expect(formatAgo(null, now)).toBe("-");
  });
});
