// 인디 글과 개발자 라운지가 만나는 읽기 — 라운지 보조 메뉴의 수(목업 bside), 인디 상세의 관련 소식(기획서 S-19).
//
// 관련 소식: 이 게임에 묶인 라운지 글(posts.indie_post_id, 2026-10-29) + 어느 게임에도 안 묶인 글쓴이 글.
// 안 묶인 글을 같이 세우는 이유: 칸이 생기기 전 글은 전부 비어 있고, 게임을 하나만 올린 개발자는 고를 까닭이 없다.
// 다른 게임에 묶인 글은 뺀다 — 게임을 여럿 올린 개발자의 소식이 서로 섞이던 것이 이 칸을 만든 이유다.
import "server-only";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { indiePosts, posts, users } from "@/server/db/schema";
import { LOUNGE_CATEGORIES } from "@/lib/community/constants";
import { rowColumns, toRow } from "@/server/services/community/columns";
import type { PostRowDto } from "@/server/services/community/dto";

/** 글쓴이의 공개 라운지 글(개발일지, 질문 피드백) 최신순. indiePostId 를 주면 그 게임 글과 안 묶인 글만(머리 주석) */
export async function listAuthorLoungePosts(authorUserId: string, limit: number, indiePostId?: string): Promise<PostRowDto[]> {
  const rows = await getDb()
    .select(rowColumns)
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorUserId))
    .where(
      and(
        eq(posts.authorUserId, authorUserId),
        eq(posts.status, "published"),
        inArray(posts.category, [...LOUNGE_CATEGORIES]),
        indiePostId ? or(eq(posts.indiePostId, indiePostId), isNull(posts.indiePostId)) : undefined,
      ),
    )
    .orderBy(desc(posts.createdAt))
    .limit(limit);
  return rows.map(toRow);
}

/** 라운지 글쓰기의 "어느 게임의 글인가요" 칸. 숨김, 심사 중인 글도 낸다 — 내 게임이고, 상세에 서는지는 상세가 정한다 */
export async function listMyIndieChoices(userId: string): Promise<{ slug: string; title: string }[]> {
  return getDb()
    .select({ slug: indiePosts.slug, title: indiePosts.title })
    .from(indiePosts)
    .where(eq(indiePosts.authorUserId, userId))
    .orderBy(desc(indiePosts.createdAt));
}
