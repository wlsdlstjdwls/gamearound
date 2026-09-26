// 판매 줄 사진 — 목록, 등록, 지우기. 설계서 §4 shop_listing_photos.
//
// 파일은 Vercel Blob(공개 저장소)에 있고 이 표는 주소만 쥔다. 업로드는 브라우저가 Blob 으로 곧장 보낸다
// (api/shops/photos/upload 가 토큰만 내준다). 그래서 등록할 때 **파일이 정말 우리 저장소에 있는지** head 로 한 번 본다 —
// 브라우저가 보낸 주소를 그대로 믿으면 아무 이미지 주소나 우리 매장 사진으로 적힌다.
//
// 표 행을 지울 때 Blob 파일도 같이 지운다. cascade 는 행만 지우고 파일은 남긴다 — 남은 파일은 아무도 안 보는데 저장비만 먹는다.
import "server-only";
import { del, head } from "@vercel/blob";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { shopListingPhotos, shopListings } from "@/server/db/schema";
import { createdBy, type AuditSource } from "@/server/db/audit";
import { LISTING_PHOTO_MAX, PHOTO_CONTENT_TYPES } from "@/lib/shops/constants";
import { PHOTO_MESSAGES } from "@/lib/shops/listing-messages";
import { isOwnPhotoPath, type PhotoRegisterInput } from "@/lib/shops/photo";

/** 화면이 쓰는 사진 한 장. Drizzle 행 타입을 화면까지 흘리지 않는다(AGENTS §1) */
export type ListingPhotoDto = { id: string; url: string; width: number; height: number };

/** 판매 줄 여럿의 사진을 한 번에. 매장주 판매 목록이 줄마다 묻지 않게 한다 */
export async function listPhotosForListings(listingIds: string[]): Promise<Record<string, ListingPhotoDto[]>> {
  if (listingIds.length === 0) return {};
  const rows = await getDb()
    .select({
      id: shopListingPhotos.id,
      listingId: shopListingPhotos.listingId,
      url: shopListingPhotos.url,
      width: shopListingPhotos.width,
      height: shopListingPhotos.height,
    })
    .from(shopListingPhotos)
    .where(inArray(shopListingPhotos.listingId, listingIds))
    .orderBy(asc(shopListingPhotos.sortOrder), asc(shopListingPhotos.createdAt));
  const out: Record<string, ListingPhotoDto[]> = {};
  for (const { listingId, ...photo } of rows) (out[listingId] ??= []).push(photo);
  return out;
}

/** 이 판매 줄이 이 매장 것인가. 토큰 발급과 등록이 같이 쓴다 — 남의 판매 줄에 사진을 붙이는 길을 막는다 */
export async function isListingInShop(listingId: string, shopId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: shopListings.id })
    .from(shopListings)
    .where(and(eq(shopListings.id, listingId), eq(shopListings.shopId, shopId)))
    .limit(1);
  return rows.length > 0;
}

export async function countListingPhotos(listingId: string): Promise<number> {
  const rows = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(shopListingPhotos)
    .where(eq(shopListingPhotos.listingId, listingId));
  return rows[0]?.n ?? 0;
}

/**
 * 올린 사진을 적는다. 권한(매장 직원인가)은 호출부가 봤다 — 여기는 판매 줄, 경로, 파일 셋을 본다.
 *
 * 장수 상한은 토큰 발급 때도 보지만 여기서 다시 본다. 토큰을 여러 장 먼저 받아 두고 한꺼번에 올리면
 * 발급 때의 셈은 전부 "아직 7장" 이다.
 */
export async function registerListingPhoto(shopId: string, input: PhotoRegisterInput, actor: { source: AuditSource; userId?: string }): Promise<void> {
  if (!isOwnPhotoPath(input.pathname, shopId, input.listingId)) throw new Error(PHOTO_MESSAGES.forbidden);
  if (!(await isListingInShop(input.listingId, shopId))) throw new Error(PHOTO_MESSAGES.forbidden);

  // 우리 저장소 토큰으로 묻는다 — 남의 주소면 여기서 떨어진다
  const blob = await head(input.pathname).catch(() => null);
  if (!blob || blob.url !== input.url || !(PHOTO_CONTENT_TYPES as readonly string[]).includes(blob.contentType)) {
    throw new Error(PHOTO_MESSAGES.failed);
  }

  const count = await countListingPhotos(input.listingId);
  if (count >= LISTING_PHOTO_MAX) {
    // 상한을 넘긴 파일은 적지 않고 저장소에서도 치운다
    await del(blob.url).catch(() => undefined);
    throw new Error(PHOTO_MESSAGES.full(LISTING_PHOTO_MAX));
  }

  await getDb()
    .insert(shopListingPhotos)
    .values({
      listingId: input.listingId,
      url: blob.url,
      pathname: blob.pathname,
      width: input.width,
      height: input.height,
      byteSize: blob.size,
      sortOrder: count,
      ...createdBy(actor.source, actor.userId),
    })
    // 같은 파일 등록이 두 번 오면(되누르기, 재시도) 한 줄로 둔다
    .onConflictDoNothing();
}

/** 사진 한 장 지우기. shopId 를 조건에 넣는다 — 폼에 남의 사진 id 를 박아 보내는 길을 질의가 막는다 */
export async function removeListingPhoto(photoId: string, shopId: string): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ id: shopListingPhotos.id, url: shopListingPhotos.url })
    .from(shopListingPhotos)
    .innerJoin(shopListings, eq(shopListings.id, shopListingPhotos.listingId))
    .where(and(eq(shopListingPhotos.id, photoId), eq(shopListings.shopId, shopId)))
    .limit(1);
  const photo = rows[0];
  if (!photo) throw new Error(PHOTO_MESSAGES.notFound);
  await db.delete(shopListingPhotos).where(eq(shopListingPhotos.id, photo.id));
  await deleteBlobs([photo.url]);
}

/**
 * Blob 파일 지우기. 실패해도 던지지 않는다 — 행은 이미 지웠고, 파일 하나가 남는 것이
 * 지우기 버튼이 오류를 내는 것보다 낫다. 남은 파일은 `vercel blob list` 로 경로 접두를 보고 치운다.
 */
export async function deleteBlobs(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  await del(urls).catch((e) => console.error("[photos] blob 지우기 실패", urls.length, e));
}

/** 판매 줄을 내리기 전에 부른다 — cascade 가 행은 지우지만 파일은 못 지운다 */
export async function listPhotoUrls(listingId: string): Promise<string[]> {
  const rows = await getDb().select({ url: shopListingPhotos.url }).from(shopListingPhotos).where(eq(shopListingPhotos.listingId, listingId));
  return rows.map((r) => r.url);
}
