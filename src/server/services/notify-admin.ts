// 알림템플릿관리, 알림발송관리 읽기, 쓰기(2026-10-30). 발송 자체는 server/notify/dispatch 가 한다 — 여기는 화면이 쓰는 목록과 저장이다.
import "server-only";
import { and, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { notifySends, notifyTemplates, users, type NotifySendStatus, type NotifyTrigger } from "@/server/db/schema";
import { createdBy, updatedBy } from "@/server/db/audit";
import type { NotifyTemplateInput } from "@/lib/notify/schemas";

export interface NotifyTemplateDto {
  code: string;
  name: string;
  category: string;
  channel: string;
  body: string;
  system: boolean;
  active: boolean;
  memo: string | null;
  updatedAt: string;
}

export async function listNotifyTemplates(): Promise<NotifyTemplateDto[]> {
  const rows = await getDb().select().from(notifyTemplates).orderBy(desc(notifyTemplates.system), notifyTemplates.code);
  return rows.map((t) => ({ code: t.code, name: t.name, category: t.category, channel: t.channel, body: t.body, system: t.system, active: t.active, memo: t.memo, updatedAt: t.updatedAt.toISOString() }));
}

export type SaveTemplateResult = { ok: true } | { ok: false; reason: "code_exists" | "not_found" };

/** 템플릿 하나 저장. 시스템 여부(system)는 화면에서 못 바꾼다 — 코드가 부르는 템플릿인지는 시드와 코드가 정한다 */
export async function saveNotifyTemplate(adminUserId: string, input: NotifyTemplateInput, isNew: boolean): Promise<SaveTemplateResult> {
  const db = getDb();
  const [existing] = await db.select({ code: notifyTemplates.code }).from(notifyTemplates).where(eq(notifyTemplates.code, input.code)).limit(1);
  if (isNew && existing) return { ok: false, reason: "code_exists" };
  if (!isNew && !existing) return { ok: false, reason: "not_found" };
  const row = { name: input.name, category: input.category, channel: input.channel, body: input.body, active: input.active, memo: input.memo };
  if (isNew) await db.insert(notifyTemplates).values({ code: input.code, ...row, system: false, ...createdBy("admin", adminUserId) });
  else await db.update(notifyTemplates).set({ ...row, ...updatedBy("admin", adminUserId) }).where(eq(notifyTemplates.code, input.code));
  return { ok: true };
}

export interface NotifySendDto {
  id: string;
  templateCode: string | null;
  channel: string;
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
}

/** 발송 이력 한 판의 상한. 기간을 좁히면 다 보인다 — 화면 머리에 "최근 N건" 으로 말한다 */
export const NOTIFY_SENDS_LIMIT = 500;

export async function listNotifySends(f: NotifySendFilter): Promise<NotifySendDto[]> {
  const where: SQL[] = [gte(notifySends.createdAt, f.from), lt(notifySends.createdAt, f.to)];
  if (f.status) where.push(eq(notifySends.status, f.status));
  if (f.templateCode) where.push(eq(notifySends.templateCode, f.templateCode));
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
    channel: s.channel,
    chatId: s.chatId,
    trigger: s.trigger,
    text: s.text,
    status: s.status,
    error: s.error,
    createdAt: s.createdAt.toISOString(),
    actorName: displayName ?? email ?? null,
  }));
}
