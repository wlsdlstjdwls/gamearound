// 인디 글 댓글(2026-10-27, 기획서 3장 "플레이 후 댓글"). 화면 부품은 게시판 댓글(components/community/post-interactions 의 Comments)을
// 그대로 쓰고 계약(CommentDto)도 같다 — 다른 것은 받는 표(indie_post_comments)와 알림이 가는 주소뿐이다.
//
// 공개 글(승인, 공개)에만 달린다. 쌓아 둔 수(commentCount)는 넣기가 실제로 됐을 때 같은 자리에서 올린다(community/reactions 와 같은 규칙).
import "server-only";
import { and, asc, desc, eq, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { indiePostComments, indiePosts, users } from "@/server/db/schema";
import { getCurrentUser, requireUser } from "@/server/services/users";
import { pushNotification } from "@/server/services/notifications";
import { authorNameSql } from "@/server/services/community/columns";
import { escapeLike, listCommentsForAdmin, POST_ADMIN_LIMIT, type ModerationDecision } from "@/server/services/community/admin";
import type { AdminCommentRowDto, CommentDto } from "@/server/services/community/dto";
import { INDIE_NOTIFY_MESSAGES as N, INDIE_PROMO_MESSAGES as M } from "@/lib/indie/promo-messages";
import { indiePath } from "@/lib/routes";
import { POST_EDIT_MESSAGES as E } from "@/lib/community/messages";

export async function listIndieComments(postId: string): Promise<CommentDto[]> {
  // 사람과 댓글은 서로 기다릴 일이 없다 — 나란히 묻는다(2026-10-30 쿼리 점검)
  const [viewer, rows] = await Promise.all([
    getCurrentUser().catch(() => null),
    getDb()
      .select({ id: indiePostComments.id, body: indiePostComments.body, authorName: authorNameSql, createdAt: indiePostComments.createdAt, authorUserId: indiePostComments.authorUserId })
      .from(indiePostComments)
      .innerJoin(users, eq(users.id, indiePostComments.authorUserId))
      .where(and(eq(indiePostComments.postId, postId), eq(indiePostComments.status, "published")))
      .orderBy(asc(indiePostComments.createdAt)),
  ]);
  return rows.map(({ authorUserId, ...r }) => ({ ...r, isMine: viewer?.id === authorUserId }));
}

/** 댓글 하나. 글쓴이가 아닌 사람이 달면 글쓴이 알림함에 한 줄 남긴다(실패해도 댓글은 이미 섰다) */
export async function addIndieComment(postId: string, body: string): Promise<{ comment: CommentDto; slug: string }> {
  const u = await requireUser();
  const db = getDb();
  const [post] = await db
    .select({ author: indiePosts.authorUserId, title: indiePosts.title, slug: indiePosts.slug })
    .from(indiePosts)
    .where(and(eq(indiePosts.id, postId), eq(indiePosts.status, "published"), eq(indiePosts.review, "approved")));
  if (!post) throw new Error(M.commentNotFound);
  const [row] = await db
    .insert(indiePostComments)
    .values({ postId, authorUserId: u.id, body, ...createdBy("user", u.id) })
    .returning({ id: indiePostComments.id, body: indiePostComments.body, createdAt: indiePostComments.createdAt });
  await db.update(indiePosts).set({ commentCount: sql`${indiePosts.commentCount} + 1` }).where(eq(indiePosts.id, postId));
  if (u.id !== post.author) await pushNotification(post.author, "comment", N.comment(post.title), indiePath(post.slug), "user").catch(() => {});
  const name = u.displayName ?? `${u.email.split("@")[0].slice(0, 2)}***`;
  return { comment: { id: row.id, body: row.body, authorName: name, createdAt: row.createdAt, isMine: true }, slug: post.slug };
}

/**
 * 관리자 댓글 칸(/admin/posts)에 서는 줄. 게시판 댓글과 인디 댓글을 한 목록에 섞어 최신순으로 세운다.
 * 칸을 따로 만들지 않은 이유: 운영진이 하는 일(부적절한 댓글을 찾아 숨기기)이 같고, 칸이 둘이면 둘 다 훑어야 한다.
 */
export async function listAllCommentsForAdmin(hidden: boolean, q = ""): Promise<AdminCommentRowDto[]> {
  const pattern = `%${escapeLike(q.trim())}%`;
  const conds: (SQL | undefined)[] = [eq(indiePostComments.status, hidden ? "hidden" : "published")];
  if (q.trim()) conds.push(or(sql`${indiePostComments.body} ilike ${pattern}`, sql`${authorNameSql} ilike ${pattern}`, sql`${users.email} ilike ${pattern}`));
  const [board, indie] = await Promise.all([
    listCommentsForAdmin(hidden, q),
    getDb()
      .select({
        id: indiePostComments.id,
        body: indiePostComments.body,
        status: indiePostComments.status,
        authorName: authorNameSql,
        authorEmail: users.email,
        createdAt: indiePostComments.createdAt,
        postTitle: indiePosts.title,
        slug: indiePosts.slug,
        postStatus: indiePosts.status,
      })
      .from(indiePostComments)
      .innerJoin(users, eq(users.id, indiePostComments.authorUserId))
      .innerJoin(indiePosts, eq(indiePosts.id, indiePostComments.postId))
      .where(and(...conds))
      .orderBy(desc(indiePostComments.createdAt))
      .limit(POST_ADMIN_LIMIT),
  ]);
  const indieRows: AdminCommentRowDto[] = indie.map(({ slug, ...r }) => ({ ...r, kind: "indieComment" as const, postHref: indiePath(slug) }));
  return [...board, ...indieRows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, POST_ADMIN_LIMIT);
}

/** 인디 댓글 숨김, 되살림. 상태가 실제로 바뀐 줄에서만 쌓아 둔 수를 고친다(community/admin 의 moderateComment 와 같은 규칙) */
export async function moderateIndieComment(id: string, decision: ModerationDecision, adminId: string): Promise<{ href: string }> {
  const db = getDb();
  const next = decision === "hide" ? "hidden" : "published";
  const [changed] = await db
    .update(indiePostComments)
    .set({ status: next, ...updatedBy("admin", adminId) })
    .where(and(eq(indiePostComments.id, id), ne(indiePostComments.status, next)))
    .returning({ postId: indiePostComments.postId });
  const postId = changed?.postId ?? (await db.select({ postId: indiePostComments.postId }).from(indiePostComments).where(eq(indiePostComments.id, id)))[0]?.postId;
  if (!postId) throw new Error("댓글을 찾을 수 없어요");
  const [post] = changed
    ? await db
        .update(indiePosts)
        .set({ commentCount: decision === "hide" ? sql`greatest(${indiePosts.commentCount} - 1, 0)` : sql`${indiePosts.commentCount} + 1` })
        .where(eq(indiePosts.id, postId))
        .returning({ slug: indiePosts.slug })
    : await db.select({ slug: indiePosts.slug }).from(indiePosts).where(eq(indiePosts.id, postId));
  return { href: post ? indiePath(post.slug) : "" };
}

/**
 * 인디 댓글 고치기, 지우기(2026-10-30). 게시판 댓글(community/comment-edit)과 같은 규칙이다: 글쓴이 본인만, 숨긴 댓글은 못 고친다,
 * 지우면 쌓아 둔 수에서 공개 댓글일 때만 뺀다. 인디 댓글에는 답글이 없어 같이 사라지는 줄이 없다
 */
export async function updateIndieComment(id: string, body: string): Promise<{ body: string; slug: string }> {
  const u = await requireUser();
  const [row] = await getDb()
    .update(indiePostComments)
    .set({ body, ...updatedBy("user", u.id) })
    .where(and(eq(indiePostComments.id, id), eq(indiePostComments.authorUserId, u.id), eq(indiePostComments.status, "published")))
    .returning({ body: indiePostComments.body, slug: sql<string>`(select ${indiePosts.slug} from ${indiePosts} where ${indiePosts.id} = ${indiePostComments.postId})` });
  if (!row) throw new Error(E.commentForbidden);
  return row;
}

export async function deleteIndieComment(id: string): Promise<{ slug: string }> {
  const u = await requireUser();
  const db = getDb();
  const [row] = await db
    .delete(indiePostComments)
    .where(and(eq(indiePostComments.id, id), eq(indiePostComments.authorUserId, u.id)))
    .returning({ postId: indiePostComments.postId, status: indiePostComments.status });
  if (!row) throw new Error(E.commentForbidden);
  const [post] =
    row.status === "published"
      ? await db.update(indiePosts).set({ commentCount: sql`greatest(${indiePosts.commentCount} - 1, 0)` }).where(eq(indiePosts.id, row.postId)).returning({ slug: indiePosts.slug })
      : await db.select({ slug: indiePosts.slug }).from(indiePosts).where(eq(indiePosts.id, row.postId));
  return { slug: post?.slug ?? "" };
}
