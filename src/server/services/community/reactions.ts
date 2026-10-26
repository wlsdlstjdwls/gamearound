// 좋아요, 저장, 댓글(기획서 v2.0 6.1 "좋아요, 저장, 댓글"). 셋 다 로그인이 필요하다(서비스가 requireUser 로 다시 본다).
//
// 쌓아 둔 수(likeCount, commentCount)는 행을 넣고 지우는 질의와 같은 자리에서 고친다. 넣기가 실제로 됐을 때만
// 올린다 — onConflictDoNothing 이 막은 두 번째 좋아요가 수만 올리면 화면 숫자가 실제 줄 수와 갈라진다.
import { and, asc, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { postComments, postLikes, posts, postSaves, users, type PostCategory } from "@/server/db/schema";
import { getCurrentUser, requireUser } from "@/server/services/users";
import { POSTS_PAGE_SIZE } from "@/lib/community/constants";
import type { CommentDto, PostPage } from "./dto";
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
    // 운영진이 숨긴 댓글은 누구에게도 안 보인다(services/community/admin)
    .where(and(eq(postComments.postId, postId), eq(postComments.status, "published")))
    .orderBy(asc(postComments.createdAt));
  return rows.map(({ authorUserId, ...r }) => ({ ...r, isMine: viewer?.id === authorUserId }));
}

/** 댓글은 목록 맨 아래에 붙는다(기획서 6.1). 글쓴이에게 알림을 남기는 일은 알림함(services/notifications)이 맡는다 */
export async function addComment(postId: string, body: string): Promise<{ comment: CommentDto; postAuthorId: string; postTitle: string; category: string }> {
  const u = await requireUser();
  const db = getDb();
  const [post] = await db.select({ author: posts.authorUserId, title: posts.title, category: posts.category }).from(posts).where(and(eq(posts.id, postId), eq(posts.status, "published")));
  if (!post) throw new Error("글을 찾을 수 없어요");
  const [row] = await db.insert(postComments).values({ postId, authorUserId: u.id, body, ...createdBy("user", u.id) }).returning({ id: postComments.id, body: postComments.body, createdAt: postComments.createdAt });
  await db.update(posts).set({ commentCount: sql`${posts.commentCount} + 1` }).where(eq(posts.id, postId));
  const name = u.displayName ?? `${u.email.split("@")[0].slice(0, 2)}***`;
  return { comment: { id: row.id, body: row.body, authorName: name, createdAt: row.createdAt, isMine: true }, postAuthorId: post.author, postTitle: post.title, category: post.category };
}

/** 저장한 글(내 활동 S-24). 저장한 순서의 최신부터, 게시판과 같은 한 쪽 20줄(기획서 4.3) */
export async function listMySavedPosts(page = 1): Promise<PostPage> {
  const u = await requireUser();
  const db = getDb();
  const at = Math.max(1, page);
  const where = and(eq(postSaves.userId, u.id), eq(posts.status, "published"));
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
        eq(postComments.status, "published"),
        gte(postComments.createdAt, sql`now() - make_interval(days => ${MY_REACTION_WINDOW_DAYS}::int)`),
      ),
    );
  return row?.n ?? 0;
}
