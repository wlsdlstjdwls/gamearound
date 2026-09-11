"use server";
// 위시리스트 Server Action (§5.2). 서비스 내부에서 requireUser()로 auth 재검증(§6).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { removeFromWishlist, toggleWishlist } from "@/server/services/wishlist";

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
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
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
    return { ok: false, error: e instanceof Error ? e.message : "실패" };
  }
}
