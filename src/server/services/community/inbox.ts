// 내 글에 달린 댓글함(2026-10-28 사용자: "새 댓글 칸을 누르면 내 활동으로만 간다, 댓글을 나열해 보여 주고 누르면 그 댓글로").
// 라운지 홈 현황의 "새 댓글" 수, 댓글함 목록, 글 상세에서 "봤다" 를 적는 일이 같은 기준(post_comments.owner_seen_at)을 본다 —
// 셋이 다른 기준을 쓰면 칸 숫자와 목록의 "새" 표시가 서로 다른 수를 말한다.
//
// "새 댓글" 은 글쓴이가 아직 그 글을 열어 보지 않은 남의 댓글이다. 글을 열면 그 글의 댓글을 모두 본 것으로 적는다(markCommentsSeen) —
// 글 상세가 댓글을 전부 펼쳐 보여 주므로 열었다는 것이 곧 봤다는 것이다. 댓글 하나씩 "읽음" 을 누르게 하지 않는다.
import { and, desc, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { updatedBy } from "@/server/db/audit";
import { postComments, posts, users, type PostCategory } from "@/server/db/schema";
import { authorNameSql } from "./columns";
import type { MyPostCommentDto } from "./dto";

/** 라운지 홈 현황의 "새 댓글" 이 세는 기간(기획서 v2.0 S-16 "최근 7일 내 글 반응") */
export const MY_REACTION_WINDOW_DAYS = 7;
/** 댓글함이 거슬러 올라가는 기간. 새 댓글 기간보다 길게 둔다 — 이미 본 댓글도 다시 찾아갈 수 있어야 한다 */
export const MY_COMMENTS_WINDOW_DAYS = 30;
/** 댓글함 한 화면의 줄 수. 한 달 치가 이보다 많은 사람은 드물고, 넘치면 오래된 쪽부터 잘린다 */
export const MY_COMMENTS_LIMIT = 60;

/** 내 글에 남이 단, 보이는 댓글 */
function onMyPosts(userId: string, categories: readonly PostCategory[], days: number) {
  return and(
    eq(posts.authorUserId, userId),
    inArray(posts.category, [...categories]),
    eq(posts.status, "published"),
    ne(postComments.authorUserId, userId),
    eq(postComments.status, "published"),
    gte(postComments.createdAt, sql`now() - make_interval(days => ${days}::int)`),
  );
}

/** 라운지 홈 현황의 "내 글에 달린 새 댓글" — 최근 7일 안, 아직 글을 열어 보지 않은 남의 댓글 수 */
export async function countUnseenCommentsOnMyPosts(userId: string, categories: readonly PostCategory[]): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(postComments)
    .innerJoin(posts, eq(posts.id, postComments.postId))
    .where(and(onMyPosts(userId, categories, MY_REACTION_WINDOW_DAYS), isNull(postComments.ownerSeenAt)));
  return row?.n ?? 0;
}

/** 댓글함 목록 — 최신부터. 새 댓글 여부는 7일 칸과 같은 기준(기간 안 + 안 봄)이라 칸 숫자와 "새" 표시 수가 같다 */
export async function listCommentsOnMyPosts(userId: string, categories: readonly PostCategory[]): Promise<MyPostCommentDto[]> {
  const rows = await getDb()
    .select({
      id: postComments.id,
      body: postComments.body,
      createdAt: postComments.createdAt,
      isReply: sql<boolean>`${postComments.parentId} is not null`,
      authorName: authorNameSql,
      postId: posts.id,
      postTitle: posts.title,
      category: posts.category,
      isNew: sql<boolean>`${postComments.ownerSeenAt} is null and ${postComments.createdAt} >= now() - make_interval(days => ${MY_REACTION_WINDOW_DAYS}::int)`,
    })
    .from(postComments)
    .innerJoin(posts, eq(posts.id, postComments.postId))
    .innerJoin(users, eq(users.id, postComments.authorUserId))
    .where(onMyPosts(userId, categories, MY_COMMENTS_WINDOW_DAYS))
    .orderBy(desc(postComments.createdAt))
    .limit(MY_COMMENTS_LIMIT);
  return rows;
}

/** 글쓴이가 글을 열었다 — 그 글의 남의 댓글을 모두 본 것으로 적는다. 볼 것이 없으면 아무것도 쓰지 않는다(where 가 거른다) */
export async function markCommentsSeen(postId: string, ownerId: string): Promise<void> {
  await getDb()
    .update(postComments)
    .set({ ownerSeenAt: sql`now()`, ...updatedBy("user", ownerId) })
    .where(and(eq(postComments.postId, postId), isNull(postComments.ownerSeenAt), ne(postComments.authorUserId, ownerId)));
}
