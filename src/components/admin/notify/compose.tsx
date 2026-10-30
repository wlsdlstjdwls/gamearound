"use client";
// 직접 발송 폼(2026-10-30) — 알림발송관리 오른쪽 자리. 템플릿을 고르면 본문을 가져오고, 본문의 {변수} 마다 값 칸이 선다.
// 본문은 그 자리에서 고칠 수 있다(템플릿은 그대로). 미리 보기는 칸 값으로 채운 글이고, 서버도 같은 함수로 채워 보낸다.
// 보내기 전에 한 번 묻는다 — 보낸 알림은 되돌릴 수 없다. 시스템 템플릿(업무요청 등)은 고르기 목록에 없다 — 사건이 넣는 값을 손으로 흉내 내게 된다.
import { useState, useTransition } from "react";
import { BodyField } from "@/components/admin/notify/body-field";
import { TelegramPreview } from "@/components/admin/notify/preview";
import { Field, FormSection, WithAside } from "@/components/admin/screen/layout";
import { useAdminStatus } from "@/components/admin/screen/status";
import { Button } from "@/components/ui/button";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { FormSelect } from "@/components/ui/select/fields";
import { TextField } from "@/components/ui/text-field";
import { sendNoticeAction } from "@/app/(admin)/admin/notify-sends/actions";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages";
import { DEFAULT_NOTIFY_CHANNEL } from "@/lib/codes/groups";
import { TELEGRAM_TEXT_MAX } from "@/lib/notify/schemas";
import { renderNotice, templateVars } from "@/lib/notify/template";
import type { NotifyTemplateDto } from "@/server/services/notify-admin";

type Option = { value: string; label: string };
const FREE = "";

export type ComposeSeed = { templateCode: string | null; body: string; channel: string | null };

export function ComposeForm({ templates, channels, seed, onSent }: { templates: NotifyTemplateDto[]; channels: Option[]; seed: ComposeSeed; onSent: () => void }) {
  const { say } = useAdminStatus();
  const picks = templates.filter((t) => t.active && !t.system);
  const first = picks.find((t) => t.code === seed.templateCode) ?? null;
  const fallbackChannel = channels.find((c) => c.value === DEFAULT_NOTIFY_CHANNEL)?.value ?? channels[0]?.value ?? "";
  const [templateCode, setTemplateCode] = useState(first?.code ?? FREE);
  const [channel, setChannel] = useState(seed.channel ?? first?.channel ?? fallbackChannel);
  const [body, setBody] = useState(first?.body ?? seed.body);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const names = templateVars(body);
  const html = renderNotice(body, vars);
  const missing = names.filter((n) => !vars[n]?.trim());
  const blocked = !body.trim() || !channel || missing.length > 0 || html.length > TELEGRAM_TEXT_MAX;

  const pickTemplate = (code: string) => {
    setTemplateCode(code);
    const t = picks.find((x) => x.code === code);
    if (t) {
      setBody(t.body);
      setChannel(t.channel);
    }
  };

  const send = async () => {
    if (missing.length > 0) return say(M.missingVars(missing), "error");
    const channelName = channels.find((c) => c.value === channel)?.label ?? channel;
    if (!(await askConfirm(M.sendConfirm(channelName), { title: M.sendConfirmTitle, confirmLabel: M.send }))) return;
    start(async () => {
      const r = await sendNoticeAction({ templateCode: templateCode || null, channel, body, vars }).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) return say(r.error, "error");
      if (r.status === "sent") say(M.sentOk, "ok");
      else if (r.status === "failed") say(M.sentFailed(r.error ?? ""), "error");
      else say(M.sentSkipped(r.error ?? ""), "error");
      onSent();
    });
  };

  return (
    <WithAside aside={<TelegramPreview html={html} />}>
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
        <Field label={M.fieldChannel} required>
          <FormSelect name="ns-ch" label={M.fieldChannel} hideLabel size="lg" value={channel} onChange={setChannel} options={channels} />
        </Field>
        {names.map((n) => (
          <Field key={n} label={n} htmlFor={`ns-v-${n}`} required wide={names.length === 1}>
            <TextField id={`ns-v-${n}`} label={n} hideLabel value={vars[n] ?? ""} onChange={(e) => setVars((v) => ({ ...v, [n]: e.target.value }))} compact />
          </Field>
        ))}
        <Field label={M.fieldBody} htmlFor="ns-body" required wide>
          <BodyField id="ns-body" value={body} onChange={setBody} renderedLength={html.length} vars={names.length > 0 ? names.map((name) => ({ name })) : null} />
        </Field>
      </FormSection>
    </WithAside>
  );
}
