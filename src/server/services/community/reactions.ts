// 좋아요, 저장, 댓글(기획서 v2.0 6.1 "좋아요, 저장, 댓글"). 셋 다 로그인이 필요하다(서비스가 requireUser 로 다시 본다).
//
// 쌓아 둔 수(likeCount, commentCount)는 행을 넣고 지우는 질의와 같은 자리에서 고친다. 넣기가 실제로 됐을 때만
// 올린다 — onConflictDoNothing 이 막은 두 번째 좋아요가 수만 올리면 화면 숫자가 실제 줄 수와 갈라진다.
import { ownedByCurrentSession } from "@/server/auth/session";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { postComments, postLikes, posts, postSaves, users } from "@/server/db/schema";
import { getCurrentUser, requireUser } from "@/server/services/users";
import { POSTS_PAGE_SIZE } from "@/lib/community/constants";
import type { CommentDto, PostPage } from "./dto";
import { authorNameSql, rowColumns, toRow } from "./columns";
import { markCommentsSeen } from "./inbox";

export async function isLiked(postId: string, userId: string): Promise<boolean> {
  const r = await getDb().select({ x: sql`1` }).from(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId))).limit(1);
  return r.length > 0;
}

export async function isSaved(postId: string, userId: string): Promise<boolean> {
  const r = await getDb().select({ x: sql`1` }).from(postSaves).where(and(eq(postSaves.postId, postId), eq(postSaves.userId, userId))).limit(1);
  return r.length > 0;
}

export async function toggleLike(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  const u = await requireUser();
  const db = getDb();
  const removed = await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, u.id))).returning({ p: postLikes.postId });
  let liked = false;
  if (removed.length > 0) {
    await db.update(posts).set({ likeCount: sql`greatest(${posts.likeCount} - 1, 0)` }).where(eq(posts.id, postId));
  } else {
    const added = await db.insert(postLikes).values({ postId, userId: u.id, ...createdBy("user", u.id) }).onConflictDoNothing().returning({ p: postLikes.postId });
    liked = true;
    if (added.length > 0) await db.update(posts).set({ likeCount: sql`${posts.likeCount} + 1` }).where(eq(posts.id, postId));
  }
  const [row] = await db.select({ n: posts.likeCount }).from(posts).where(eq(posts.id, postId));
  return { liked, likeCount: row?.n ?? 0 };
}

export async function toggleSave(postId: string): Promise<{ saved: boolean }> {
  const u = await requireUser();
  const db = getDb();
  const removed = await db.delete(postSaves).where(and(eq(postSaves.postId, postId), eq(postSaves.userId, u.id))).returning({ p: postSaves.postId });
  if (removed.length > 0) return { saved: false };
  await db.insert(postSaves).values({ postId, userId: u.id, ...createdBy("user", u.id) }).onConflictDoNothing();
  return { saved: true };
}

export async function listComments(postId: string): Promise<CommentDto[]> {
  // 사람과 댓글은 서로 기다릴 일이 없다 — 나란히 묻는다(2026-10-30 쿼리 점검)
  const [viewer, rows] = await Promise.all([getCurrentUser().catch(() => null), getDb()
    .select({
      id: postComments.id,
      parentId: postComments.parentId,
      body: postComments.body,
      authorName: authorNameSql,
      createdAt: postComments.createdAt,
      authorUserId: postComments.authorUserId,
      postAuthorId: posts.authorUserId,
      seen: sql<boolean>`${postComments.ownerSeenAt} is not null`,
    })
    .from(postComments)
    .innerJoin(users, eq(users.id, postComments.authorUserId))
    .innerJoin(posts, eq(posts.id, postComments.postId))
    // 운영진이 숨긴 댓글은 누구에게도 안 보인다(services/community/admin)
    .where(and(eq(postComments.postId, postId), eq(postComments.status, "published")))
    .orderBy(asc(postComments.createdAt))]);
  const owner = viewer !== null && rows.length > 0 && rows[0].postAuthorId === viewer.id;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 글쓴이 id 는 화면에 내보내지 않는다
  const list = rows.map(({ authorUserId, postAuthorId, seen, ...r }) => ({ ...r, isMine: viewer?.id === authorUserId, isNew: owner && !seen && viewer?.id !== authorUserId }));
  // 글쓴이가 열었으면 이번에 보여 준 댓글을 "봤다" 로 적는다 — "새" 표시는 이번 한 번만 서고 댓글함 숫자도 그만큼 준다(services/community/inbox).
  // 적기가 실패해도 글은 선다 — 다음에 열 때 한 번 더 "새" 로 보일 뿐이다
  if (owner && list.some((c) => c.isNew)) await markCommentsSeen(postId, viewer.id).catch(() => {});
  return list;
}

/**
 * 댓글은 목록 맨 아래에, 답글은 원댓글 묶음 맨 아래에 붙는다(기획서 6.1). 알림을 남기는 일은 알림함(services/notifications)이 맡는다.
 * 답글의 답글은 원댓글로 끌어올린다 — 깊이는 한 단계다(schema-community 의 parentId 주석). 다른 글의 댓글, 숨긴 댓글에는 답할 수 없다.
 * 답글도 글의 commentCount 에 센다 — 인기 점수는 "그 글에 오간 말의 양" 이다.
 */
export async function addComment(
  postId: string,
  body: string,
  parentId: string | null = null,
): Promise<{ comment: CommentDto; postAuthorId: string; postTitle: string; category: string; parentAuthorId: string | null }> {
  const u = await requireUser();
  const db = getDb();
  const [[post], parentRows] = await Promise.all([
    db.select({ author: posts.authorUserId, title: posts.title, category: posts.category }).from(posts).where(and(eq(posts.id, postId), eq(posts.status, "published"))),
    parentId
      ? db
          .select({ id: postComments.id, parentId: postComments.parentId, author: postComments.authorUserId })
          .from(postComments)
          .where(and(eq(postComments.id, parentId), eq(postComments.postId, postId), eq(postComments.status, "published")))
      : Promise.resolve([]),
  ]);
  if (!post) throw new Error("글을 찾을 수 없어요");
  const parent = parentRows[0];
  if (parentId && !parent) throw new Error("답글을 달 댓글을 찾을 수 없어요");
  const rootId = parent ? (parent.parentId ?? parent.id) : null;
  const [row] = await db
    .insert(postComments)
    .values({ postId, parentId: rootId, authorUserId: u.id, body, ...createdBy("user", u.id) })
    .returning({ id: postComments.id, body: postComments.body, createdAt: postComments.createdAt });
  await db.update(posts).set({ commentCount: sql`${posts.commentCount} + 1` }).where(eq(posts.id, postId));
  const name = u.displayName ?? `${u.email.split("@")[0].slice(0, 2)}***`;
  return {
    comment: { id: row.id, parentId: rootId, body: row.body, authorName: name, createdAt: row.createdAt, isMine: true },
    postAuthorId: post.author,
    postTitle: post.title,
    category: post.category,
    parentAuthorId: parent?.author ?? null,
  };
}

/** 저장한 글(내 활동 S-24). 저장한 순서의 최신부터, 게시판과 같은 한 쪽 20줄(기획서 4.3) */
export async function listMySavedPosts(page = 1): Promise<PostPage> {
  // 소유자 조건을 세션 서브질의로 넣어 세션 왕복을 따로 세우지 않는다(2026-10-30 쿼리 점검)
  const owner = await ownedByCurrentSession(postSaves.userId);
  if (!owner) throw new Error(AUTH_MESSAGES.loginRequired);
  const db = getDb();
  const at = Math.max(1, page);
  const where = and(owner, eq(posts.status, "published"));
  // 건수와 목록은 나란히 보낸다(Neon 왕복 1회). 숨긴 글은 건수에서도 빠져야 쪽 수가 실제 줄 수와 맞는다
  const [countRows, rows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(postSaves).innerJoin(posts, eq(posts.id, postSaves.postId)).where(where),
    db
      .select(rowColumns)
      .from(postSaves)
      .innerJoin(posts, eq(posts.id, postSaves.postId))
      .innerJoin(users, eq(users.id, posts.authorUserId))
      .where(where)
      .orderBy(desc(postSaves.createdAt), desc(posts.id))
      .limit(POSTS_PAGE_SIZE)
      .offset((at - 1) * POSTS_PAGE_SIZE),
  ]);
  const total = countRows[0]?.n ?? 0;
  return { items: rows.map(toRow), total, page: at, totalPages: Math.max(1, Math.ceil(total / POSTS_PAGE_SIZE)) };
}
