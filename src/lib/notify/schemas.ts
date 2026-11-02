// 알림 템플릿 저장, 직접 발송 규칙(2026-10-30). 화면과 액션이 같은 스키마를 쓴다(AGENTS §2).
import { z } from "zod";
import { CODE_MAX, CODE_NAME_MAX, CODE_MEMO_MAX, CODE_PATTERN } from "@/lib/codes/schemas";
import type { NotifyMedium } from "@/server/db/schema";
import { EMAIL_BODY_MAX, EMAIL_SUBJECT_MAX } from "./email";
import { checkTags } from "./template";
import { hasMarkup, WEB_BODY_MAX } from "./web";

/** 텔레그램 sendMessage 의 text 상한(https://core.telegram.org/bots/api#sendmessage). 변수를 채운 뒤 글자 수다 */
export const TELEGRAM_TEXT_MAX = 4096;
/** 변수 하나 값의 상한. 기록 본문 같은 긴 값은 부르는 쪽이 미리 자른다 */
export const NOTIFY_VAR_MAX = 1000;

/** 태그 짝 검사만. 길이 상한은 수단마다 달라 객체 검사(bodyLimit)가 본다 */
const body = z
  .string()
  .min(1)
  .refine((b) => b.trim().length > 0)
  .superRefine((b, ctx) => {
    const bad = checkTags(b);
    if (bad) ctx.addIssue({ code: "custom", message: `tags:${bad.kind}:${bad.tag}` });
  });

const medium = z.enum(["telegram", "email", "web"] as const satisfies readonly NotifyMedium[]);
const subject = z
  .string()
  .trim()
  .max(EMAIL_SUBJECT_MAX)
  .transform((v) => v || null)
  .nullable();
const channel = z
  .string()
  .trim()
  .transform((v) => v || null)
  .nullable();

/** 객체 검사가 남기는 문구 열쇠. 한국어 문구는 화면(components/admin/notify/body-field 의 notifyErrors)이 바꾼다 — 스키마를 서버도 읽는다 */

/** 수단별 본문 상한(템플릿 글자 기준. 변수를 채운 길이는 발송 때 다시 본다) */
export function bodyLimit(m: NotifyMedium): number {
  return m === "email" ? EMAIL_BODY_MAX : m === "web" ? WEB_BODY_MAX : TELEGRAM_TEXT_MAX;
}

type MediumShape = { medium: NotifyMedium; channel: string | null; subject: string | null; body: string };
/**
 * 수단마다 필수 칸이 다르다: 텔레그램은 받는 곳, 이메일은 제목. 객체 검사는 zod 4 기본값으로 다른 칸 오류가 있으면 돌지 않아
 * (lib/auth/schemas 의 cleanAt 과 같은 이유) when 으로 늘 돌린다 — 칸 오류를 한꺼번에 보여야 저장 전에 다 고친다
 */
function mediumRules(v: MediumShape, ctx: z.RefinementCtx) {
  if (v.medium === "telegram" && !v.channel) ctx.addIssue({ code: "custom", path: ["channel"], message: "required" });
  if (v.medium === "email" && !v.subject) ctx.addIssue({ code: "custom", path: ["subject"], message: "required" });
  // 웹 알림은 알림함 한 줄이라 화면이 글자로 그린다 — 태그가 그대로 보인다
  if (v.medium === "web" && typeof v.body === "string" && hasMarkup(v.body)) ctx.addIssue({ code: "custom", path: ["body"], message: "web_markup" });
  if (typeof v.body === "string" && v.body.length > bodyLimit(v.medium)) ctx.addIssue({ code: "custom", path: ["body"], message: `too_big:${bodyLimit(v.medium)}` });
}
const always = { when: () => true };

export const notifyTemplateSchema = z
  .object({
    code: z.string().trim().min(1).max(CODE_MAX).regex(CODE_PATTERN),
    name: z.string().trim().min(1).max(CODE_NAME_MAX),
    category: z.string().trim().min(1),
    medium,
    channel,
    subject,
    body,
    active: z.boolean(),
    memo: z
      .string()
      .trim()
      .max(CODE_MEMO_MAX)
      .transform((v) => v || null)
      .nullable(),
  })
  .superRefine(mediumRules, always);
export type NotifyTemplateInput = z.input<typeof notifyTemplateSchema>;

/** 직접 발송. 본문은 템플릿에서 가져와 고친 글이고, 서버가 같은 renderNotice 로 채운다. 이메일은 받는 주소 하나에 보낸다 */
export const manualSendSchema = z
  .object({
    templateCode: z.string().trim().min(1).nullable(),
    medium,
    channel,
    recipient: z
      .string()
      .trim()
      .transform((v) => v || null)
      .nullable(),
    subject,
    body,
    vars: z.record(z.string(), z.string().max(NOTIFY_VAR_MAX)),
  })
  .superRefine((v, ctx) => {
    mediumRules(v, ctx);
    // 이메일, 웹 알림은 회원 한 사람에게 간다(웹 알림은 그 주소의 회원 알림함)
    if (v.medium !== "telegram" && !z.email().safeParse(v.recipient ?? "").success) ctx.addIssue({ code: "custom", path: ["recipient"], message: "email" });
  }, always);
export type ManualSendInput = z.input<typeof manualSendSchema>;
