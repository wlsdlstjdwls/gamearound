// 비밀번호 강도 계산(순수 함수, 클라이언트 표시용). 서버 규칙은 schemas.ts 의 passwordSchema 가 결정한다.
//
// 막대 단계와 가입 판정이 어긋나지 않게 같은 판정(hasRequiredClasses, isWeakPassword)을 본다 — 막대가 "괜찮아요" 인데
// 제출하면 거절되는 화면이 가장 나쁘다. 3단계부터가 가입이 받는 값이고, 4단계는 그보다 길거나 대소문자까지 섞은 값이다.
// 2단계 글자는 "약함" 대신 무엇이 빠졌는지 말한다(2026-10-30 규칙 강화) — 약하다는 말만으로는 무엇을 더할지 모른다.
import { PASSWORD_MIN } from "@/lib/auth/constants";
import { hasRequiredClasses } from "@/lib/auth/schemas";
import { isWeakPassword } from "@/lib/auth/weak-password";

export type PasswordStrength = {
  /** 0(비어 있음) ~ 4(안전함). 3 이상이면 가입이 받는다 */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
};

/** 4단계로 올려 주는 길이. 규칙(10자)보다 넉넉히 길면 글자 갈래가 같아도 맞히기가 훨씬 어렵다 */
const STRONG_LENGTH = 14;

const LABEL = {
  short: `${PASSWORD_MIN}자 이상 입력해 주세요`,
  common: "너무 쉬운 조합이에요",
  ok: "괜찮아요",
  strong: "안전해요",
} as const;

/** 빠진 갈래 이름. 순서는 안내 문구(passwordHint)와 같다 */
const CLASS_CHECKS: readonly { name: string; test: RegExp }[] = [
  { name: "영문", test: /[A-Za-z]/ },
  { name: "숫자", test: /\d/ },
  { name: "특수문자", test: /[^A-Za-z0-9\sㄱ-ㆎ가-힣]/ },
];

export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: "" };
  if (pw.length < PASSWORD_MIN) return { score: 1, label: LABEL.short };
  if (!hasRequiredClasses(pw)) {
    const missing = CLASS_CHECKS.filter((c) => !c.test.test(pw)).map((c) => c.name);
    return { score: 2, label: `${missing.join(", ")}${missing.length > 0 ? "를 넣어 주세요" : ""}` };
  }
  // 가입이 거절하는 흔한 조합을 막대가 "괜찮아요" 라 부르면 안 된다 — 같은 판정을 본다
  if (isWeakPassword(pw)) return { score: 1, label: LABEL.common };
  const mixedCase = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
  return pw.length >= STRONG_LENGTH || mixedCase ? { score: 4, label: LABEL.strong } : { score: 3, label: LABEL.ok };
}
