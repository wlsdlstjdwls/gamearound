// 인디 글과 개발자 라운지가 만나는 읽기 — 라운지 보조 메뉴의 수(목업 bside), 인디 상세의 관련 소식(기획서 S-19).
//
// 관련 소식을 "이 게임의 글" 이 아니라 "이 게임을 올린 사람의 라운지 글" 로 고르는 이유: 라운지 글(posts)에는 어느 인디 게임의
// 글인지 적는 칸이 없다(schema-community). 지금 이을 수 있는 끈은 글쓴이 하나뿐이고, 인디 게임은 개발자 본인이 올리므로
// 그 사람의 개발일지가 곧 그 게임의 소식인 경우가 대부분이다. 게임마다 정확히 가르려면 posts 에 인디 글 id 칸이 있어야 한다.
import "server-only";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { indiePosts, posts, users } from "@/server/db/schema";
import { LOUNGE_CATEGORIES } from "@/lib/community/constants";
import { rowColumns, toRow } from "@/server/services/community/columns";
import type { PostRowDto } from "@/server/services/community/dto";
import { isPublic } from "./read";

/** 공개된 인디 게임 수 — 보조 메뉴 "내가 만든 게임" 칸. 목록 화면(/indie)과 같은 문턱(isPublic)을 쓴다 */
export async function countPublicIndie(): Promise<number> {
  const [{ n }] = await getDb().select({ n: count() }).from(indiePosts).where(isPublic);
  return n;
}

/** 내가 신청한 인디 게임 수(승인 대기, 반려 포함) — 보조 메뉴 "등록현황" 칸. 등록현황 화면의 "전체 신청" 과 같은 수다 */
export async function countMyIndie(userId: string): Promise<number> {
  const [{ n }] = await getDb().select({ n: count() }).from(indiePosts).where(eq(indiePosts.authorUserId, userId));
  return n;
}

/** 글쓴이의 공개 라운지 글(개발일지, 질문 피드백) 최신순 */
export async function listAuthorLoungePosts(authorUserId: string, limit: number): Promise<PostRowDto[]> {
  const rows = await getDb()
    .select(rowColumns)
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorUserId))
    .where(and(eq(posts.authorUserId, authorUserId), eq(posts.status, "published"), inArray(posts.category, [...LOUNGE_CATEGORIES])))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
  return rows.map(toRow);
}
