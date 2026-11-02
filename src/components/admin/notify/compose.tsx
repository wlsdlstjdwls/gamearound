"use client";
// 직접 발송 폼(2026-10-30) — 알림발송관리 오른쪽 자리. 템플릿을 고르면 본문을 가져오고, 본문의 {변수} 마다 값 칸이 선다.
// 본문은 그 자리에서 고칠 수 있다(템플릿은 그대로). 미리 보기는 칸 값으로 채운 글이고, 서버도 같은 함수로 채워 보낸다.
// 발송 수단(2026-11-02): 이메일이면 받는 곳 대신 받는 주소 하나와 메일 제목을 받는다. 제목에 쓴 {변수} 도 값 칸이 선다.
// 보내기 전에 한 번 묻는다 — 보낸 알림은 되돌릴 수 없다. 시스템 템플릿(업무요청 등)은 고르기 목록에 없다 — 사건이 넣는 값을 손으로 흉내 내게 된다.
import { useState, useTransition } from "react";
import { BodyField } from "@/components/admin/notify/body-field";
import { NoticePreview } from "@/components/admin/notify/preview";
import { useCodes } from "@/components/code-book";
import { Field, FormSection, WithAside } from "@/components/admin/screen/layout";
import { useAdminStatus } from "@/components/admin/screen/status";
import { Button } from "@/components/ui/button";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { sendNoticeAction } from "@/app/(admin)/admin/notify-sends/actions";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages";
import { CODE_GROUPS, DEFAULT_NOTIFY_CHANNEL } from "@/lib/codes/groups";
import { renderEmailSubject } from "@/lib/notify/email";
import { asMedium, hasSubject, isPlainMedium } from "@/lib/notify/medium";
import { renderWebNotice } from "@/lib/notify/web";
import { bodyLimit, manualSendSchema } from "@/lib/notify/schemas";
import { renderNotice, templateVars } from "@/lib/notify/template";
import { notifyErrors } from "@/components/admin/notify/body-field";
import type { NotifyMedium } from "@/server/db/schema";
import type { NotifyTemplateDto } from "@/server/services/notify-admin";

type Option = { value: string; label: string };
const FREE = "";

export type ComposeSeed = { templateCode: string | null; body: string; channel: string | null; medium?: NotifyMedium; subject?: string | null; recipient?: string | null };

export function ComposeForm({ templates, channels, seed, onSent }: { templates: NotifyTemplateDto[]; channels: Option[]; seed: ComposeSeed; onSent: () => void }) {
  const { say } = useAdminStatus();
  const picks = templates.filter((t) => t.active && !t.system);
  const first = picks.find((t) => t.code === seed.templateCode) ?? null;
  const fallbackChannel = channels.find((c) => c.value === DEFAULT_NOTIFY_CHANNEL)?.value ?? channels[0]?.value ?? "";
  const codes = useCodes();
  const [templateCode, setTemplateCode] = useState(first?.code ?? FREE);
  const [medium, setMedium] = useState<NotifyMedium>(first?.medium ?? seed.medium ?? "telegram");
  const [channel, setChannel] = useState(seed.channel ?? first?.channel ?? fallbackChannel);
  const [subject, setSubject] = useState(first?.subject ?? seed.subject ?? "");
  const [recipient, setRecipient] = useState(seed.recipient ?? "");
  const [body, setBody] = useState(first?.body ?? seed.body);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const email = medium === "email";
  /** 회원 한 사람에게 가는 수단(받는 주소를 받는다) */
  const toMember = medium !== "telegram";
  const titled = hasSubject(medium);
  const names = [...new Set([...(titled ? templateVars(subject) : []), ...templateVars(body)])];
  const html = isPlainMedium(medium) ? renderWebNotice(body, vars) : renderNotice(body, vars);
  const missing = names.filter((n) => !vars[n]?.trim());
  const input = { templateCode: templateCode || null, medium, channel: toMember ? null : channel, recipient: toMember ? recipient : null, subject: titled ? subject : null, body, vars };
  const errors = notifyErrors(manualSendSchema.safeParse(input));
  const max = bodyLimit(medium);
  const blocked = Object.keys(errors).length > 0 || missing.length > 0 || html.length > max;

  const pickTemplate = (code: string) => {
    setTemplateCode(code);
    const t = picks.find((x) => x.code === code);
    if (t) {
      setBody(t.body);
      setMedium(t.medium);
      if (t.channel) setChannel(t.channel);
      setSubject(t.subject ?? "");
    }
  };

  const send = async () => {
    if (missing.length > 0) return say(M.missingVars(missing), "error");
    const channelName = channels.find((c) => c.value === channel)?.label ?? channel;
    const ask = medium === "web" ? M.sendConfirmWeb(recipient.trim()) : medium === "push" ? M.sendConfirmPush(recipient.trim()) : email ? M.sendConfirmEmail(recipient.trim()) : M.sendConfirm(channelName);
    if (!(await askConfirm(ask, { title: M.sendConfirmTitle, confirmLabel: M.send }))) return;
    start(async () => {
      const r = await sendNoticeAction(input).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) return say(r.error, "error");
      if (r.status === "sent") say(M.sentOk, "ok");
      else if (r.status === "failed") say(M.sentFailed(r.error ?? ""), "error");
      else say(M.sentSkipped(r.error ?? ""), "error");
      onSent();
    });
  };

  return (
    <WithAside aside={<NoticePreview medium={medium} subject={renderEmailSubject(subject, vars)} html={html} />}>
      <FormSection
        title={M.composeTitle}
        action={
          <Button size="sm" onClick={() => void send()} disabled={blocked} loading={pending} loadingLabel={M.sending}>
            {M.send}
          </Button>
        }
      >
        <Field label={M.fieldTemplate}>
          <FormSelect name="ns-tpl" label={M.fieldTemplate} hideLabel size="lg" value={templateCode} onChange={pickTemplate} options={[{ value: FREE, label: M.noTemplate }, ...picks.map((t) => ({ value: t.code, label: t.name }))]} />
        </Field>
        <Field label={M.fieldMedium} required>
          <FormSelect name="ns-md" label={M.fieldMedium} hideLabel size="lg" value={medium} onChange={(v) => setMedium(asMedium(v))} options={codes.options(CODE_GROUPS.notifyMedium)} />
        </Field>
        {toMember ? (
          <>
            <Field label={M.fieldRecipient} htmlFor="ns-to" required wide error={recipient ? errors.recipient : undefined}>
              <TextField id="ns-to" label={M.fieldRecipient} hideLabel type="email" inputMode="email" autoComplete="off" value={recipient} onChange={(e) => setRecipient(e.target.value)} compact />
            </Field>
            {titled && (
              <Field label={email ? M.fieldSubject : M.fieldPushTitle} htmlFor="ns-subj" required wide>
                <TextField id="ns-subj" label={email ? M.fieldSubject : M.fieldPushTitle} hideLabel value={subject} onChange={(e) => setSubject(e.target.value)} compact />
              </Field>
            )}
          </>
        ) : (
          <Field label={M.fieldChannel} required>
            <FormSelect name="ns-ch" label={M.fieldChannel} hideLabel size="lg" value={channel} onChange={setChannel} options={channels} />
          </Field>
        )}
        {names.map((n) => (
          <Field key={n} label={n} htmlFor={`ns-v-${n}`} required wide={names.length === 1}>
            <TextField id={`ns-v-${n}`} label={n} hideLabel value={vars[n] ?? ""} onChange={(e) => setVars((v) => ({ ...v, [n]: e.target.value }))} compact />
          </Field>
        ))}
        <Field label={M.fieldBody} htmlFor="ns-body" required wide>
          <BodyField id="ns-body" value={body} onChange={setBody} renderedLength={html.length} max={max} plain={isPlainMedium(medium)} vars={names.length > 0 ? names.map((name) => ({ name })) : null} />
        </Field>
      </FormSection>
    </WithAside>
  );
}
