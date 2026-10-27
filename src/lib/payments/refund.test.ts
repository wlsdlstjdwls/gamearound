import { describe, expect, it } from "vitest";
import { proratedRefund } from "@/lib/payments/refund";

const DAY = 86_400_000;
const start = new Date("2026-10-27T00:00:00Z");
const boost = { startsAt: start, endsAt: new Date(start.getTime() + 7 * DAY), revokedAt: null };

describe("proratedRefund", () => {
  it("부스트가 없으면(걸기 실패) 전액", () => {
    expect(proratedRefund(9900, null, start)).toBe(9900);
  });
  it("시작 전이면 전액", () => {
    expect(proratedRefund(9900, boost, new Date(start.getTime() - DAY))).toBe(9900);
  });
  it("끝났으면 0", () => {
    expect(proratedRefund(9900, boost, new Date(start.getTime() + 8 * DAY))).toBe(0);
  });
  it("사흘 쓰면 나흘 몫, 원 아래는 버린다", () => {
    expect(proratedRefund(9900, boost, new Date(start.getTime() + 3 * DAY))).toBe(Math.floor((9900 * 4) / 7));
  });
  it("관리자가 먼저 회수했으면 회수 시각까지만 쓴 것으로 본다", () => {
    const revoked = { ...boost, revokedAt: new Date(start.getTime() + DAY) };
    expect(proratedRefund(9900, revoked, new Date(start.getTime() + 5 * DAY))).toBe(Math.floor((9900 * 6) / 7));
  });
});
