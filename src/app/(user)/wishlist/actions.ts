"use server";
// 위시리스트 Server Action (§5.2). 서비스 내부에서 requireUser()로 auth 재검증(§6).
import { actionError } from "@/lib/db-errors";
import { ACTION_MESSAGES } from "@/lib/messages";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cardSlugSchema } from "@/lib/wishlist/schemas";
import { getCurrentUser } from "@/server/services/users";
import { isInWishlist, removeFromWishlist, toggleWishlist, toggleWishlistBySlug, wishedSlugs, WISHED_SLUGS_MAX } from "@/server/services/wishlist";

const gameIdSchema = z.uuid();
const slugSchema = cardSlugSchema;
const slugsSchema = z.array(slugSchema).max(WISHED_SLUGS_MAX);

/**
 * 찜 토글의 답. saleAlerts 는 이 사람이 찜 할인 알림을 켜 뒀는가(users.wishSaleAlertsOffAt) — 담은 순간의 토스트가
 * "할인하면 알려 드려요" 를 말할지 정한다(2026-10-30 사용자: "사용자에게 알려 주긴 해야 될 듯"). 꺼 둔 사람에게 그 말을 하면 거짓말이다
 */
export type WishToggleResult = { ok: true; wished: boolean; saleAlerts: boolean } | { ok: false; error: string };

async function saleAlertsOn(): Promise<boolean> {
  const me = await getCurrentUser().catch(() => null);
  return me !== null && me.wishSaleAlertsOffAt === null;
}

/** 상세 페이지 찜 버튼(P3)이 호출 */
export async function toggleWishlistAction(gameId: string): Promise<WishToggleResult> {
  const parsed = gameIdSchema.safeParse(gameId);
  if (!parsed.success) return { ok: false, error: "잘못된 게임 ID입니다" };
  try {
    const [r, saleAlerts] = await Promise.all([toggleWishlist(parsed.data), saleAlertsOn()]);
    revalidatePath("/wishlist");
    return { ok: true, wished: r.wished, saleAlerts };
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

/** 카드 하트들의 찜 여부를 한 번에(components/wish-heart). 비로그인, 실패는 빈 배열 — 하트가 빈 채로 선다 */
export async function wishedSlugsAction(slugs: string[]): Promise<string[]> {
  const parsed = slugsSchema.safeParse(slugs);
  if (!parsed.success) return [];
  return wishedSlugs(parsed.data).catch(() => []);
}

/** 카드 하트의 토글 */
export async function toggleWishBySlugAction(slug: string): Promise<WishToggleResult> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { ok: false, error: "잘못된 게임입니다" };
  try {
    const [r, saleAlerts] = await Promise.all([toggleWishlistBySlug(parsed.data), saleAlertsOn()]);
    revalidatePath("/wishlist");
    return { ok: true, wished: r.wished, saleAlerts };
  } catch (e) {
    return { ok: false, error: actionError(e, ACTION_MESSAGES.failed) };
  }
}
