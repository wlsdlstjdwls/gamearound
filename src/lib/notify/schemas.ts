// 알림 템플릿 저장, 직접 발송 규칙(2026-10-30). 화면과 액션이 같은 스키마를 쓴다(AGENTS §2).
import { z } from "zod";
import { CODE_MAX, CODE_NAME_MAX, CODE_MEMO_MAX, CODE_PATTERN } from "@/lib/codes/schemas";
import { checkTags } from "./template";

/** 텔레그램 sendMessage 의 text 상한(https://core.telegram.org/bots/api#sendmessage). 변수를 채운 뒤 글자 수다 */
export const TELEGRAM_TEXT_MAX = 4096;
/** 변수 하나 값의 상한. 기록 본문 같은 긴 값은 부르는 쪽이 미리 자른다 */
export const NOTIFY_VAR_MAX = 1000;

const body = z
  .string()
  .min(1)
  .max(TELEGRAM_TEXT_MAX)
  .refine((b) => b.trim().length > 0)
  .superRefine((b, ctx) => {
    const bad = checkTags(b);
    if (bad) ctx.addIssue({ code: "custom", message: `tags:${bad.kind}:${bad.tag}` });
  });

export const notifyTemplateSchema = z.object({
  code: z.string().trim().min(1).max(CODE_MAX).regex(CODE_PATTERN),
  name: z.string().trim().min(1).max(CODE_NAME_MAX),
  category: z.string().trim().min(1),
  channel: z.string().trim().min(1),
  body,
  active: z.boolean(),
  memo: z
    .string()
    .trim()
    .max(CODE_MEMO_MAX)
    .transform((v) => v || null)
    .nullable(),
});
export type NotifyTemplateInput = z.infer<typeof notifyTemplateSchema>;

/** 직접 발송. 본문은 템플릿에서 가져와 고친 글이고, 서버가 같은 renderNotice 로 채운다 */
export const manualSendSchema = z.object({
  templateCode: z.string().trim().min(1).nullable(),
  channel: z.string().trim().min(1),
  body,
  vars: z.record(z.string(), z.string().max(NOTIFY_VAR_MAX)),
});
export type ManualSendInput = z.infer<typeof manualSendSchema>;
