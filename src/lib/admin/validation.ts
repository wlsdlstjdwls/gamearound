// 관리자 저장 화면의 칸별 오류 — zod 검사 결과를 "어느 칸이 왜 틀렸나" 로 바꾼다(2026-10-31, 사용자 "저장 있는 화면은 유효성 체크도,
// 비율인데 100% 를 넘어간다거나").
//
// 스키마는 서버 액션과 같은 것 하나를 쓴다(AGENTS §2). 스키마 안에 한국어 문구를 박지 않은 이유: 같은 스키마를 결제, 주문 같은
// 서버 경로도 읽어 화면 문구가 섞이면 안 된다. 문구는 여기서 이슈의 종류(code)와 한계값으로 만든다 — 칸마다 "1~90 사이" 를 따로 적지 않아도
// 스키마의 min, max 가 그대로 문구가 된다. 규칙이 범위로 안 읽히는 칸(종료일이 시작일보다 앞)만 부르는 쪽이 경로별 문구를 준다.
//
// 경로는 "products.2.amount" 처럼 점으로 잇는다. 화면은 칸을 그릴 때 자기 경로로 찾는다(fieldError).
// "use client" 를 붙이지 않는다 — 서버 액션도 첫 오류 문구를 돌려줄 때 쓴다.
import type { z } from "zod";

export type FieldErrors = Record<string, string>;

export const VALIDATION_MESSAGES = {
  required: "값을 입력해 주세요",
  /** unit: 칸 단위(%, 원, 일). 숫자만 말하면 "90 이하" 가 무엇의 90 인지 칸을 다시 봐야 했다 */
  min: (n: number | bigint, unit = "") => `${n.toLocaleString("ko-KR")}${unit} 이상이어야 해요`,
  max: (n: number | bigint, unit = "") => `${n.toLocaleString("ko-KR")}${unit} 이하여야 해요`,
  minLength: (n: number | bigint) => `${n}자 이상 입력해 주세요`,
  maxLength: (n: number | bigint) => `${n}자까지 입력할 수 있어요`,
  maxItems: (n: number | bigint) => `${n}개까지 둘 수 있어요`,
  integer: "정수로 입력해 주세요",
  format: "형식이 맞지 않아요",
  invalid: "값을 확인해 주세요",
} as const;

const V = VALIDATION_MESSAGES;

/** 이슈 하나의 문구. 길이와 크기를 가른다 — 같은 too_small 이라도 글이면 "N자", 숫자면 "N 이상" 이다 */
export function issueMessage(issue: z.core.$ZodIssue): string {
  switch (issue.code) {
    case "too_small":
      if (issue.origin === "string") return Number(issue.minimum) <= 1 ? V.required : V.minLength(issue.minimum);
      if (issue.origin === "array") return V.required;
      return V.min(issue.minimum);
    case "too_big":
      if (issue.origin === "string") return V.maxLength(issue.maximum);
      if (issue.origin === "array") return V.maxItems(issue.maximum);
      return V.max(issue.maximum);
    case "invalid_type":
      // 숫자 칸에 정수가 아닌 값, 빈 고르기 칸
      return issue.expected === "int" ? V.integer : V.required;
    case "invalid_format":
      return V.format;
    default:
      return issue.message && !issue.message.startsWith("Invalid") ? issue.message : V.invalid;
  }
}

/**
 * 검사 결과를 칸별 문구로. 한 칸에 이슈가 여럿이면 첫 것만 쓴다(칸 아래 한 줄).
 * custom: 경로별로 문구를 덮어쓸 때(refine 처럼 범위로 안 읽히는 규칙). 경로 끝이 맞으면 쓴다 — "promotions.3.endsOn" 은 "endsOn" 으로 찾는다
 */
export function fieldErrors(result: { success: true } | { success: false; error: z.ZodError }, custom: Record<string, string> = {}): FieldErrors {
  if (result.success) return {};
  const out: FieldErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.map(String).join(".");
    if (path in out) continue;
    const last = issue.path.at(-1);
    const own = custom[path] ?? (last !== undefined ? custom[String(last)] : undefined);
    out[path] = own ?? issueMessage(issue);
  }
  return out;
}

/** 칸 하나의 오류(없으면 undefined). 화면 칸이 error 로 그대로 받는다 */
export function fieldError(errors: FieldErrors, path: string): string | undefined {
  return errors[path];
}

/** 경로 앞머리 아래에 오류가 하나라도 있나 — 목록 줄(상품 하나, 프로모션 하나)에 오류 표시를 달 때 */
export function hasErrorUnder(errors: FieldErrors, prefix: string): boolean {
  return Object.keys(errors).some((k) => k === prefix || k.startsWith(`${prefix}.`));
}

/** 첫 오류 — 저장을 막을 때 상태줄에 한 줄로 */
export function firstError(errors: FieldErrors): { path: string; message: string } | null {
  const path = Object.keys(errors)[0];
  return path === undefined ? null : { path, message: errors[path] };
}
