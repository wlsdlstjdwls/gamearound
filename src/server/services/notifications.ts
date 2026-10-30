// 알림함(기획서 v2.0 M-03). 쌓는 쪽(댓글 액션, 가격 알림 발송, 승인)과 읽는 쪽(헤더 종 팝오버)이 이 파일을 쓴다.
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { notifications, type NotificationKind } from "@/server/db/schema";
import { getCurrentUser } from "@/server/services/users";
import { ownedByCurrentSession } from "@/server/auth/session";
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

/**
 * 내 댓글에 답글이 달렸다. 갈래는 댓글과 같이 "comment" 다 — 알림 종류 enum 을 늘리면 마이그레이션이 하나 더 붙고, 받는 사람에게는 같은 소식이다.
 * 글쓴이가 곧 댓글 주인이면 글 알림과 겹치지 않게 이쪽은 보내지 않는다(addCommentAction 이 둘 중 하나만 부른다).
 */
export async function notifyReply(p: { postId: string; parentAuthorId: string; postTitle: string; category: string }): Promise<void> {
  const me = await getCurrentUser().catch(() => null);
  if (!me || me.id === p.parentAuthorId) return;
  await pushNotification(p.parentAuthorId, "comment", M.reply(p.postTitle), postPath(p.postId, p.category as (typeof POST_CATEGORIES)[number]), "user");
}

/**
 * 지금 사람의 최근 알림. 비로그인이면 빈 목록.
 * 세션을 먼저 묻고 그다음 알림을 묻으면 Neon 왕복이 둘(약 440ms) 줄을 선다(2026-10-30 사용자 "알림 이력 조회가 느리다").
 * 소유자 조건을 세션 서브질의로 넣어 한 왕복에 끝낸다 — 찜 목록(listWishlist)과 같은 방식이다
 */
export async function listMyNotifications(): Promise<NotificationDto[]> {
  const owner = await ownedByCurrentSession(notifications.userId);
  if (!owner) return [];
  const rows = await getDb()
    .select()
    .from(notifications)
    .where(owner)
    .orderBy(desc(notifications.createdAt))
    .limit(NOTIFICATION_LIST_LIMIT);
  return rows.map((r) => ({ id: r.id, kind: r.kind, body: r.body, link: r.link, createdAt: r.createdAt, read: r.readAt !== null }));
}

/** 알림함 전체 보기(/notifications) 한 쪽의 줄 수. 하루 몇 통 오는 화면이라 넉넉히 펴고 쪽을 넘긴다 */
export const NOTIFICATION_PAGE_SIZE = 30;

export type NotificationPage = { items: NotificationDto[]; total: number; unread: number };

/**
 * 알림함 한 쪽(2026-10-30). 팝오버(listMyNotifications)는 최근 20건만 보여 주고 그보다 오래된 알림은 읽을 자리가 없었다.
 * 줄, 총수, 안 읽은 수를 한 왕복에 받는다 — 셋을 따로 물으면 Neon 왕복이 셋 줄을 선다(neon-roundtrip-cost)
 */
export async function listMyNotificationsPage(page: number): Promise<NotificationPage> {
  const owner = await ownedByCurrentSession(notifications.userId);
  if (!owner) return { items: [], total: 0, unread: 0 };
  const rows = await getDb()
    .select({
      id: notifications.id,
      kind: notifications.kind,
      body: notifications.body,
      link: notifications.link,
      createdAt: notifications.createdAt,
      readAt: notifications.readAt,
      total: sql<number>`count(*) over ()::int`,
      unread: sql<number>`(count(*) filter (where ${notifications.readAt} is null) over ())::int`,
    })
    .from(notifications)
    .where(owner)
    // 같은 시각에 쌓인 줄(한 크론이 한꺼번에 쓴 알림)도 쪽을 넘길 때 순서가 흔들리지 않게 id 로 한 번 더 줄 세운다
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .offset((Math.max(page, 1) - 1) * NOTIFICATION_PAGE_SIZE)
    .limit(NOTIFICATION_PAGE_SIZE);
  return {
    items: rows.map((r) => ({ id: r.id, kind: r.kind, body: r.body, link: r.link, createdAt: r.createdAt, read: r.readAt !== null })),
    total: rows[0]?.total ?? 0,
    unread: rows[0]?.unread ?? 0,
  };
}

/**
 * 화면에 편 알림을 읽은 것으로 친다. 화면이 응답을 보낸 뒤(after) 부른다 — 이번 화면은 "새 알림" 표시를 그대로 보여 준다.
 * 사람은 부르는 쪽이 넘긴다: after 안에서는 쿠키를 못 읽어 세션 서브질의(ownedByCurrentSession)를 쓸 수 없다
 */
export async function markNotificationsRead(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await getDb()
    .update(notifications)
    .set({ readAt: sql`now()`, updatedAt: sql`now()`, updatedSource: "user", updatedBy: userId })
    .where(and(eq(notifications.userId, userId), inArray(notifications.id, ids), isNull(notifications.readAt)));
}
