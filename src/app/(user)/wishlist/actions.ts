"use server";
// 위시리스트 Server Action (§5.2). 서비스 내부에서 requireUser()로 auth 재검증(§6).
import { actionError } from "@/lib/db-errors";
import { ACTION_MESSAGES } from "@/lib/messages";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isInWishlist, removeFromWishlist, toggleWishlist } from "@/server/services/wishlist";

const gameIdSchema = z.uuid();

/** 상세 페이지 찜 버튼(P3)이 호출. 반환형 유지 */
export async function toggleWishlistAction(gameId: string): Promise<{ ok: true; wished: boolean } | { ok: false; error: string }> {
  const parsed = gameIdSchema.safeParse(gameId);
  if (!parsed.success) return { ok: false, error: "잘못된 게임 ID입니다" };
  try {
    const r = await toggleWishlist(parsed.data);
    revalidatePath("/wishlist");
    return { ok: true, wished: r.wished };
  } catch (e) {
    return { ok: false, error: actionError(e, ACTION_MESSAGES.failed) };
  }
}

/** /wishlist 목록의 삭제 버튼 */
export async function removeFromWishlistAction(gameId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = gameIdSchema.safeParse(gameId);
  if (!parsed.success) return { ok: false, error: "잘못된 게임 ID입니다" };
  try {
    await removeFromWishlist(parsed.data);
    revalidatePath("/wishlist");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, ACTION_MESSAGES.failed) };
  }
}

/**
 * 찜 여부(2026-10-26). 상세 화면은 게임 단위로 캐시돼 사람마다 다른 값을 서버가 그려 줄 수 없다 —
 * 버튼이 마운트 뒤 이걸로 묻는다. 비로그인, 실패는 "안 찜함" 이다(누르면 로그인 팝업이 먼저 뜬다)
 */
export async function isWishedAction(gameId: string): Promise<boolean> {
  const parsed = gameIdSchema.safeParse(gameId);
  if (!parsed.success) return false;
  return isInWishlist(parsed.data).catch(() => false);
}
