import { describe, expect, it } from "vitest";
import { passwordStrength } from "./password-strength";
import { passwordSchema } from "./schemas";

describe("passwordStrength", () => {
  it("비어 있으면 0, 짧으면 1", () => {
    expect(passwordStrength("").score).toBe(0);
    expect(passwordStrength("ab1!").score).toBe(1);
  });
  it("갈래가 빠지면 2 이고 빠진 것을 말한다", () => {
    const r = passwordStrength("gamearound2026");
    expect(r.score).toBe(2);
    expect(r.label).toContain("특수문자");
  });
  it("규칙을 채우면 3, 길거나 대소문자를 섞으면 4", () => {
    expect(passwordStrength("tetris4life!").score).toBe(3);
    expect(passwordStrength("Tetris4life!").score).toBe(4);
    expect(passwordStrength("tetris4life!longer").score).toBe(4);
  });
  it("3 이상이면 가입 스키마도 받는다", () => {
    for (const pw of ["tetris4life!", "Tetris4life!", "gm!9vqz2-onb"]) {
      expect(passwordStrength(pw).score).toBeGreaterThanOrEqual(3);
      expect(passwordSchema.safeParse(pw).success).toBe(true);
    }
  });
});
