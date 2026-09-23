// 회원가입/로그인 입력 검증 — zod 단일 소스. 서버 액션과 클라이언트 폼이 같은 스키마를 쓴다.
import { z } from "zod";
import { DISPLAY_NAME_MAX, DISPLAY_NAME_MIN, EMAIL_MAX, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth/constants";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { isWeakPassword } from "@/lib/auth/weak-password";

/** 이메일 정규화: 앞뒤 공백 제거 + 소문자. DB unique와 로그인 조회가 같은 규칙을 쓴다 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export const emailSchema = z
  .string({ message: M.emailRequired })
  .trim()
  .min(1, M.emailRequired)
  .max(EMAIL_MAX, M.emailInvalid)
  .pipe(z.email({ message: M.emailInvalid }))
  .transform(normalizeEmail);

const HAS_LETTER = /[A-Za-z]/;
const HAS_DIGIT = /\d/;

export const passwordSchema = z
  .string({ message: M.passwordRequired })
  .min(1, M.passwordRequired)
  .min(PASSWORD_MIN, M.passwordTooShort)
  .max(PASSWORD_MAX, M.passwordTooLong)
  .refine((v) => HAS_LETTER.test(v) && HAS_DIGIT.test(v), M.passwordWeak)
  // 기본 규칙을 통과한 뒤에만 의미가 있다 — 순서가 곧 오류 우선순위다(fieldErrorsOf 는 칸마다 첫 오류만 쓴다)
  .refine((v) => !isWeakPassword(v), M.passwordCommon);

/** 로그인용: 길이 규칙만 (규칙이 바뀌어도 기존 사용자가 로그인은 되어야 함) */
export const passwordLooseSchema = z.string({ message: M.passwordRequired }).min(1, M.passwordRequired).max(PASSWORD_MAX, M.passwordTooLong);

// 한글, 영문, 숫자, 공백, ._- 허용
const DISPLAY_NAME_RE = /^[\p{L}\p{N} ._-]+$/u;

export const displayNameSchema = z
  .string({ message: M.displayNameRequired })
  .trim()
  .min(1, M.displayNameRequired)
  .min(DISPLAY_NAME_MIN, M.displayNameLength)
  .max(DISPLAY_NAME_MAX, M.displayNameLength)
  .regex(DISPLAY_NAME_RE, M.displayNameInvalid);

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordLooseSchema,
});

export const signUpSchema = z
  .object({
    displayName: displayNameSchema,
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string({ message: M.passwordConfirmMismatch }),
    terms: z.literal(true, { message: M.termsRequired }),
  })
  .refine((v) => v.password === v.passwordConfirm, { message: M.passwordConfirmMismatch, path: ["passwordConfirm"] });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

/** 필드별 첫 번째 에러 메시지만 뽑는다 — UI는 필드당 한 줄만 보여준다 */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** FormData → 스키마 입력 객체 (체크박스는 "on" 문자열이므로 boolean으로) */
export function signInInputFromForm(fd: FormData): unknown {
  return { email: fd.get("email"), password: fd.get("password") };
}

export function signUpInputFromForm(fd: FormData): unknown {
  return {
    displayName: fd.get("displayName"),
    email: fd.get("email"),
    password: fd.get("password"),
    passwordConfirm: fd.get("passwordConfirm"),
    terms: fd.get("terms") === "on",
  };
}
