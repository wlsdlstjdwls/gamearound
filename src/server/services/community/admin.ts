// 게시판 글, 댓글 운영(기획서 v2.0 2.2 운영진 "부적절한 글 숨김", 9.2 관리자 콘솔 "게시글 관리"). 관리자 화면 /admin/posts 가 부른다.
//
// 숨김은 지우기가 아니다 — 되살릴 길을 남긴다. 글쓴이는 숨긴 제 글을 상세에서 계속 본다(posts.getPostDetail).
// 댓글을 숨기거나 되살리면 글의 commentCount 도 같이 고친다. 그 값이 인기 점수(7장)라, 숨긴 댓글로 글이 인기글에 남으면 안 된다.
// 상태가 **실제로 바뀐 줄**에서만 고친다 — 같은 버튼을 두 번 눌러 수가 두 번 빠지지 않게(reactions 의 쌓은 수 규칙과 같다).
import "server-only";
import { and, desc, eq, gte, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { updatedBy } from "@/server/db/audit";
import { postComments, posts, users } from "@/server/db/schema";
import { postPath } from "@/lib/community/constants";
import type { AdminCommentRowDto, AdminPostRowDto } from "./dto";
import { authorNameSql, rowColumns, toRow } from "./columns";

/** 관리자 화면의 칸. 첫 칸이 전체 글이다 — 신고 장치가 아직 없어(기획서 6.1 "신고는 협의") 쌓이는 큐가 없다 */
export const POST_ADMIN_TABS = ["posts", "hidden", "comments", "hiddenComments"] as const;
export type PostAdminTab = (typeof POST_ADMIN_TABS)[number];
export type ModerationDecision = "hide" | "restore";

/** 한 화면에 세우는 줄 수. 최신부터 보고, 오래된 글은 검색으로 찾는다(쪽 넘기기보다 빠르다) */
export const POST_ADMIN_LIMIT = 100;

/** 한국 날짜의 오늘 0시(community/home 과 같은 식) — 관리자 요약의 "오늘" 도 한국 사람의 오늘이다 */
const todayStartSql = sql`(date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')`;

export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function listPostsForAdmin(tab: "posts" | "hidden", q = ""): Promise<AdminPostRowDto[]> {
  const pattern = `%${escapeLike(q.trim())}%`;
  const conds: (SQL | undefined)[] = [eq(posts.status, tab === "hidden" ? "hidden" : "published")];
  if (q.trim()) conds.push(or(sql`${posts.title} ilike ${pattern}`, sql`${authorNameSql} ilike ${pattern}`, sql`${users.email} ilike ${pattern}`));
  const rows = await getDb()
    .select({ ...rowColumns, authorEmail: users.email, status: posts.status })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorUserId))
    .where(and(...conds))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(POST_ADMIN_LIMIT);
  return rows.map(({ authorEmail, status, ...r }) => ({ ...toRow(r), authorEmail, status }));
}

export async function listCommentsForAdmin(hidden: boolean, q = ""): Promise<AdminCommentRowDto[]> {
  const pattern = `%${escapeLike(q.trim())}%`;
  const conds: (SQL | undefined)[] = [eq(postComments.status, hidden ? "hidden" : "published")];
  if (q.trim()) conds.push(or(sql`${postComments.body} ilike ${pattern}`, sql`${authorNameSql} ilike ${pattern}`, sql`${users.email} ilike ${pattern}`));
  const rows = await getDb()
    .select({
      id: postComments.id,
      body: postComments.body,
      status: postComments.status,
      authorName: authorNameSql,
      authorEmail: users.email,
      createdAt: postComments.createdAt,
      postId: posts.id,
      postTitle: posts.title,
      postCategory: posts.category,
      postStatus: posts.status,
    })
    .from(postComments)
    .innerJoin(users, eq(users.id, postComments.authorUserId))
    .innerJoin(posts, eq(posts.id, postComments.postId))
    .where(and(...conds))
    .orderBy(desc(postComments.createdAt), desc(postComments.id))
    .limit(POST_ADMIN_LIMIT);
  return rows.map(({ postId, postCategory, ...r }) => ({ ...r, kind: "comment" as const, postHref: postPath(postId, postCategory) }));
}

/** 글 숨김, 되살림. 돌려주는 경로는 액션이 캐시를 밀 자리다 */
export async function moderatePost(id: string, decision: ModerationDecision, adminId: string): Promise<{ href: string }> {
  const [row] = await getDb()
    .update(posts)
    .set({ status: decision === "hide" ? "hidden" : "published", ...updatedBy("admin", adminId) })
    .where(eq(posts.id, id))
    .returning({ id: posts.id, category: posts.category });
  if (!row) throw new Error("글을 찾을 수 없어요");
  return { href: postPath(row.id, row.category) };
}

export async function moderateComment(id: string, decision: ModerationDecision, adminId: string): Promise<{ href: string }> {
  const db = getDb();
  const next = decision === "hide" ? "hidden" : "published";
  // 이미 그 상태인 댓글은 줄이 안 돌아온다 — 그때는 수를 건드리지 않는다
  const [changed] = await db
    .update(postComments)
    .set({ status: next, ...updatedBy("admin", adminId) })
    .where(and(eq(postComments.id, id), ne(postComments.status, next)))
    .returning({ postId: postComments.postId });
  const postId = changed?.postId ?? (await db.select({ postId: postComments.postId }).from(postComments).where(eq(postComments.id, id)))[0]?.postId;
  if (!postId) throw new Error("댓글을 찾을 수 없어요");
  const [post] = changed
    ? await db
        .update(posts)
        .set({ commentCount: decision === "hide" ? sql`greatest(${posts.commentCount} - 1, 0)` : sql`${posts.commentCount} + 1` })
        .where(eq(posts.id, postId))
        .returning({ id: posts.id, category: posts.category })
    : await db.select({ id: posts.id, category: posts.category }).from(posts).where(eq(posts.id, postId));
  return { href: post ? postPath(post.id, post.category) : "" };
}

/** 관리자 첫 화면 요약의 "오늘 새 글, 새 댓글"(한국 날짜). 두 수를 나란히 센다 — 왕복 1회분 */
export async function countCommunityToday(): Promise<{ posts: number; comments: number }> {
  const db = getDb();
  const [[p], [c]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(posts).where(gte(posts.createdAt, todayStartSql)),
    db.select({ n: sql<number>`count(*)::int` }).from(postComments).where(gte(postComments.createdAt, todayStartSql)),
  ]);
  return { posts: p?.n ?? 0, comments: c?.n ?? 0 };
}
