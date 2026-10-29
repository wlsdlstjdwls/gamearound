// 인디 게임 찜을 "찜 목록" 쪽에서 읽는 자리(2026-10-29) — 목록 카드 하트와 /wishlist 의 인디 칸.
//
// 인디 찜은 스토어 게임 찜(wishlists)과 다른 표(indie_post_likes)에 담긴다. 찜 수가 명예의 전당, 슈퍼루키 점수의 재료라
// 글마다 쌓는 수(likeCount)와 같이 움직여야 해서다(fame.ts 의 toggleIndieLike). 표를 합치지 않고 읽는 쪽에서 두 칸으로 보여 준다.
// 왕복은 하나씩이다 — 소유자 조건을 세션 서브질의로 건다(services/wishlist 의 listWishlist 주석과 같은 이유).
import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { indiePostLikes, indiePosts } from "@/server/db/schema";
import { ownedByCurrentSession } from "@/server/auth/session";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { INDIE_WISHED_SLUGS_MAX } from "@/lib/indie/constants";
import type { IndieCardDto } from "@/lib/indie/dto";
import { WISHLIST_MESSAGES } from "@/lib/wishlist/messages";
import { cardColumns, isPublic, toCards } from "./read";
import { toggleIndieLike } from "./fame";

/** 이 slug 들 가운데 현재 사용자가 찜한 것. 비로그인이면 빈 배열(카드 하트가 한 번에 묻는다, components/wish-store) */
export async function likedIndieSlugs(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const owner = await ownedByCurrentSession(indiePostLikes.userId);
  if (!owner) return [];
  const rows = await getDb()
    .select({ slug: indiePosts.slug })
    .from(indiePostLikes)
    .innerJoin(indiePosts, eq(indiePosts.id, indiePostLikes.postId))
    .where(and(owner, inArray(indiePosts.slug, slugs.slice(0, INDIE_WISHED_SLUGS_MAX))));
  return rows.map((r) => r.slug);
}

/** 카드 하트의 토글. 카드 DTO 는 id 를 싣지 않아 slug 로 받는다 — 공개 글만 찜할 수 있다(상세의 찜 단추도 승인된 글에만 선다) */
export async function toggleIndieLikeBySlug(slug: string): Promise<{ liked: boolean; likeCount: number }> {
  const [row] = await getDb().select({ id: indiePosts.id }).from(indiePosts).where(and(eq(indiePosts.slug, slug), isPublic)).limit(1);
  if (!row) throw new Error(WISHLIST_MESSAGES.notFound);
  return toggleIndieLike(row.id);
}

/**
 * 내가 찜한 인디 게임 카드, 최근 찜한 순. 지금 공개가 아닌 글(내려가거나 숨겨진 글)은 뺀다 — 눌러도 상세가 열리지 않는다.
 * 찜 행은 지우지 않는다: 글이 다시 공개되면 그대로 돌아온다.
 */
export async function listMyIndieWishes(): Promise<IndieCardDto[]> {
  const owner = await ownedByCurrentSession(indiePostLikes.userId);
  if (!owner) throw new Error(AUTH_MESSAGES.loginRequired);
  const rows = await getDb()
    .select(cardColumns)
    .from(indiePostLikes)
    .innerJoin(indiePosts, eq(indiePosts.id, indiePostLikes.postId))
    .where(and(owner, isPublic))
    .orderBy(desc(indiePostLikes.createdAt));
  return toCards(rows);
}
