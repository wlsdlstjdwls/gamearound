import { describe, expect, it } from "vitest";
import { fieldErrorsOf, normalizeEmail, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";
import { AUTH_MESSAGES as M } from "./messages";

const valid = { displayName: "손전등맨", email: "  Foo@Example.COM ", password: "tetris4life", passwordConfirm: "tetris4life", terms: true };

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
  it("흔한 비밀번호 → passwordCommon (기본 규칙은 통과하는 꼴)", () => {
    const r = signUpSchema.safeParse({ ...valid, password: "password1", passwordConfirm: "password1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsOf(r.error).password).toBe(M.passwordCommon);
  });
  it("약관 미동의 → terms 에러", () => {
    const r = signUpSchema.safeParse({ ...valid, terms: false });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsOf(r.error).terms).toBe(M.termsRequired);
  });
  it.each(["ㅇㅏㄴㅕㅇ", "ㅋㅋㅋ", "철수ㅋ", "ab\uFFA1"])("낱자가 섞인 닉네임 %s → displayNameJamo", (displayName) => {
    const r = signUpSchema.safeParse({ ...valid, displayName });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsOf(r.error).displayName).toBe(M.displayNameJamo);
  });
  it("NFD 로 들어온 온전한 한글은 통과하고 NFC 로 저장된다", () => {
    const nfd = "게이머".normalize("NFD");
    expect(nfd).not.toBe("게이머"); // 전제: 정말 조각으로 들어왔다
    const r = signUpSchema.safeParse({ ...valid, displayName: nfd });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.displayName).toBe("게이머");
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

describe("resetPasswordSchema", () => {
  it("가입과 같은 규칙 — 쉬운 비번은 재설정으로도 못 들어온다", () => {
    const r = resetPasswordSchema.safeParse({ token: "t", password: "password1", passwordConfirm: "password1" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsOf(r.error).password).toBe(M.passwordCommon);
  });

  it("확인 칸이 다르면 그 칸에 오류", () => {
    const r = resetPasswordSchema.safeParse({ token: "t", password: "tetris4life", passwordConfirm: "tetris4lifx" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsOf(r.error).passwordConfirm).toBe(M.passwordConfirmMismatch);
  });

  it("토큰이 비면 거절", () => {
    expect(resetPasswordSchema.safeParse({ token: "", password: "tetris4life", passwordConfirm: "tetris4life" }).success).toBe(false);
  });
});
