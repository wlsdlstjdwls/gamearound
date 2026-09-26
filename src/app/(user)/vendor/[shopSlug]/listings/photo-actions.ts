"use server";
// 판매 줄 사진 Server Action — 올린 뒤 등록, 지우기. 설계서 §4.
//
// 판매 목록 액션(actions.ts)과 파일을 가른 이유: 사진은 Blob 저장소와 오가는 별개 흐름이고,
// 한 파일에 두면 곧 300줄을 넘는다(AGENTS §4). 권한 앞머리는 같은 것을 쓴다(server/auth/shop-access).
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { shopPath, vendorListingsPath } from "@/lib/routes";
import { PHOTO_MESSAGES } from "@/lib/shops/listing-messages";
import { photoRegisterSchema } from "@/lib/shops/photo";
import { openShopForAction } from "@/server/auth/shop-access";
import { registerListingPhoto, removeListingPhoto } from "@/server/services/listings";

export type PhotoResult = { ok: true } | { ok: false; error: string };

function openShop(shopSlug: string) {
  return openShopForAction(shopSlug, PHOTO_MESSAGES.forbidden, "owner", "manager", "staff");
}

function refresh(shopSlug: string): void {
  revalidatePath(vendorListingsPath(shopSlug));
  revalidatePath(shopPath(shopSlug));
}

function fail(e: unknown): PhotoResult {
  // 권한 없음, 세션 만료 이동을 오류 문구로 삼키지 않는다(staff/actions 의 fail 주석)
  unstable_rethrow(e);
  return { ok: false, error: e instanceof Error ? e.message : PHOTO_MESSAGES.failed };
}

/** Blob 에 올린 사진을 판매 줄에 적는다. 주소를 믿지 않고 서비스가 저장소에 되묻는다 */
export async function registerPhotoAction(
  shopSlug: string,
  input: { listingId: string; url: string; pathname: string; width: number; height: number },
): Promise<PhotoResult> {
  try {
    const { shop, actor } = await openShop(shopSlug);
    const parsed = photoRegisterSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: PHOTO_MESSAGES.failed };
    await registerListingPhoto(shop.id, parsed.data, actor);
    refresh(shopSlug);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removePhotoAction(shopSlug: string, photoId: string): Promise<PhotoResult> {
  try {
    const { shop } = await openShop(shopSlug);
    await removeListingPhoto(photoId, shop.id);
    refresh(shopSlug);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
