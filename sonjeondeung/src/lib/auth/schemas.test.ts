import { describe, expect, it } from "vitest";
import { fieldErrorsOf, normalizeEmail, signInSchema, signUpSchema } from "./schemas";
import { AUTH_MESSAGES as M } from "./messages";

const valid = { displayName: "손전등맨", email: "  Foo@Example.COM ", password: "abcd1234", passwordConfirm: "abcd1234", terms: true };

describe("signUpSchema", () => {
  it("정상 입력 → 이메일 소문자 정규화", () => {
    const r = signUpSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("foo@example.com");
  });
  it("비밀번호 확인 불일치 → passwordConfirm 필드 에러", () => {
    const r = signUpSchema.safeParse({ ...valid, passwordConfirm: "zzzz9999" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsOf(r.error)).toEqual({ passwordConfirm: M.passwordConfirmMismatch });
  });
  it("숫자 없는 비밀번호 → 약함", () => {
    const r = signUpSchema.safeParse({ ...valid, password: "abcdefgh", passwordConfirm: "abcdefgh" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsOf(r.error).password).toBe(M.passwordWeak);
  });
  it("약관 미동의 → terms 에러", () => {
    const r = signUpSchema.safeParse({ ...valid, terms: false });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsOf(r.error).terms).toBe(M.termsRequired);
  });
  it("닉네임 특수문자 거부", () => {
    const r = signUpSchema.safeParse({ ...valid, displayName: "a<b>" });
    expect(r.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("빈 이메일 → emailRequired", () => {
    const r = signInSchema.safeParse({ email: "", password: "x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsOf(r.error).email).toBe(M.emailRequired);
  });
  it("로그인 비밀번호는 강도 규칙을 적용하지 않는다(기존 사용자 보호)", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(true);
  });
});

describe("normalizeEmail", () => {
  it("trim + lowercase", () => expect(normalizeEmail(" A@B.Com ")).toBe("a@b.com"));
});
