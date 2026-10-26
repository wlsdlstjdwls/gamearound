// wishlist 서비스 (§5.2 Server Action에서 호출). 계약:
//  - isInWishlist(gameId): 현재 로그인 사용자가 찜했는지. 비로그인 → false
//  - toggleWishlist(gameId): 찜 토글, 결과 상태 반환
//  - removeFromWishlist(gameId): 찜 해제(목록 페이지 삭제 버튼용)
//  - listWishlist(): 현재 사용자 찜 목록(게임 + 플랫폼 가격 포함)
//  - wishedSlugs(slugs): 카드 하트용. 한 화면의 카드들이 한 번에 묻는다(slug 로 묻는 이유는 아래 주석)
//  - toggleWishlistBySlug(slug): 카드 하트 토글
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { games, wishlists, type gamePlatforms } from "@/server/db/schema";
import { getCurrentUser, requireUser } from "@/server/services/users";
import { ownedByCurrentSession } from "@/server/auth/session";
import { AUTH_MESSAGES } from "@/lib/auth/messages";

export type WishlistGame = typeof games.$inferSelect & { platforms: (typeof gamePlatforms.$inferSelect)[] };
export type WishlistItem = { gameId: string; createdAt: Date; game: WishlistGame };

export async function isInWishlist(gameId: string): Promise<boolean> {
  const u = await getCurrentUser();
  if (!u) return false;
  const row = await getDb().query.wishlists.findFirst({
    where: and(eq(wishlists.userId, u.id), eq(wishlists.gameId, gameId)),
  });
  return Boolean(row);
}

export async function toggleWishlist(gameId: string): Promise<{ wished: boolean }> {
  const u = await requireUser();
  const db = getDb();
  const existing = await db.query.wishlists.findFirst({
    where: and(eq(wishlists.userId, u.id), eq(wishlists.gameId, gameId)),
  });
  if (existing) {
    await db.delete(wishlists).where(and(eq(wishlists.userId, u.id), eq(wishlists.gameId, gameId)));
    return { wished: false };
  }
  await db.insert(wishlists).values({ userId: u.id, gameId }).onConflictDoNothing();
  return { wished: true };
}

/** 찜 해제. 소유자(userId) 조건이 WHERE에 포함되므로 타인 행은 건드릴 수 없음 */
export async function removeFromWishlist(gameId: string): Promise<void> {
  const u = await requireUser();
  await getDb().delete(wishlists).where(and(eq(wishlists.userId, u.id), eq(wishlists.gameId, gameId)));
}

/**
 * 현재 사용자의 찜 목록. 최근 찜한 순. 게임의 플랫폼별 가격 포함.
 *
 * requireUser() 를 쓰지 않는 이유는 왕복 수다 — 그러면 세션 조회를 기다린 뒤에야 목록 질의가
 * 나가 화면이 왕복 2회(약 440ms)를 기다린다. 소유자 조건을 세션 서브질의로 바꿔 한 왕복에 끝낸다.
 * 근거는 currentUserIdSql 주석.
 */
export async function listWishlist(): Promise<WishlistItem[]> {
  const owner = await ownedByCurrentSession(wishlists.userId);
  if (!owner) throw new Error(AUTH_MESSAGES.loginRequired);
  const rows = await getDb().query.wishlists.findMany({
    where: owner,
    orderBy: [desc(wishlists.createdAt)],
    with: { game: { with: { platforms: true } } },
  });
  return rows.map((r) => ({ gameId: r.gameId, createdAt: r.createdAt, game: r.game }));
}

/** 한 번에 묻는 카드 수 상한. 화면 하나의 카드(목록 24장 + 홈 줄들)를 넉넉히 넘는다 — 아무 배열이나 받지 않으려는 문턱이다 */
export const WISHED_SLUGS_MAX = 120;

/**
 * 이 slug 들 가운데 현재 사용자가 찜한 것. 비로그인이면 빈 배열.
 * slug 로 받는 이유: 카드 DTO(GameSummary)는 id 를 싣지 않는다 — id 를 더하면 캐시된 홈, 목록 DTO 판을 통째로 올려야 한다.
 * 왕복은 하나다(세션 서브질의 + 조인).
 */
export async function wishedSlugs(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const owner = await ownedByCurrentSession(wishlists.userId);
  if (!owner) return [];
  const rows = await getDb()
    .select({ slug: games.slug })
    .from(wishlists)
    .innerJoin(games, eq(games.id, wishlists.gameId))
    .where(and(owner, inArray(games.slug, slugs.slice(0, WISHED_SLUGS_MAX))));
  return rows.map((r) => r.slug);
}

/** 카드 하트의 토글. slug 를 id 로 풀어 기존 토글을 그대로 탄다 */
export async function toggleWishlistBySlug(slug: string): Promise<{ wished: boolean }> {
  const row = await getDb().query.games.findFirst({ where: eq(games.slug, slug), columns: { id: true } });
  if (!row) throw new Error("게임을 찾지 못했어요");
  return toggleWishlist(row.id);
}
