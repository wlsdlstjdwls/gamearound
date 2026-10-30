// 게시판, 라운지 댓글 고치기와 지우기(2026-10-30 사용자 "수정/삭제 기능 다 제공하나"). 글쓴이 본인만 한다 — 운영진은 숨긴다(./admin).
// 소유자 조건은 질의의 where 에 넣는다. 숨긴 댓글은 고치지 못한다(운영진이 내린 말을 고쳐 되살리는 길을 막는다).
// 지우면 답글도 cascade 로 같이 간다(schema-community 의 parentId 주석). 글에 쌓아 둔 댓글 수(commentCount)는
// 실제로 사라진 공개 댓글 수만큼 뺀다 — 숨긴 답글은 숨길 때 이미 뺐다(./admin 의 moderateComment).
import { and, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { updatedBy } from "@/server/db/audit";
import { postComments, posts, type PostCategory } from "@/server/db/schema";
import { requireUser } from "@/server/services/users";
import { POST_EDIT_MESSAGES as M } from "@/lib/community/messages";

export async function updateComment(id: string, body: string): Promise<{ body: string; postId: string; category: PostCategory }> {
  const u = await requireUser();
  const [row] = await getDb()
    .update(postComments)
    .set({ body, ...updatedBy("user", u.id) })
    .where(and(eq(postComments.id, id), eq(postComments.authorUserId, u.id), eq(postComments.status, "published")))
    .returning({ body: postComments.body, postId: postComments.postId, category: sql<PostCategory>`(select ${posts.category} from ${posts} where ${posts.id} = ${postComments.postId})` });
  if (!row) throw new Error(M.commentForbidden);
  return row;
}

export async function deleteComment(id: string): Promise<{ postId: string; category: PostCategory }> {
  const u = await requireUser();
  const db = getDb();
  // 지우기 전에 같이 사라질 공개 답글 수를 센다 — 지운 뒤에는 cascade 로 이미 없다. 두 질의는 서로 기다릴 일이 없다
  const [[target], [{ n: replies }]] = await Promise.all([
    db
      .select({ postId: postComments.postId, status: postComments.status, category: posts.category })
      .from(postComments)
      .innerJoin(posts, eq(posts.id, postComments.postId))
      .where(and(eq(postComments.id, id), eq(postComments.authorUserId, u.id))),
    db.select({ n: count() }).from(postComments).where(and(eq(postComments.parentId, id), eq(postComments.status, "published"))),
  ]);
  if (!target) throw new Error(M.commentForbidden);
  await db.delete(postComments).where(and(eq(postComments.id, id), eq(postComments.authorUserId, u.id)));
  const gone = (target.status === "published" ? 1 : 0) + replies;
  if (gone > 0) await db.update(posts).set({ commentCount: sql`greatest(${posts.commentCount} - ${gone}::int, 0)` }).where(eq(posts.id, target.postId));
  return { postId: target.postId, category: target.category };
}
