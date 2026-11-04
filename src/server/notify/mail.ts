// 이메일 알림 발송(2026-11-02, 사용자 "이미 있는 것에 구분값을 두고 이메일을 추가"). 텔레그램 쪽(server/notify/dispatch)과 같은 일을 한다:
// 템플릿을 읽어 변수를 채우고 → Resend 로 보내고 → 결과를 발송 이력(notify_sends, medium=email)에 한 줄 남긴다.
//
// 파일을 가른 이유: 가격 알림 메일은 수집 실행(sync/dispatch-alerts, Actions 의 tsx)이 보낸다. dispatch.ts 는 "server-only" 를 걸어
// react-server 조건 밖에서 import 만 해도 던진다(server/mail/send 머리 주석과 같은 사정). 그래서 여기는 그 패키지도, dispatch.ts 도 부르지 않는다.
//
// 가릴 값(redact): 비밀번호 재설정 링크는 그 자체가 비밀번호를 바꿀 열쇠다. 이력에 남기면 관리자 화면을 보는 누구나 쓸 수 있다 — 가린 글을 남긴다.
// 실패해도 던지지 않는다 — 결과를 돌려주고 이력에 사유를 남긴다(dispatch.ts 와 같다).
import { eq } from "drizzle-orm";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages/notify";
import { errorMessage } from "@/lib/errors";
import { escapeHtml } from "@/lib/html-entities";
import { renderEmail, renderEmailSubject, type EmailBlocks } from "@/lib/notify/email";
import { createdBy, type AuditSource } from "@/server/db/audit";
import { getDb } from "@/server/db/client";
import { notifySends, notifyTemplates, type NotifySendStatus, type NotifyTrigger } from "@/server/db/schema";
import { mailConfigured, sendMail, type MailMessage } from "@/server/mail/send";

/** 실패 사유를 이력에 남기는 길이(dispatch.ts 와 같다). Resend 거절 본문은 앞부분에 사유가 있다 */
const ERROR_KEEP = 300;

export type MailResult = { status: NotifySendStatus; error: string | null; id: string | null };

type Vars = Readonly<Record<string, string>>;

/** 가릴 변수의 값을 글에서 지운다. 본문에는 이스케이프된 꼴로 들어가 있어 두 꼴을 다 찾는다 */
function scrub(text: string, vars: Vars, redact: readonly string[]): string {
  let out = text;
  for (const name of redact) {
    const v = vars[name];
    if (!v) continue;
    out = out.split(escapeHtml(v)).join(M.redacted).split(v).join(M.redacted);
  }
  return out;
}

interface SendInput {
  message: MailMessage;
  /** 이력에 남길 본문(가린 것) */
  logBody: string;
  logSubject: string;
  templateCode: string | null;
  trigger: NotifyTrigger;
  actorId?: string;
  source: AuditSource;
  /** 보내기 전에 정해진 건너뜀 사유(템플릿 미사용 등) */
  skip?: string;
}

async function sendAndLog(input: SendInput): Promise<MailResult> {
  let status: NotifySendStatus = "skipped";
  let error: string | null = input.skip ?? null;
  if (!input.skip) {
    if (!mailConfigured()) error = M.skipNoMailKey;
    else {
      try {
        await sendMail(input.message);
        status = "sent";
      } catch (e) {
        status = "failed";
        error = errorMessage(e).slice(0, ERROR_KEEP);
      }
    }
  }
  try {
    const [row] = await getDb()
      .insert(notifySends)
      .values({
        templateCode: input.templateCode,
        medium: "email",
        recipient: input.message.to,
        subject: input.logSubject,
        trigger: input.trigger,
        text: input.logBody,
        status,
        error,
        sentAt: status === "sent" ? new Date() : null,
        ...createdBy(input.source, input.actorId),
      })
      .returning({ id: notifySends.id });
    return { status, error, id: row?.id ?? null };
  } catch (e) {
    console.error(`[notify] 메일 이력 기록 실패: ${errorMessage(e)}`);
    return { status, error, id: null };
  }
}

/** 제목, 본문 템플릿(변수 자리 그대로)을 채워 한 통 보낸다. 직접 발송과 사건 메일이 같이 쓴다 */
export async function dispatchMailNotice(input: {
  to: string;
  subject: string;
  body: string;
  vars: Vars;
  templateCode: string | null;
  trigger: NotifyTrigger;
  actorId?: string;
  source: AuditSource;
  redact?: readonly string[];
  skip?: string;
  /** 코드가 그린 덩어리(lib/notify/email 의 EmailBlock). 사건 메일만 쓴다 — 직접 발송은 운영자가 친 글뿐이다 */
  blocks?: EmailBlocks;
}): Promise<MailResult> {
  const redact = input.redact ?? [];
  const subject = renderEmailSubject(input.subject, input.vars);
  const mail = renderEmail(input.body, input.vars, input.blocks);
  return sendAndLog({
    message: { to: input.to, subject, html: mail.html, text: mail.text },
    logBody: scrub(mail.body, input.vars, redact),
    logSubject: scrub(subject, input.vars, redact),
    templateCode: input.templateCode,
    trigger: input.trigger,
    actorId: input.actorId,
    source: input.source,
    skip: input.skip,
  });
}

/**
 * 사건 메일 한 통(비밀번호 재설정, 가격 알림). 알림템플릿관리의 템플릿을 읽어 보낸다.
 * 템플릿이 없거나 수단이 이메일이 아니면 코드의 기본 메일(fallback)을 보낸다 — 메일이 조용히 사라지는 것보다 낫다.
 * 미사용이면: required(비밀번호 재설정처럼 안 가면 회원이 막히는 메일)는 기본 메일로 보내고, 아니면 건너뛰고 사유를 남긴다.
 */
export async function dispatchSystemMail(
  templateCode: string,
  to: string,
  vars: Vars,
  opts: { fallback: () => MailMessage; redact?: readonly string[]; required?: boolean; actorId?: string; source: AuditSource; blocks?: EmailBlocks },
): Promise<MailResult> {
  const redact = opts.redact ?? [];
  const base = { templateCode, trigger: "system" as const, actorId: opts.actorId, source: opts.source };
  const [tpl] = await getDb()
    .select({ body: notifyTemplates.body, subject: notifyTemplates.subject, medium: notifyTemplates.medium, active: notifyTemplates.active, name: notifyTemplates.name })
    .from(notifyTemplates)
    .where(eq(notifyTemplates.code, templateCode))
    .limit(1)
    .catch((e) => {
      // 템플릿 표를 못 읽어도 메일은 간다(기본 메일)
      console.error(`[notify] 메일 템플릿 읽기 실패: ${errorMessage(e)}`);
      return [];
    });
  const usable = tpl && tpl.medium === "email" && tpl.subject;
  if (!usable || (!tpl.active && opts.required)) {
    const message = { ...opts.fallback(), to };
    return sendAndLog({ ...base, message, logBody: scrub(message.html, vars, redact), logSubject: scrub(message.subject, vars, redact) });
  }
  return dispatchMailNotice({ ...base, to, subject: tpl.subject ?? "", body: tpl.body, vars, redact, blocks: opts.blocks, skip: tpl.active ? undefined : M.skipTemplateOff(tpl.name) });
}
