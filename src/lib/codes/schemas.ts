// 공통코드 저장 규칙(2026-10-30). 공통코드관리 화면과 저장 액션이 같은 스키마 하나를 쓴다(AGENTS §2).
// 저장 단위는 그룹 하나 — 그룹 칸과 그 그룹의 코드 줄을 한 번에 보낸다(백오피스 공통코드관리가 그룹 단위로 저장한다).
// 지우는 길은 없다. 안 쓰는 코드는 active=false 로 끈다(schema-system 머리 주석).
import { z } from "zod";

/** 그룹코드 모양. 코드가 상수로 부르므로 영문 대문자로 시작하고 대문자, 숫자, 밑줄만 쓴다(NOTIFY_CHANNEL) */
export const GROUP_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
/** 코드값 모양. 다른 표가 그대로 들고 있는 값이라 띄어쓰기를 막는다. 소문자, 점, 하이픈은 허용한다(task.created 와 같은 결) */
export const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
/** 길이 한계. 코드는 짧은 식별자, 이름은 그리드 한 칸, 덧값은 chat id 나 URL 하나가 들어갈 만큼 */
export const CODE_MAX = 40;
export const CODE_NAME_MAX = 60;
export const CODE_ATTR_MAX = 200;
export const CODE_MEMO_MAX = 300;
export const CODE_SORT_MAX = 9999;
/** 한 그룹의 코드 줄 수 한계. 공통코드는 고르기 칸의 목록이라 이보다 길면 고르기 칸이 아니라 표가 필요하다 */
export const CODES_PER_GROUP_MAX = 200;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable();

export const commonCodeSchema = z.object({
  code: z.string().trim().min(1).max(CODE_MAX).regex(CODE_PATTERN),
  name: z.string().trim().min(1).max(CODE_NAME_MAX),
  attr1: optionalText(CODE_ATTR_MAX),
  attr2: optionalText(CODE_ATTR_MAX),
  sortOrder: z.number().int().min(0).max(CODE_SORT_MAX),
  active: z.boolean(),
  memo: optionalText(CODE_MEMO_MAX),
});
export type CommonCodeInput = z.infer<typeof commonCodeSchema>;

export const commonCodeGroupSchema = z
  .object({
    groupCode: z.string().trim().min(1).max(CODE_MAX).regex(GROUP_CODE_PATTERN),
    name: z.string().trim().min(1).max(CODE_NAME_MAX),
    description: optionalText(CODE_MEMO_MAX),
    attr1Label: optionalText(CODE_NAME_MAX),
    attr2Label: optionalText(CODE_NAME_MAX),
    sortOrder: z.number().int().min(0).max(CODE_SORT_MAX),
    active: z.boolean(),
    codes: z.array(commonCodeSchema).max(CODES_PER_GROUP_MAX),
  })
  .superRefine((g, ctx) => {
    // 같은 그룹 안에서 코드값이 겹치면 어느 줄이 이길지 모른다 — 뒤에 나온 줄에 오류를 단다
    const seen = new Set<string>();
    g.codes.forEach((c, i) => {
      if (seen.has(c.code)) ctx.addIssue({ code: "custom", path: ["codes", i, "code"], message: "duplicate" });
      seen.add(c.code);
    });
  });
export type CommonCodeGroupInput = z.infer<typeof commonCodeGroupSchema>;
