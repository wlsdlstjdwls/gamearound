"use server";
// 판매 목록 Server Action — zod 로 검증하고 서비스로 넘긴다.
//
// 매장 권한을 여기서 다시 본다. 레이아웃이 로그인을 봤다는 것은 "사람인가" 까지만 답한 것이고,
// **남의 매장** 은 그것으로 안 막힌다 — 폼에 남의 shopId 를 박아 보내는 것이 이 도메인의 첫 공격이다
// (guards 의 requireShopRole 주석, 설계서 §10).
import { revalidatePath } from "next/cache";
import { vendorListingsPath, shopPath } from "@/lib/routes";
import { LISTING_MESSAGES } from "@/lib/shops/listing-messages";
import { listingCreateSchema, listingRemoveSchema, listingStockSchema } from "@/lib/shops/listing-schemas";
import { requireShopRole } from "@/server/auth/guards";
import { findShopBySlug } from "@/server/services/shops";
import { createListing, removeListing, updateListingStock } from "@/server/services/listings";

export type ListingState = { ok: true; message: string } | { ok: false; error: string } | null;

/**
 * slug 로 매장을 찾고 권한까지 확인한다. 세 액션이 같은 앞머리를 쓴다 —
 * 한 군데만 빠져도 그 액션 하나가 남의 매장에 열린다.
 *
 * 관리자가 대신 고친 일은 감사 컬럼에 `admin` 으로 남는다. 매장이 고친 일은 `shop:{id}` 다 —
 * 나중에 "내가 안 했는데" 라는 말이 나올 때 답이 되는 것이 그 한 줄이다(설계서 §10).
 */
async function openShop(shopSlug: string) {
  const shop = await findShopBySlug(shopSlug);
  if (!shop) throw new Error(LISTING_MESSAGES.notFound);
  const access = await requireShopRole(shop.id, "owner", "manager", "staff");
  return {
    shop,
    actor: access.isAdminOverride
      ? ({ source: "admin" as const, userId: access.user.id })
      : ({ source: `shop:${shop.id}` as const, userId: access.user.id }),
  };
}

/** 고친 값이 손님 화면에도 바로 보여야 한다 — 매장 페이지가 캐시를 안 쓰므로 경로만 밀어 준다 */
function refresh(shopSlug: string): void {
  revalidatePath(vendorListingsPath(shopSlug));
  revalidatePath(shopPath(shopSlug));
}

export async function createListingAction(shopSlug: string, _prev: ListingState, formData: FormData): Promise<ListingState> {
  try {
    const { shop, actor } = await openShop(shopSlug);
    const text = (name: string) => String(formData.get(name) ?? "").trim();
    const parsed = listingCreateSchema.safeParse({
      shopId: shop.id,
      name: text("name"),
      barcode: text("barcode"),
      hardwareCode: text("hardwareCode"),
      // 빈 문자열을 그대로 넘기면 uuid 검증에 걸린다. "안 골랐다" 는 undefined 로 말한다
      gameId: text("gameId") || undefined,
      condition: text("condition") || "used",
      priceMinor: text("priceMinor") || "0",
      onHand: text("onHand") || "0",
      status: text("status") || "draft",
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? LISTING_MESSAGES.badRequest };

    await createListing(parsed.data, actor);
    refresh(shopSlug);
    return { ok: true, message: LISTING_MESSAGES.added };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : LISTING_MESSAGES.badRequest };
  }
}

export async function updateStockAction(shopSlug: string, _prev: ListingState, formData: FormData): Promise<ListingState> {
  try {
    const { shop, actor } = await openShop(shopSlug);
    const parsed = listingStockSchema.safeParse({
      listingId: String(formData.get("listingId") ?? ""),
      onHand: String(formData.get("onHand") ?? ""),
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? LISTING_MESSAGES.badRequest };

    await updateListingStock(parsed.data, shop.id, actor);
    refresh(shopSlug);
    return { ok: true, message: LISTING_MESSAGES.saved };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : LISTING_MESSAGES.badRequest };
  }
}

export async function removeListingAction(shopSlug: string, _prev: ListingState, formData: FormData): Promise<ListingState> {
  try {
    const { shop } = await openShop(shopSlug);
    const parsed = listingRemoveSchema.safeParse({ listingId: String(formData.get("listingId") ?? "") });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? LISTING_MESSAGES.badRequest };

    await removeListing(parsed.data.listingId, shop.id);
    refresh(shopSlug);
    return { ok: true, message: LISTING_MESSAGES.removed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : LISTING_MESSAGES.badRequest };
  }
}
