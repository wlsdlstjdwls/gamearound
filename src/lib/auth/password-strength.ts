// 비밀번호 강도 계산(순수 함수, 클라이언트 표시용). 서버 규칙은 schemas.ts의 passwordSchema가 결정한다.
import { PASSWORD_MIN } from "@/lib/auth/constants";
import { isWeakPassword } from "@/lib/auth/weak-password";

export type PasswordStrength = {
  /** 0(비어있음) ~ 4(강함) */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
};

const LABELS: Record<PasswordStrength["score"], string> = {
  0: "",
  1: "너무 짧아요",
  2: "약함",
  3: "보통",
  4: "강함",
};

/** 길이는 채웠지만 가입이 거절하는 비번. score 1 은 "너무 짧아요" 와 자리를 나눠 쓴다 */
const WEAK_LABEL = "너무 쉬워요";

export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: LABELS[0] };
  if (pw.length < PASSWORD_MIN) return { score: 1, label: LABELS[1] };
  // 가입이 거절하는 비번을 미터가 "보통" 이라 부르면 안 된다 — 같은 판정(weak-password)을 본다
  if (isWeakPassword(pw)) return { score: 1, label: WEAK_LABEL };

  let variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/\d/.test(pw)) variety++;
  if (/[^A-Za-z0-9]/.test(pw)) variety++;

  const long = pw.length >= 12;
  let score: PasswordStrength["score"] = 2;
  if (variety >= 3 || (variety >= 2 && long)) score = 3;
  if (variety >= 3 && long) score = 4;
  return { score, label: LABELS[score] };
}
