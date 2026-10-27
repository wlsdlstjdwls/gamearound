// 게임 하나에 이어진 게시판 글 수(posts.game_id). 게임 상세의 "이 게임 글" 링크가 쓴다(2026-10-27 사용자 검수:
// 게시판에서 게임으로 가는 길은 있는데 게임에서 그 게임 글로 가는 길이 없었다).
// 보이는 글(published)만, 게임을 잇는 카테고리(리뷰, 공략, 홍보)만 센다 — 게시판 목록의 game 거름(posts.ts)과 같은 범위라
// "N개" 를 누르고 들어간 목록의 글 수가 같다. index.ts 를 거치지 않고 바로 import 한다(다른 묶음이 같은 파일을 고치는 중이었다).
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { posts } from "@/server/db/schema";
import { GAME_LINK_CATEGORIES } from "@/lib/community/constants";

export async function countGamePosts(gameId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(posts)
    .where(and(eq(posts.gameId, gameId), eq(posts.status, "published"), inArray(posts.category, [...GAME_LINK_CATEGORIES])));
  return row?.n ?? 0;
}
