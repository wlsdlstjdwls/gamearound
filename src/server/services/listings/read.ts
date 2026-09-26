// 판매 목록 조회 — "이 매장이 무엇을 파나", "이 게임을 파는 곳이 어디인가". 설계서 §4, §12.
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
  shops,
  type ListingCondition,
  type ListingStatus,
} from "@/server/db/schema";
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


/** 매장 페이지가 "파는 물건" 칸을 그릴지 정할 때 쓴다 — 목록을 다 읽지 않고 수만 센다 */
export async function countPublicListings(shopId: string): Promise<number> {
  const rows = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(shopListings)
    .where(and(eq(shopListings.shopId, shopId), inArray(shopListings.status, ["selling", "soldout"])));
  return rows[0]?.n ?? 0;
}
