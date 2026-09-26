// 판매 줄 쓰기 — 올리기, 재고 고치기, 내리기. 설계서 §4, §8, §12.5.
//
// 손입력과 CSV 가 이 파일의 **같은 함수**를 지난다(설계서 §8). 갈리면 재고 이력이 한쪽에만 남는다.
import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { productComponents, products, shopListings, shopStockEvents, type ListingSource } from "@/server/db/schema";
import { createdBy, updatedBy, type AuditSource } from "@/server/db/audit";
import { LISTING_MESSAGES } from "@/lib/shops/listing-messages";
import { normalizeBarcode, type ListingCreateInput, type ListingStockInput } from "@/lib/shops/listing-schemas";
import { deleteBlobs, listPhotoUrls } from "./photos";

/**
 * 상품을 찾거나 만든다.
 *
 * 바코드가 있으면 그것이 자연키다(§4) — 다른 매장이 이미 만든 상품이면 그 행에 붙는다.
 * 바코드가 없으면 매번 새 상품을 만든다. 이름만으로 같은 물건이라고 단정하지 않는다 —
 * "젤다의 전설" 이라는 이름은 기종도 지역도 에디션도 다른 물건 수십 개가 함께 쓴다.
 */
async function findOrCreateProduct(input: ListingCreateInput, actor: { source: AuditSource; userId?: string }): Promise<string> {
  const db = getDb();
  const barcode = input.barcode ? normalizeBarcode(input.barcode) : "";
  if (barcode) {
    const hit = await db.select({ id: products.id }).from(products).where(eq(products.barcode, barcode)).limit(1);
    if (hit[0]) return hit[0].id;
  }
  const [row] = await db
    .insert(products)
    .values({
      name: input.name,
      barcode: barcode || null,
      gameId: input.gameId ?? null,
      hardwareCode: input.hardwareCode || null,
      registeredShopId: input.shopId,
      ...createdBy(actor.source, actor.userId),
    })
    .returning({ id: products.id });

  // 게임을 이었으면 구성품 한 줄을 같이 남긴다 — "파는 곳" 질의가 보는 것이 이 표다.
  // 여기서 안 남기면 상품은 게임을 가리키는데 게임 화면에는 안 뜨는 조용한 어긋남이 생긴다
  if (input.gameId) {
    await db
      .insert(productComponents)
      .values({ productId: row.id, kind: "game", gameId: input.gameId, ...createdBy(actor.source, actor.userId) });
  }
  return row.id;
}

/**
 * 물건 하나 올리기. 상품과 판매 줄을 한 번에 만든다(listing-schemas 의 listingCreateSchema 주석).
 * 손입력과 CSV 가 **같은 함수**를 지난다(설계서 §8) — 갈리면 재고 이력이 한쪽에만 남는다. `via` 가 그 경로다.
 *
 * 같은 매장이 같은 상품, 같은 상태를 두 줄로 올리는 것은 DB 가 막는다
 * (`shop_listings_shop_product_condition_uq`). 막힌 것을 사람이 읽을 문장으로 바꿔 던진다.
 */
export async function createListing(
  input: ListingCreateInput,
  actor: { source: AuditSource; userId?: string },
  via: ListingSource = "manual",
): Promise<string> {
  const db = getDb();
  const productId = await findOrCreateProduct(input, actor);
  const now = new Date();
  try {
    const [row] = await db
      .insert(shopListings)
      .values({
        shopId: input.shopId,
        productId,
        condition: input.condition,
        priceMinor: input.priceMinor,
        onHand: input.onHand,
        status: input.status,
        stockUpdatedAt: now,
        source: via,
        ...createdBy(actor.source, actor.userId),
      })
      .returning({ id: shopListings.id });
    // 재고 이력은 A 단계부터 돈다(§12.5). 첫 줄도 0 에서 시작한 움직임이다 —
    // 안 남기면 "처음부터 3개였나 나중에 3개가 됐나" 에 답할 수 없다
    await db.insert(shopStockEvents).values({
      listingId: row.id,
      beforeQty: 0,
      afterQty: input.onHand,
      reason: via,
      ...createdBy(actor.source, actor.userId),
    });
    return row.id;
  } catch (e) {
    if (String(e).includes("shop_listings_shop_product_condition_uq")) throw new Error(LISTING_MESSAGES.duplicate);
    throw e;
  }
}

/**
 * 재고만 고친다. 값이 실제로 달라질 때만 쓴다 — 안 바뀐 행의 시각을 움직이지 않는다(AGENTS §7).
 *
 * 매장 확인은 호출부(서버 액션)가 이미 했다. 그래도 shopId 를 조건에 함께 넣는다 —
 * 폼에 남의 listingId 를 박아 보내는 것이 이 도메인의 첫 공격이고, 마지막 방어선은 질의다.
 */
export async function updateListingStock(
  input: ListingStockInput,
  shopId: string,
  actor: { source: AuditSource; userId?: string },
): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ id: shopListings.id, onHand: shopListings.onHand })
    .from(shopListings)
    .where(and(eq(shopListings.id, input.listingId), eq(shopListings.shopId, shopId)))
    .limit(1);
  const cur = rows[0];
  if (!cur) throw new Error(LISTING_MESSAGES.notFound);
  if (cur.onHand === input.onHand) return;

  await db.batch([
    db
      .update(shopListings)
      .set({ onHand: input.onHand, stockUpdatedAt: new Date(), ...updatedBy(actor.source, actor.userId) })
      .where(eq(shopListings.id, cur.id)),
    db.insert(shopStockEvents).values({
      listingId: cur.id,
      beforeQty: cur.onHand,
      afterQty: input.onHand,
      reason: "manual",
      ...createdBy(actor.source, actor.userId),
    }),
  ]);
}

/**
 * 판매 줄 내리기. 행을 지운다 — 상품(products)은 매장끼리 공유하는 자산이라 남긴다.
 *
 * 재고 이력은 `on delete cascade` 로 함께 사라진다. 이력을 지키려면 줄을 숨김으로 돌리는 쪽이
 * 맞지만, 그러면 "잘못 올린 줄" 을 치울 방법이 매장에 없다. 치우는 길과 숨기는 길을 둘 다 둔다.
 */
export async function removeListing(listingId: string, shopId: string): Promise<void> {
  const db = getDb();
  // 사진 행은 cascade 로 함께 사라지지만 Blob 파일은 남는다 — 주소를 먼저 받아 두고, 줄이 실제로 지워졌을 때만 치운다
  const photoUrls = await listPhotoUrls(listingId);
  const result = await db
    .delete(shopListings)
    .where(and(eq(shopListings.id, listingId), eq(shopListings.shopId, shopId)))
    .returning({ id: shopListings.id });
  if (result.length === 0) throw new Error(LISTING_MESSAGES.notFound);
  await deleteBlobs(photoUrls);
}
