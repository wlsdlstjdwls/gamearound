// 알림템플릿관리, 알림발송관리 읽기, 쓰기(2026-10-30). 발송 자체는 server/notify/dispatch 가 한다 — 여기는 화면이 쓰는 목록과 저장이다.
// 웹 알림(2026-11-02)은 이력이 notifications 에 있다(server/notify/web 머리 주석). 발송 이력 목록은 두 표를 같이 읽어 시각순으로 잇는다.
import "server-only";
import { and, desc, eq, gte, isNotNull, lt, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/server/db/client";
import { notifications, notifySends, notifyTemplates, users, type NotifyMedium, type NotifySendStatus, type NotifyTrigger } from "@/server/db/schema";
import { forgetWebTemplates } from "@/server/notify/web";
import { MANUAL_WEB_CODE } from "@/lib/notify/system-templates";
import { findUserByEmail } from "@/server/services/users";
import { pushToUser } from "@/server/push/to-user";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages/notify";
import { ROUTES } from "@/lib/routes";
import { createdBy, updatedBy } from "@/server/db/audit";
import type { notifyTemplateSchema } from "@/lib/notify/schemas";
import type { z } from "zod";

export interface NotifyTemplateDto {
  code: string;
  name: string;
  category: string;
  medium: NotifyMedium;
  channel: string | null;
  subject: string | null;
  body: string;
  system: boolean;
  active: boolean;
  memo: string | null;
  updatedAt: string;
}

export async function listNotifyTemplates(): Promise<NotifyTemplateDto[]> {
  const rows = await getDb().select().from(notifyTemplates).orderBy(desc(notifyTemplates.system), notifyTemplates.code);
  return rows.map((t) => ({ code: t.code, name: t.name, category: t.category, medium: t.medium, channel: t.channel, subject: t.subject, body: t.body, system: t.system, active: t.active, memo: t.memo, updatedAt: t.updatedAt.toISOString() }));
}

export type SaveTemplateResult = { ok: true } | { ok: false; reason: "code_exists" | "not_found" };

/**
 * 템플릿 하나 저장. 시스템 여부(system)는 화면에서 못 바꾼다 — 코드가 부르는 템플릿인지는 시드와 코드가 정한다.
 * 시스템 템플릿은 발송 수단도 못 바꾼다 — 사건이 받는 곳(관리자 채널, 회원 메일)을 정해 두었다. 수단에 안 맞는 칸(이메일의 받는 곳 등)은 비워 저장한다
 */
export async function saveNotifyTemplate(adminUserId: string, input: z.output<typeof notifyTemplateSchema>, isNew: boolean): Promise<SaveTemplateResult> {
  const db = getDb();
  const [existing] = await db.select({ code: notifyTemplates.code, system: notifyTemplates.system, medium: notifyTemplates.medium }).from(notifyTemplates).where(eq(notifyTemplates.code, input.code)).limit(1);
  if (isNew && existing) return { ok: false, reason: "code_exists" };
  if (!isNew && !existing) return { ok: false, reason: "not_found" };
  const medium = existing?.system ? existing.medium : input.medium;
  const row = {
    name: input.name,
    category: input.category,
    medium,
    channel: medium === "telegram" ? input.channel : null,
    subject: medium === "email" || medium === "push" ? input.subject : null,
    body: input.body,
    active: input.active,
    memo: input.memo,
  };
  if (isNew) await db.insert(notifyTemplates).values({ code: input.code, ...row, system: false, ...createdBy("admin", adminUserId) });
  else await db.update(notifyTemplates).set({ ...row, ...updatedBy("admin", adminUserId) }).where(eq(notifyTemplates.code, input.code));
  forgetWebTemplates();
  return { ok: true };
}

export interface NotifySendDto {
  id: string;
  templateCode: string | null;
  medium: NotifyMedium;
  channel: string | null;
  recipient: string | null;
  subject: string | null;
  chatId: string | null;
  trigger: NotifyTrigger;
  text: string;
  status: NotifySendStatus;
  error: string | null;
  createdAt: string;
  actorName: string | null;
}

export interface NotifySendFilter {
  /** 한국 날짜 하루의 시작 시각(포함), 끝 시각(제외) */
  from: Date;
  to: Date;
  status: NotifySendStatus | null;
  templateCode: string | null;
  medium: NotifyMedium | null;
}

/** 발송 이력 한 판의 상한. 기간을 좁히면 다 보인다 — 화면 머리에 "최근 N건" 으로 말한다 */
export const NOTIFY_SENDS_LIMIT = 500;

export async function listNotifySends(f: NotifySendFilter): Promise<NotifySendDto[]> {
  const [sends, web] = await Promise.all([f.medium === "web" ? [] : listSendRows(f), f.medium && f.medium !== "web" ? [] : listWebRows(f)]);
  return [...sends, ...web].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, NOTIFY_SENDS_LIMIT);
}

/**
 * 웹 알림 이력(notifications). 알림함에 들어간 줄은 다 "성공" 이다 — 넣지 못한 줄은 표에 없다.
 * 템플릿을 지난 줄만 읽는다(template_code 있는 줄). 이 칸이 생기기 전(11-02)에 쌓인 알림은 이력이 아니라 회원 알림함의 일이다
 */
async function listWebRows(f: NotifySendFilter): Promise<NotifySendDto[]> {
  if (f.status && f.status !== "sent") return [];
  const recipient = alias(users, "recipient");
  const where: SQL[] = [gte(notifications.createdAt, f.from), lt(notifications.createdAt, f.to), isNotNull(notifications.templateCode)];
  if (f.templateCode) where.push(eq(notifications.templateCode, f.templateCode));
  const rows = await getDb()
    .select({ n: notifications, to: recipient.email, actorName: users.displayName, actorEmail: users.email })
    .from(notifications)
    .innerJoin(recipient, eq(recipient.id, notifications.userId))
    .leftJoin(users, eq(users.id, notifications.createdBy))
    .where(and(...where))
    .orderBy(desc(notifications.createdAt))
    .limit(NOTIFY_SENDS_LIMIT);
  return rows.map(({ n, to, actorName, actorEmail }) => ({
    id: `web:${n.id}`,
    templateCode: n.templateCode,
    medium: "web",
    channel: null,
    recipient: to,
    subject: null,
    chatId: null,
    trigger: n.createdSource === "admin" ? "manual" : "system",
    text: n.body,
    status: "sent",
    error: null,
    createdAt: n.createdAt.toISOString(),
    actorName: n.createdSource === "admin" ? (actorName ?? actorEmail ?? null) : null,
  }));
}

/** 관리자가 직접 보내는 웹 알림 한 줄. 받는 사람은 이메일로 찾는다. 없으면 null */
export async function sendManualWebNotice(adminUserId: string, input: { email: string; body: string; templateCode: string | null }): Promise<{ id: string } | null> {
  const db = getDb();
  const u = await findUserByEmail(input.email);
  if (!u) return null;
  const [row] = await db
    .insert(notifications)
    .values({ userId: u.id, kind: "notice", body: input.body, link: null, templateCode: input.templateCode ?? MANUAL_WEB_CODE, ...createdBy("admin", adminUserId) })
    .returning({ id: notifications.id });
  return { id: row.id };
}

/**
 * 관리자가 직접 보내는 웹푸시 한 통(2026-11-02). 받는 회원이 푸시를 켠 기기 전부에 간다. 직접 보낸 것만 발송 이력에 남긴다
 * (사건 푸시는 수집 회차마다 수백 통이라 남기지 않는다, schema-system 의 medium 주석). 누르면 알림함으로 간다
 */
export async function sendManualPush(
  adminUserId: string,
  input: { email: string; title: string; body: string; templateCode: string | null },
): Promise<{ status: NotifySendStatus; error: string | null } | null> {
  const u = await findUserByEmail(input.email);
  if (!u) return null;
  const r = await pushToUser(u.id, { title: input.title, body: input.body, url: ROUTES.notifications, tag: `manual:${Date.now()}` }, "notify-push");
  const status: NotifySendStatus = !r.attempted ? "skipped" : r.sent > 0 ? "sent" : "failed";
  const error = status === "skipped" ? M.skipNoPushDevice : status === "failed" ? M.pushFailed(r.failed) : null;
  await getDb()
    .insert(notifySends)
    .values({ templateCode: input.templateCode, medium: "push", recipient: u.email, subject: input.title, trigger: "manual", text: input.body, status, error, sentAt: status === "sent" ? new Date() : null, ...createdBy("admin", adminUserId) });
  return { status, error };
}

async function listSendRows(f: NotifySendFilter): Promise<NotifySendDto[]> {
  const where: SQL[] = [gte(notifySends.createdAt, f.from), lt(notifySends.createdAt, f.to)];
  if (f.status) where.push(eq(notifySends.status, f.status));
  if (f.templateCode) where.push(eq(notifySends.templateCode, f.templateCode));
  if (f.medium) where.push(eq(notifySends.medium, f.medium));
  const rows = await getDb()
    .select({ s: notifySends, displayName: users.displayName, email: users.email })
    .from(notifySends)
    .leftJoin(users, eq(users.id, notifySends.createdBy))
    .where(and(...where))
    .orderBy(desc(notifySends.createdAt))
    .limit(NOTIFY_SENDS_LIMIT);
  return rows.map(({ s, displayName, email }) => ({
    id: s.id,
    templateCode: s.templateCode,
    medium: s.medium,
    channel: s.channel,
    recipient: s.recipient,
    subject: s.subject,
    chatId: s.chatId,
    trigger: s.trigger,
    text: s.text,
    status: s.status,
    error: s.error,
    createdAt: s.createdAt.toISOString(),
    actorName: displayName ?? email ?? null,
  }));
}
