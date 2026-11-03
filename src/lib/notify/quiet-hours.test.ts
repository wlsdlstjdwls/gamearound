// 회원 발송 시각 — 한국 08시 이상 22시 미만만 보낸다
import { describe, expect, it } from "vitest";
import { isMemberSendHour } from "@/lib/notify/quiet-hours";

const at = (iso: string) => new Date(iso);

describe("isMemberSendHour", () => {
  it("한국 밤, 새벽은 막는다", () => {
    expect(isMemberSendHour(at("2026-11-02T17:05:00Z"))).toBe(false); // 한국 02:05 (가격 회차)
    expect(isMemberSendHour(at("2026-11-02T18:20:00Z"))).toBe(false); // 한국 03:20 (하루 크론)
    expect(isMemberSendHour(at("2026-11-02T22:59:00Z"))).toBe(false); // 한국 07:59
    expect(isMemberSendHour(at("2026-11-03T13:00:00Z"))).toBe(false); // 한국 22:00
  });

  it("한국 낮, 저녁은 보낸다", () => {
    expect(isMemberSendHour(at("2026-11-02T23:00:00Z"))).toBe(true); // 한국 08:00 (아침 모아 보내기)
    expect(isMemberSendHour(at("2026-11-03T00:10:00Z"))).toBe(true); // 한국 09:10
    expect(isMemberSendHour(at("2026-11-03T12:05:00Z"))).toBe(true); // 한국 21:05 (저녁 가격 회차)
  });
});
