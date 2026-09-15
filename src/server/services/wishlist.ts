// wishlist 서비스 (§5.2 Server Action에서 호출). 계약:
//  - isInWishlist(gameId): 현재 로그인 사용자가 찜했는지. 비로그인 → false
//  - toggleWishlist(gameId): 찜 토글, 결과 상태 반환
//  - removeFromWishlist(gameId): 찜 해제(목록 페이지 삭제 버튼용)
//  - listWishlist(): 현재 사용자 찜 목록(게임 + 플랫폼 가격 포함)
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { wishlists, type games, type gamePlatforms } from "@/server/db/schema";
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
