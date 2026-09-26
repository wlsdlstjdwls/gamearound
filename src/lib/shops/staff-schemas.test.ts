// 직원 초대 검증 테스트 — 순수 함수만. 네트워크, DB 를 건드리지 않는다(AGENTS §8).
import { describe, expect, it } from "vitest";
import { judgeInvite, normalizeEmail, staffInviteSchema } from "./staff-schemas";
import { STAFF_MESSAGES } from "./staff-messages";

const NOW = new Date("2026-09-26T12:00:00Z");
const LATER = new Date("2026-09-27T12:00:00Z");

describe("staffInviteSchema", () => {
  it("이메일을 소문자로 맞춘다", () => {
    const r = staffInviteSchema.parse({ email: "  Alba@Example.COM ", role: "staff" });
    expect(r.email).toBe("alba@example.com");
  });

  it("owner 는 초대로 못 준다", () => {
    const r = staffInviteSchema.safeParse({ email: "a@b.co", role: "owner" });
    expect(r.success).toBe(false);
  });

  it("이메일 꼴이 아니면 문구를 돌려준다", () => {
    const r = staffInviteSchema.safeParse({ email: "no-at-sign", role: "staff" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(STAFF_MESSAGES.emailInvalid);
  });
});

describe("judgeInvite", () => {
  const invite = { email: "alba@example.com", expiresAt: LATER, acceptedAt: null };

  it("같은 이메일이면 통과한다(대소문자 무시)", () => {
    expect(judgeInvite(invite, "ALBA@example.com", NOW)).toBe("ok");
  });

  it("다른 계정이면 막는다", () => {
    expect(judgeInvite(invite, "other@example.com", NOW)).toBe("mismatch");
  });

  it("만료 시각과 같으면 만료다", () => {
    expect(judgeInvite({ ...invite, expiresAt: NOW }, "alba@example.com", NOW)).toBe("expired");
  });

  it("쓴 초대가 만료보다 먼저 보인다", () => {
    expect(judgeInvite({ ...invite, expiresAt: NOW, acceptedAt: NOW }, "alba@example.com", NOW)).toBe("used");
  });

  it("normalizeEmail 은 앞뒤 공백을 뗀다", () => {
    expect(normalizeEmail(" A@B.co ")).toBe("a@b.co");
  });
});
