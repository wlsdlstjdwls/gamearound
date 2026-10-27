import { describe, expect, it } from "vitest";
import { addMonth, afterFailedCharge, canUseBenefits, MAX_FAILED_ATTEMPTS, nextPeriodStart, renewalAction } from "@/lib/membership/plan";

const d = (s: string) => new Date(s);

describe("addMonth", () => {
  it("달력 한 달, 시각은 그대로", () => {
    expect(addMonth(d("2026-10-27T06:00:00Z")).toISOString()).toBe("2026-11-27T06:00:00.000Z");
  });
  it("그달에 그날이 없으면 마지막 날로", () => {
    expect(addMonth(d("2026-01-31T00:00:00Z")).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(addMonth(d("2028-01-31T00:00:00Z")).toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });
  it("12월은 다음 해 1월", () => {
    expect(addMonth(d("2026-12-15T00:00:00Z")).toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });
});

describe("renewalAction", () => {
  const now = d("2026-11-27T10:00:00Z");
  const end = d("2026-11-27T06:00:00Z");
  it("기간이 끝난 active 는 청구", () => {
    expect(renewalAction({ status: "active", currentPeriodEnd: end, nextChargeAt: end }, now)).toBe("charge");
  });
  it("아직이면 아무것도 안 한다", () => {
    expect(renewalAction({ status: "active", currentPeriodEnd: d("2026-12-01T00:00:00Z"), nextChargeAt: d("2026-12-01T00:00:00Z") }, now)).toBe("none");
  });
  it("해지 예약은 기간 끝에 끝낸다, 청구하지 않는다", () => {
    expect(renewalAction({ status: "canceling", currentPeriodEnd: end, nextChargeAt: null }, now)).toBe("end");
  });
  it("past_due 는 재시도 시각이 되면 다시 청구", () => {
    expect(renewalAction({ status: "past_due", currentPeriodEnd: end, nextChargeAt: d("2026-11-28T06:00:00Z") }, now)).toBe("none");
    expect(renewalAction({ status: "past_due", currentPeriodEnd: end, nextChargeAt: end }, now)).toBe("charge");
  });
  it("ended 는 건드리지 않는다", () => {
    expect(renewalAction({ status: "ended", currentPeriodEnd: end, nextChargeAt: end }, now)).toBe("none");
  });
});

describe("afterFailedCharge", () => {
  const now = d("2026-11-27T10:00:00Z");
  it("하루 뒤 다시", () => {
    expect(afterFailedCharge(0, now)).toEqual({ status: "past_due", failedAttempts: 1, nextChargeAt: d("2026-11-28T10:00:00Z") });
  });
  it("마지막 시도면 끝", () => {
    expect(afterFailedCharge(MAX_FAILED_ATTEMPTS - 1, now)).toEqual({ status: "ended", failedAttempts: MAX_FAILED_ATTEMPTS, nextChargeAt: null });
  });
});

describe("nextPeriodStart", () => {
  const now = d("2026-11-27T10:00:00Z");
  it("제때 갱신은 지난 끝에서 잇는다(크론이 늦어도 날짜가 밀리지 않게)", () => {
    expect(nextPeriodStart({ status: "active", currentPeriodEnd: d("2026-11-27T06:00:00Z") }, now)).toEqual(d("2026-11-27T06:00:00Z"));
  });
  it("실패 뒤 늦은 성공, 처음 시작은 지금부터", () => {
    expect(nextPeriodStart({ status: "past_due", currentPeriodEnd: d("2026-11-25T06:00:00Z") }, now)).toEqual(now);
    expect(nextPeriodStart(null, now)).toEqual(now);
  });
});

describe("canUseBenefits", () => {
  const now = d("2026-11-10T00:00:00Z");
  const end = d("2026-11-27T00:00:00Z");
  it("해지 예약 중에도 기간 끝까지 쓴다", () => {
    expect(canUseBenefits({ status: "canceling", currentPeriodEnd: end }, now)).toBe(true);
  });
  it("past_due, ended, 기간 지남은 못 쓴다", () => {
    expect(canUseBenefits({ status: "past_due", currentPeriodEnd: end }, now)).toBe(false);
    expect(canUseBenefits({ status: "ended", currentPeriodEnd: end }, now)).toBe(false);
    expect(canUseBenefits({ status: "active", currentPeriodEnd: d("2026-11-01T00:00:00Z") }, now)).toBe(false);
  });
});
