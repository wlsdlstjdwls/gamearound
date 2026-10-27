// 인디 글 댓글(2026-10-27, 기획서 3장 "플레이 후 댓글"). 화면 부품은 게시판 댓글(components/community/post-interactions 의 Comments)을
// 그대로 쓰고 계약(CommentDto)도 같다 — 다른 것은 받는 표(indie_post_comments)와 알림이 가는 주소뿐이다.
//
// 공개 글(승인, 공개)에만 달린다. 쌓아 둔 수(commentCount)는 넣기가 실제로 됐을 때 같은 자리에서 올린다(community/reactions 와 같은 규칙).
import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { indiePostComments, indiePosts, users } from "@/server/db/schema";
import { getCurrentUser, requireUser } from "@/server/services/users";
import { pushNotification } from "@/server/services/notifications";
import { authorNameSql } from "@/server/services/community/columns";
import type { CommentDto } from "@/server/services/community/dto";
import { INDIE_NOTIFY_MESSAGES as N, INDIE_PROMO_MESSAGES as M } from "@/lib/indie/promo-messages";
import { indiePath } from "@/lib/routes";

export async function listIndieComments(postId: string): Promise<CommentDto[]> {
  const viewer = await getCurrentUser().catch(() => null);
  const rows = await getDb()
    .select({ id: indiePostComments.id, body: indiePostComments.body, authorName: authorNameSql, createdAt: indiePostComments.createdAt, authorUserId: indiePostComments.authorUserId })
    .from(indiePostComments)
    .innerJoin(users, eq(users.id, indiePostComments.authorUserId))
    .where(and(eq(indiePostComments.postId, postId), eq(indiePostComments.status, "published")))
    .orderBy(asc(indiePostComments.createdAt));
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
