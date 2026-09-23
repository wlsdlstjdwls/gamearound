import { describe, expect, it } from "vitest";
import { passwordStrength } from "./password-strength";
import { isWeakPassword, longestSequentialRun } from "./weak-password";

describe("isWeakPassword", () => {
  // 2026-09-23 실측: 전부 예전 규칙(8자 + 영문 + 숫자)을 통과하던 것들이다
  it.each(["password1", "qwerty12", "admin123", "aaaaaaa1", "11111111a", "a1234567", "abcd1234", "1q2w3e4r"])("%s 는 쉽다", (pw) => {
    expect(isWeakPassword(pw)).toBe(true);
  });

  it("목록은 대소문자를 가리지 않는다", () => expect(isWeakPassword("PassWord1")).toBe(true));
  it("글자 종류가 셋이면 쉽다", () => expect(isWeakPassword("abababab1")).toBe(true));
  it("내림 연속도 잡는다", () => expect(isWeakPassword("x98765zz")).toBe(true));

  it.each(["tetris4life", "gamearound77", "Zelda2botw", "ab12cd34ef"])("%s 는 통과", (pw) => {
    expect(isWeakPassword(pw)).toBe(false);
  });

  it("연속 4글자까지는 봐준다(평범한 조합이 걸리지 않게)", () => expect(isWeakPassword("abcdz9x7")).toBe(false));
});

describe("longestSequentialRun", () => {
  it("빈 값은 0", () => expect(longestSequentialRun("")).toBe(0));
  it("숫자와 영문 사이는 잇지 않는다", () => expect(longestSequentialRun("789abc")).toBe(3));
  it("오름과 내림 중 긴 쪽", () => expect(longestSequentialRun("12x9876")).toBe(4));
});

describe("passwordStrength 와 가입 판정이 같다", () => {
  it("가입이 거절하는 비번은 미터도 1칸", () => {
    expect(passwordStrength("password1")).toEqual({ score: 1, label: "너무 쉬워요" });
  });
  it("짧은 비번은 여전히 '너무 짧아요'", () => expect(passwordStrength("ab1").label).toBe("너무 짧아요"));
});
