// 좋아요, 저장, 댓글(기획서 v2.0 6.1 "좋아요, 저장, 댓글"). 셋 다 로그인이 필요하다(서비스가 requireUser 로 다시 본다).
//
// 쌓아 둔 수(likeCount, commentCount)는 행을 넣고 지우는 질의와 같은 자리에서 고친다. 넣기가 실제로 됐을 때만
// 올린다 — onConflictDoNothing 이 막은 두 번째 좋아요가 수만 올리면 화면 숫자가 실제 줄 수와 갈라진다.
import { and, asc, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { postComments, postLikes, posts, postSaves, users, type PostCategory } from "@/server/db/schema";
import { getCurrentUser, requireUser } from "@/server/services/users";
import type { CommentDto, PostRowDto } from "./dto";
import { authorNameSql, rowColumns, toRow } from "./columns";

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
  const viewer = await getCurrentUser().catch(() => null);
  const rows = await getDb()
    .select({ id: postComments.id, body: postComments.body, authorName: authorNameSql, createdAt: postComments.createdAt, authorUserId: postComments.authorUserId })
    .from(postComments)
    .innerJoin(users, eq(users.id, postComments.authorUserId))
    .where(eq(postComments.postId, postId))
    .orderBy(asc(postComments.createdAt));
  return rows.map(({ authorUserId, ...r }) => ({ ...r, isMine: viewer?.id === authorUserId }));
}

/** 댓글은 목록 맨 아래에 붙는다(기획서 6.1). 글쓴이에게 알림을 남기는 일은 알림함(services/notifications)이 맡는다 */
export async function addComment(postId: string, body: string): Promise<{ comment: CommentDto; postAuthorId: string; postTitle: string; category: string }> {
  const u = await requireUser();
  const db = getDb();
  const [post] = await db.select({ author: posts.authorUserId, title: posts.title, category: posts.category }).from(posts).where(and(eq(posts.id, postId), eq(posts.status, "published")));
  if (!post) throw new Error("글을 찾을 수 없어요");
  const [row] = await db.insert(postComments).values({ postId, authorUserId: u.id, body, ...createdBy("user", u.id) }).returning();
  await db.update(posts).set({ commentCount: sql`${posts.commentCount} + 1` }).where(eq(posts.id, postId));
  const name = u.displayName ?? `${u.email.split("@")[0].slice(0, 2)}***`;
  return { comment: { id: row.id, body: row.body, authorName: name, createdAt: row.createdAt, isMine: true }, postAuthorId: post.author, postTitle: post.title, category: post.category };
}

/** 저장한 글(내 활동 S-24). 저장한 순서의 최신부터 */
export async function listMySavedPosts(): Promise<PostRowDto[]> {
  const u = await requireUser();
  const rows = await getDb()
    .select(rowColumns)
    .from(postSaves)
    .innerJoin(posts, eq(posts.id, postSaves.postId))
    .innerJoin(users, eq(users.id, posts.authorUserId))
    .where(and(eq(postSaves.userId, u.id), eq(posts.status, "published")))
    .orderBy(desc(postSaves.createdAt));
  return rows.map(toRow);
}

/** 라운지 홈 현황의 "내 글 반응" — 최근 며칠 동안 내 글에 남이 단 댓글 수(기획서 v2.0 S-16) */
export const MY_REACTION_WINDOW_DAYS = 7;
export async function countRecentCommentsOnMyPosts(userId: string, categories: readonly PostCategory[]): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(postComments)
    .innerJoin(posts, eq(posts.id, postComments.postId))
    .where(
      and(
        eq(posts.authorUserId, userId),
        inArray(posts.category, [...categories]),
        ne(postComments.authorUserId, userId),
        gte(postComments.createdAt, sql`now() - make_interval(days => ${MY_REACTION_WINDOW_DAYS}::int)`),
      ),
    );
  return row?.n ?? 0;
}
