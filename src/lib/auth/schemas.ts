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

/*
 * 완성되지 않은 한글 낱자(2026-09-23). \p{L} 이 ㄱ, ㅏ 같은 호환 자모도 "글자" 로 쳐서 "ㅇㅏㄴㅕㅇ" 이 닉네임으로 들어왔다.
 * 호환 자모(ㄱ~ㆎ), 첫가끝 조각(U+1100 대와 확장 A, B), 반각 자모까지 본다. fitin-app 은 /[ㄱ-ㅣ]/ 만 보는데
 * 그러면 옛 자모와 반각이 샌다.
 *
 * NFC 로 모은 **뒤에** 검사한다 — 맥에서 들어오는 NFD 는 "가" 를 첫가끝 조각 둘로 보내는데, 그건 온전한 글자다.
 * 모아도 남는 조각만 낱자다. "ㅋㅋㅋ" 도 여기 걸린다(쓰고 싶은 사람이 있겠지만 그 한 가지만 열어 둘 기준이 없다).
 */
const STANDALONE_JAMO_RE = /[\u1100-\u11FF\u3131-\u318E\uA960-\uA97F\uD7B0-\uD7FF\uFFA0-\uFFDC]/u;
const toNfc = (v: string) => v.normalize("NFC");

export const displayNameSchema = z
  .string({ message: M.displayNameRequired })
  .trim()
  .min(1, M.displayNameRequired)
  .min(DISPLAY_NAME_MIN, M.displayNameLength)
  .max(DISPLAY_NAME_MAX, M.displayNameLength)
  .regex(DISPLAY_NAME_RE, M.displayNameInvalid)
  .refine((v) => !STANDALONE_JAMO_RE.test(toNfc(v)), M.displayNameJamo)
  // 검사한 모양 그대로 저장한다 — NFD 로 들어온 이름이 NFC 이름과 다른 문자열로 남지 않게
  .transform(toNfc);

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

export const forgotPasswordSchema = z.object({ email: emailSchema });

/** 재설정은 가입과 같은 비밀번호 규칙을 쓴다 — 여기서 느슨하면 쉬운 비번이 재설정으로 들어온다 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, M.resetInvalid),
    password: passwordSchema,
    passwordConfirm: z.string({ message: M.passwordConfirmMismatch }),
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

export function forgotPasswordInputFromForm(fd: FormData): unknown {
  return { email: fd.get("email") };
}

export function resetPasswordInputFromForm(fd: FormData): unknown {
  return { token: fd.get("token"), password: fd.get("password"), passwordConfirm: fd.get("passwordConfirm") };
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
