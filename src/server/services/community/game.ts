// 글 상세의 관련 게임 카드(기획서 v2.0 S-15 "관련 게임"). 글에서 가격 비교로 넘어가는 길이라 이름만이 아니라
// 커버, 현재 최저가, 할인율을 같이 싣는다 — 값을 보고 눌러야 "이 게임 지금 얼마지?" 가 한 번에 풀린다.
// 카드 모양은 목록과 같은 GameSummary 를 쓴다(games/mappers 의 attachBestPrice). 따로 만들면 최저가 고르는 규칙이 둘이 된다.
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { games, posts } from "@/server/db/schema";
import type { GameSummary } from "@/server/services/games";
import { attachBestPrice } from "@/server/services/games/mappers";

/** 글에 붙은 게임의 카드. 게임이 없거나 지워졌으면 null */
export async function getPostGameCard(postId: string): Promise<GameSummary | null> {
  const db = getDb();
  const [row] = await db
    .select({ game: games })
    .from(posts)
    .innerJoin(games, eq(games.id, posts.gameId))
    .where(eq(posts.id, postId));
  if (!row) return null;
  const [card] = await attachBestPrice([row.game]);
  return card ?? null;
}
