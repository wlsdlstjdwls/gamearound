import { describe, expect, it } from "vitest";
import { applyPlaytestSchema, createPlaytestSchema, playtestPhase } from "./playtest";

const now = new Date("2026-10-27T00:00:00Z");
const later = new Date("2026-11-01T00:00:00Z");
const earlier = new Date("2026-10-20T00:00:00Z");

describe("playtestPhase", () => {
  it("마감 전이고 자리가 남으면 모집 중", () => {
    expect(playtestPhase({ closesAt: later, closedAt: null, slots: 10, applicants: 3 }, now)).toBe("open");
  });
  it("자리가 차면 인원 마감", () => {
    expect(playtestPhase({ closesAt: later, closedAt: null, slots: 3, applicants: 3 }, now)).toBe("full");
  });
  it("마감 시각이 지나거나 일찍 닫으면 끝", () => {
    expect(playtestPhase({ closesAt: earlier, closedAt: null, slots: 10, applicants: 0 }, now)).toBe("closed");
    expect(playtestPhase({ closesAt: later, closedAt: earlier, slots: 10, applicants: 0 }, now)).toBe("closed");
  });
});

describe("schemas", () => {
  const base = { postId: "3f1d2a9e-1b2c-4d5e-8f90-123456789abc", title: "알파", body: "해 봐요", slots: "20", days: "14" };
  it("기간은 고른 값만 받는다", () => {
    expect(createPlaytestSchema.safeParse(base).success).toBe(true);
    expect(createPlaytestSchema.safeParse({ ...base, days: "10" }).success).toBe(false);
  });
  it("인원은 1 이상", () => {
    expect(createPlaytestSchema.safeParse({ ...base, slots: "0" }).success).toBe(false);
  });
  it("신청 한마디는 비울 수 없다", () => {
    expect(applyPlaytestSchema.safeParse({ playtestId: base.postId, message: "  " }).success).toBe(false);
  });
});
