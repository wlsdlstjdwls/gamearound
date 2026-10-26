// 알림함(기획서 v2.0 M-03). 쌓는 쪽(댓글 액션, 가격 알림 발송, 승인)과 읽는 쪽(헤더 종 팝오버)이 이 파일을 쓴다.
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { notifications, type NotificationKind } from "@/server/db/schema";
import { getCurrentUser } from "@/server/services/users";
import { postPath, type POST_CATEGORIES } from "@/lib/community/constants";
import { NOTIFICATION_MESSAGES as M } from "@/lib/notifications/messages";

/** 팝오버에 서는 최근 알림 수. 더 오래된 것은 읽을 화면이 아직 없다(후속) */
export const NOTIFICATION_LIST_LIMIT = 20;

export type NotificationDto = { id: string; kind: NotificationKind; body: string; link: string | null; createdAt: Date; read: boolean };

export async function pushNotification(userId: string, kind: NotificationKind, body: string, link: string | null, source: "user" | "system" = "system"): Promise<void> {
  await getDb().insert(notifications).values({ userId, kind, body, link, ...createdBy(source) });
}

/** 내 글에 댓글이 달렸다. 내가 내 글에 단 댓글은 알리지 않는다 */
export async function notifyComment(p: { postId: string; postAuthorId: string; postTitle: string; category: string }): Promise<void> {
  const me = await getCurrentUser().catch(() => null);
  if (!me || me.id === p.postAuthorId) return;
  await pushNotification(p.postAuthorId, "comment", M.comment(p.postTitle), postPath(p.postId, p.category as (typeof POST_CATEGORIES)[number]), "user");
}

/** 지금 사람의 최근 알림. 비로그인이면 빈 목록 */
export async function listMyNotifications(): Promise<NotificationDto[]> {
  const me = await getCurrentUser().catch(() => null);
  if (!me) return [];
  const rows = await getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.userId, me.id))
    .orderBy(desc(notifications.createdAt))
    .limit(NOTIFICATION_LIST_LIMIT);
  return rows.map((r) => ({ id: r.id, kind: r.kind, body: r.body, link: r.link, createdAt: r.createdAt, read: r.readAt !== null }));
}
