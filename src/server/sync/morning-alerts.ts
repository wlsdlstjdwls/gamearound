// 밤사이 알림 아침 모아 보내기(2026-11-03). 한국 22~08시에 생긴 가격, 찜 할인 알림은 알림함에만 적히고 웹푸시, 메일이 미뤄진다
// (lib/notify/quiet-hours, notifications.held_channel). 아침 8시 크론(api/cron/morning)이 여기를 불러 사람마다 받을 길별로 한 통씩 보낸다.
//
// 한 통으로 묶는 이유: 밤사이 세일이 시작되면 한 사람에게 여러 게임 알림이 쌓인다. 아침 8시에 그 수만큼 휴대폰이 울리면 밤에 미룬 뜻이 없다.
// 보낸 뒤에는 성공, 실패와 상관없이 held_channel 을 비운다 — 실패한 줄을 남기면 다음 날 아침 하루 묵은 알림이 또 간다. 실패는 로그와 발송 이력에 남는다.
import { inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { notifications, users } from "@/server/db/schema";
import { pushNotice } from "@/server/notify/web";
import { dispatchSystemMail } from "@/server/notify/mail";
import { pushToUser } from "@/server/push/to-user";
import { isMemberSendHour } from "@/lib/notify/quiet-hours";
import { NOTIFICATION_MESSAGES as M } from "@/lib/notifications/messages";
import { SYSTEM_TEMPLATES } from "@/lib/notify/system-templates";
import { escapeHtml } from "@/lib/html-entities";
import { errorMessage } from "@/lib/errors";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";

const SOURCE = "cron:morning-alerts" as const;
/** 메일 목록에 적는 줄 수 상한. 넘치면 "외 N건" 으로 줄이고 나머지는 알림함에서 읽는다 — 큰 세일 밤에 메일 한 통이 수십 줄이 되지 않게 */
export const MORNING_MAIL_MAX_LINES = 20;

export type MorningAlertsSummary = { held: number; pushed: number; mailed: number; failed: number; skippedHour: boolean };

type Held = { id: string; userId: string; body: string; channel: string };

/** 메일의 {목록}. 상한을 넘으면 마지막 줄에 남은 수를 적는다 */
export function morningListText(bodies: readonly string[]): string {
  const lines = bodies.slice(0, MORNING_MAIL_MAX_LINES).map((b) => `- ${b}`);
  const rest = bodies.length - MORNING_MAIL_MAX_LINES;
  if (rest > 0) lines.push(`- ${M.morningAlertsMore(rest)}`);
  return lines.join("\n");
}

export async function flushMorningAlerts(now: Date = new Date()): Promise<MorningAlertsSummary> {
  const summary: MorningAlertsSummary = { held: 0, pushed: 0, mailed: 0, failed: 0, skippedHour: false };
  if (!isMemberSendHour(now)) {
    summary.skippedHour = true;
    return summary;
  }
  const db = getDb();
  const rows: Held[] = (
    await db
      .select({ id: notifications.id, userId: notifications.userId, body: notifications.body, channel: notifications.heldChannel })
      .from(notifications)
      .where(isNotNull(notifications.heldChannel))
      .orderBy(notifications.createdAt)
  ).map((r) => ({ ...r, channel: r.channel ?? "" }));
  summary.held = rows.length;
  if (rows.length === 0) return summary;

  // 사람, 받을 길마다 한 묶음
  const groups = new Map<string, Held[]>();
  for (const r of rows) {
    const key = `${r.userId}|${r.channel}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const mailUserIds = [...new Set(rows.filter((r) => r.channel === "email").map((r) => r.userId))];
  const emails = new Map(
    mailUserIds.length === 0 ? [] : (await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, mailUserIds))).map((u) => [u.id, u.email]),
  );
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const inboxLink = `${base}${ROUTES.notifications}`;

  for (const group of groups.values()) {
    const { userId, channel } = group[0];
    const bodies = group.map((g) => g.body);
    const count = String(group.length);
    try {
      if (channel === "email") {
        const to = emails.get(userId);
        if (!to) continue;
        const res = await dispatchSystemMail(
          SYSTEM_TEMPLATES.mailMorningAlerts,
          to,
          { 건수: count, 목록: morningListText(bodies), 링크: inboxLink },
          {
            fallback: () => ({
              to,
              subject: `[${SITE.name}] ${M.morningAlertsMailSubject(group.length)}`,
              html: `<ul>${bodies.slice(0, MORNING_MAIL_MAX_LINES).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul><p><a href="${escapeHtml(inboxLink)}">${escapeHtml(inboxLink)}</a></p>`,
              text: `${morningListText(bodies)}\n\n${inboxLink}`,
            }),
            source: SOURCE,
          },
        );
        if (res.status === "sent") summary.mailed++;
        else if (res.status === "failed") {
          summary.failed++;
          console.warn(`[morning-alerts] 메일 실패 (user=${userId}): ${res.error}`);
        }
      } else {
        // 템플릿이 미사용이면 null — 관리자가 끈 푸시라 보내지 않는다
        const text = await pushNotice(SYSTEM_TEMPLATES.pushMorningAlerts, { 건수: count, 첫알림: bodies[0] }, { title: M.morningAlertsTitle(group.length), body: bodies[0] });
        if (!text) continue;
        const res = await pushToUser(userId, { ...text, url: ROUTES.notifications, tag: "morning-alerts" }, "morning-alerts");
        if (res.sent > 0) summary.pushed++;
        if (res.failed > 0 && res.sent === 0 && res.removed < res.failed) summary.failed++;
      }
    } catch (e) {
      summary.failed++;
      console.warn(`[morning-alerts] 발송 실패 (user=${userId}, ${channel}): ${errorMessage(e)}`);
    }
  }

  // 보낸 줄을 비운다. 크론 도중에 밤 회차가 새로 쌓은 줄(이 목록에 없는 줄)은 남겨 다음 아침에 간다
  const ids = rows.map((r) => r.id);
  await db
    .update(notifications)
    .set({ heldChannel: null, updatedSource: SOURCE, updatedAt: sql`now()` })
    .where(inArray(notifications.id, ids));
  return summary;
}
