// 쉬운 비밀번호 판정(순수 함수). 가입 스키마(schemas.ts)와 강도 미터(password-strength.ts)가 **같은 판정**을 본다 —
// 둘이 따로 놀면 미터는 "보통" 이라는데 제출하면 거절되는 화면이 된다.
//
// 발상은 fitin-app 의 common_password.ts(취약 목록, 반복, 연속 숫자)에서 왔고, 문턱은 우리 규칙에 맞췄다.
// 우리 기본 규칙(8자 + 영문 + 숫자, schemas.ts)을 **이미 통과하는** 것만 거르면 되므로 목록도 그 조건을
// 만족하는 것만 둔다 — "12345678", "password" 는 기본 규칙에서 먼저 떨어져 여기 둘 이유가 없다.
//
// 로그인에는 걸지 않는다(passwordLooseSchema). 규칙이 강해져도 이미 가입한 계정은 잠기면 안 된다.
import { PASSWORD_MAX_SEQUENTIAL_RUN, PASSWORD_MIN_DISTINCT_CHARS } from "@/lib/auth/constants";

/**
 * 흔히 유출되는 조합 가운데 8자 + 영문 + 숫자를 통과하는 것. 소문자로 비교한다.
 * 연속 규칙이 못 잡는 꼴이 주인공이다 — 자판 줄("qwer1234", "1q2w3e4r"), 4+4 조각("abcd1234"), 낱말 + 숫자("password1").
 */
export const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  "password1",
  "password12",
  "password123",
  "passw0rd",
  "p@ssw0rd",
  "qwerty12",
  "qwerty123",
  "qwer1234",
  "asdf1234",
  "zxcv1234",
  "abcd1234",
  "abc12345",
  "admin123",
  "admin1234",
  "test1234",
  "iloveyou1",
  "welcome1",
  "letmein1",
  "1q2w3e4r",
  "1qaz2wsx",
  "q1w2e3r4",
  "monkey123",
  "dragon123",
  "sunshine1",
]);

const DIGIT = /\d/;
const LATIN_LOWER = /[a-z]/;

/** a 다음 b 가 같은 갈래(숫자끼리, 영문끼리)에서 한 칸 오르거나(step 1) 내리면(step -1) 참 */
function isStep(a: string, b: string, step: 1 | -1): boolean {
  const sameKind = (DIGIT.test(a) && DIGIT.test(b)) || (LATIN_LOWER.test(a) && LATIN_LOWER.test(b));
  return sameKind && b.charCodeAt(0) - a.charCodeAt(0) === step;
}

/** 가장 긴 오름, 내림 연속 길이. "a1234567" → 7, "9876abc" → 4. 대소문자는 가리지 않는다 */
export function longestSequentialRun(pw: string): number {
  const s = Array.from(pw.toLowerCase());
  if (s.length === 0) return 0;
  let best = 1;
  for (const step of [1, -1] as const) {
    let run = 1;
    for (let i = 1; i < s.length; i++) {
      run = isStep(s[i - 1], s[i], step) ? run + 1 : 1;
      if (run > best) best = run;
    }
  }
  return best;
}

/** 흔한 조합이거나, 글자 종류가 너무 적거나, 연속이 너무 길면 참 */
export function isWeakPassword(pw: string): boolean {
  const lower = pw.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return true;
  if (new Set(Array.from(lower)).size < PASSWORD_MIN_DISTINCT_CHARS) return true;
  return longestSequentialRun(lower) > PASSWORD_MAX_SEQUENTIAL_RUN;
}
