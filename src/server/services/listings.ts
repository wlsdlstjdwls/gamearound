// 상품, 재고 서비스 — 설계서 `docs/기획_매장_상품관리_회원_2026-09-17.md` §4, §12.
//
// 이 계층이 답하는 것 셋: "이 매장이 무엇을 파나", "이 게임을 파는 곳이 어디인가",
// "재고가 몇 개 남았나". 라우트는 SQL 을 직접 쓰지 않는다(AGENTS §1).
//
// 재고는 언제나 `available = onHand - held` 를 거쳐 낸다(§12.1). A 단계에서 held 는 늘 0 이지만
// 계산을 여기 한 곳에 두어야 예약이 붙는 날 화면이 한 줄도 안 바뀐다.
import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  hardwareModels,
  productComponents,
  products,
  shopListings,
  shopStockEvents,
  shops,
  type ListingCondition,
  type ListingStatus,
} from "@/server/db/schema";
import { createdBy, updatedBy, type AuditSource } from "@/server/db/audit";
import { LISTING_MESSAGES } from "@/lib/shops/listing-messages";
import { normalizeBarcode, type ListingCreateInput, type ListingStockInput } from "@/lib/shops/listing-schemas";
import { SELLING_PAGE_SIZE } from "@/lib/shops/constants";

/** 화면이 쓰는 판매 줄. Drizzle 행 타입을 화면까지 흘리지 않는다(AGENTS §1) */
export type ListingDto = {
  id: string;
  productId: string;
  productName: string;
  barcode: string | null;
  hardwareNameKo: string | null;
  condition: ListingCondition;
  status: ListingStatus;
  priceMinor: number;
  currency: string;
  onHand: number;
  /** 언제나 onHand - held. 화면은 이 값만 본다(§12.1) */
  available: number;
};

/** 게임 상세의 "파는 곳" 한 줄 — 매장과 그 매장이 매긴 값 */
export type SellerDto = {
  shopSlug: string;
  shopName: string;
  address: string | null;
  condition: ListingCondition;
  priceMinor: number;
  currency: string;
  available: number;
};

/** 기종 고르기 목록. 상품 폼이 쓴다 */
export async function listHardwareModels(): Promise<Array<{ code: string; nameKo: string; isRetro: boolean }>> {
  const rows = await getDb()
    .select({ code: hardwareModels.code, nameKo: hardwareModels.nameKo, isRetro: hardwareModels.isRetro })
    .from(hardwareModels)
    .orderBy(asc(hardwareModels.sortOrder), asc(hardwareModels.code));
  return rows;
}

/** 공통 select 모양. 매장주 목록과 공개 목록이 같은 열을 읽는다 — 갈라 적으면 한쪽만 고쳐진다 */
const listingColumns = {
  id: shopListings.id,
  productId: shopListings.productId,
  productName: products.name,
  barcode: products.barcode,
  hardwareNameKo: hardwareModels.nameKo,
  condition: shopListings.condition,
  status: shopListings.status,
  priceMinor: shopListings.priceMinor,
  currency: shopListings.currency,
  onHand: shopListings.onHand,
  held: shopListings.held,
};

/** 질의가 돌려주는 날것. DTO 에서 계산 필드를 빼고 held 를 더한 모양과 같다 */
type ListingRow = Omit<ListingDto, "available"> & { held: number };

function toListing(r: ListingRow): ListingDto {
  const { held, ...rest } = r;
  // 음수는 화면에 내지 않는다 — held 가 onHand 를 넘는 순간(예약 뒤 재고 정정)이 실제로 생긴다
  return { ...rest, available: Math.max(r.onHand - held, 0) };
}

/** 매장주가 보는 판매 목록. 작성 중, 숨김까지 전부 보여 준다 — 자기 물건이다 */
export async function listShopListings(shopId: string): Promise<ListingDto[]> {
  const rows = await getDb()
    .select(listingColumns)
    .from(shopListings)
    .innerJoin(products, eq(products.id, shopListings.productId))
    .leftJoin(hardwareModels, eq(hardwareModels.code, products.hardwareCode))
    .where(eq(shopListings.shopId, shopId))
    .orderBy(desc(shopListings.updatedAt));
  return rows.map(toListing);
}

/**
 * 매장 페이지의 "파는 물건". 손님에게는 **판매 중인 것만** 보인다 —
 * 작성 중(draft)과 숨김(hidden)은 매장이 아직 안 내놓기로 한 줄이고, 품절은 값이 남아 있어 보여 준다.
 */
export async function listPublicShopListings(shopId: string): Promise<ListingDto[]> {
  const rows = await getDb()
    .select(listingColumns)
    .from(shopListings)
    .innerJoin(products, eq(products.id, shopListings.productId))
    .leftJoin(hardwareModels, eq(hardwareModels.code, products.hardwareCode))
    .where(and(eq(shopListings.shopId, shopId), inArray(shopListings.status, ["selling", "soldout"])))
    .orderBy(asc(products.name));
  return rows.map(toListing);
}

/**
 * 이 게임을 파는 매장 — 게임 상세의 "파는 곳".
 *
 * 대표 `products.gameId` 가 아니라 `product_components.gameId` 로 찾는다(설계서 §4).
 * **세트에 끼어 있어도 그 게임 페이지에 뜬다** — 포켓몬 두 판 세트를 산 사람은
 * 자기가 찾던 한 편의 페이지에서 그 세트를 만나야 한다.
 *
 * 매장이 쉬는 중(suspended)이면 빼지 않고 그대로 두지 않는다 — 찾아가도 문이 닫혀 있다.
 */
export async function listSellersForGame(gameId: string): Promise<SellerDto[]> {
  const rows = await getDb()
    .select({
      shopSlug: shops.slug,
      shopName: shops.name,
      address: shops.address,
      condition: shopListings.condition,
      priceMinor: shopListings.priceMinor,
      currency: shopListings.currency,
      onHand: shopListings.onHand,
      held: shopListings.held,
    })
    .from(productComponents)
    .innerJoin(products, eq(products.id, productComponents.productId))
    .innerJoin(shopListings, eq(shopListings.productId, products.id))
    .innerJoin(shops, eq(shops.id, shopListings.shopId))
    .where(
      and(
        eq(productComponents.gameId, gameId),
        eq(shopListings.status, "selling"),
        eq(shops.status, "active"),
      ),
    )
    .orderBy(asc(shopListings.priceMinor))
    .limit(SELLING_PAGE_SIZE);
  return rows.map((r) => ({
    shopSlug: r.shopSlug,
    shopName: r.shopName,
    address: r.address,
    condition: r.condition,
    priceMinor: r.priceMinor,
    currency: r.currency,
    available: Math.max(r.onHand - r.held, 0),
  }));
}

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
 *
 * 같은 매장이 같은 상품, 같은 상태를 두 줄로 올리는 것은 DB 가 막는다
 * (`shop_listings_shop_product_condition_uq`). 막힌 것을 사람이 읽을 문장으로 바꿔 던진다.
 */
export async function createListing(input: ListingCreateInput, actor: { source: AuditSource; userId?: string }): Promise<void> {
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
        ...createdBy(actor.source, actor.userId),
      })
      .returning({ id: shopListings.id });
    // 재고 이력은 A 단계부터 돈다(§12.5). 첫 줄도 0 에서 시작한 움직임이다 —
    // 안 남기면 "처음부터 3개였나 나중에 3개가 됐나" 에 답할 수 없다
    await db.insert(shopStockEvents).values({
      listingId: row.id,
      beforeQty: 0,
      afterQty: input.onHand,
      reason: "manual",
      ...createdBy(actor.source, actor.userId),
    });
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
  const result = await db
    .delete(shopListings)
    .where(and(eq(shopListings.id, listingId), eq(shopListings.shopId, shopId)))
    .returning({ id: shopListings.id });
  if (result.length === 0) throw new Error(LISTING_MESSAGES.notFound);
}

/** 매장 페이지가 "파는 물건" 칸을 그릴지 정할 때 쓴다 — 목록을 다 읽지 않고 수만 센다 */
export async function countPublicListings(shopId: string): Promise<number> {
  const rows = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(shopListings)
    .where(and(eq(shopListings.shopId, shopId), inArray(shopListings.status, ["selling", "soldout"])));
  return rows[0]?.n ?? 0;
}
