"use server";
// 판매 목록 Server Action — zod 로 검증하고 서비스로 넘긴다.
//
// 매장 권한을 여기서 다시 본다. 레이아웃이 로그인을 봤다는 것은 "사람인가" 까지만 답한 것이고,
// **남의 매장** 은 그것으로 안 막힌다 — 폼에 남의 shopId 를 박아 보내는 것이 이 도메인의 첫 공격이다
// (server/auth/shop-access, 설계서 §10).
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { AuditSource } from "@/server/db/audit";
import { vendorListingsPath, shopPath } from "@/lib/routes";
import { CSV_MESSAGES, LISTING_MESSAGES } from "@/lib/shops/listing-messages";
import { LISTING_CSV_MAX_BYTES, LISTING_CSV_MAX_ROWS } from "@/lib/shops/constants";
import { readListingCsv } from "@/lib/shops/listing-csv";
import { barcodeLookupSchema, listingCreateSchema, listingRemoveSchema, listingStockSchema } from "@/lib/shops/listing-schemas";
import { SHOP_GAME_MESSAGES } from "@/lib/shops/game-messages";
import { needsResearch, shopGameCreateSchema, shopGameSearchSchema } from "@/lib/shops/game-schemas";
import type { ShopGameOptionDto } from "@/lib/shops/game-option";
import { openShopForAction } from "@/server/auth/shop-access";
import {
  createListing,
  findProductByBarcode,
  importListingsCsv,
  listHardwareModels,
  removeListing,
  updateListingStock,
  type BarcodeHitDto,
} from "@/server/services/listings";
import { createShopGame, searchShopGames } from "@/server/services/shop-games";

export type ListingState = { ok: true; message: string } | { ok: false; error: string } | null;

/** 세 액션이 같은 앞머리를 쓴다 — 권한과 감사 출처는 server/auth/shop-access 가 정한다 */
function openShop(shopSlug: string) {
  return openShopForAction(shopSlug, LISTING_MESSAGES.notFound, "owner", "manager", "staff");
}

/** 고친 값이 손님 화면에도 바로 보여야 한다 — 매장 페이지가 캐시를 안 쓰므로 경로만 밀어 준다 */
function refresh(shopSlug: string): void {
  revalidatePath(vendorListingsPath(shopSlug));
  revalidatePath(shopPath(shopSlug));
}

/**
 * 폼이 보낸 게임 후보 찾기. 매장 권한을 여기서도 본다 —
 * 카탈로그 검색 자체는 공개지만, 이 액션은 매장 화면에만 붙는다는 계약을 액션이 스스로 지켜야 한다.
 */
export async function searchShopGamesAction(term: string): Promise<ShopGameOptionDto[]> {
  const parsed = shopGameSearchSchema.safeParse({ term });
  if (!parsed.success) return [];
  return searchShopGames(parsed.data.term);
}

/**
 * 이 물건이 가리킬 게임 id. 셋 중 하나다 — 골랐거나, 새로 만들거나, 안 걸거나(굿즈).
 *
 * 새로 만드는 길에는 §7 의 재검색 강제가 걸린다. 화면도 막지만 **서버도 막는다** —
 * 화면의 약속은 폼을 손으로 만들어 보내면 그만이고, 중복은 만들기는 쉽고 접기는 비싸다
 * (2026-09-18 실측: 중복 묶음 하나를 접을 때 자식 DLC 39건이 함께 날아갈 수 있다).
 */
async function resolveGameId(
  formData: FormData,
  ctx: { shopSlug: string; hardwareCode: string; actor: { source: AuditSource; userId?: string } },
): Promise<string | undefined> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const picked = text("gameId");
  if (picked) return picked;

  const title = text("newGameTitle");
  if (!title) return undefined;
  if (needsResearch(title, text("searchedTerm"))) throw new Error(SHOP_GAME_MESSAGES.searchAgainRequired);
  const parsed = shopGameCreateSchema.safeParse({
    shopSlug: ctx.shopSlug,
    title,
    publisher: text("newGamePublisher"),
    hardwareCode: ctx.hardwareCode,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? SHOP_GAME_MESSAGES.badRequest);
  return createShopGame(parsed.data, ctx.actor);
}

export async function createListingAction(shopSlug: string, _prev: ListingState, formData: FormData): Promise<ListingState> {
  try {
    const { shop, actor } = await openShop(shopSlug);
    const text = (name: string) => String(formData.get(name) ?? "").trim();
    const gameId = await resolveGameId(formData, { shopSlug, hardwareCode: text("hardwareCode"), actor });
    const parsed = listingCreateSchema.safeParse({
      shopId: shop.id,
      name: text("name"),
      barcode: text("barcode"),
      hardwareCode: text("hardwareCode"),
      // 빈 문자열을 그대로 넘기면 uuid 검증에 걸린다. "안 골랐다" 는 undefined 로 말한다
      gameId,
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

export type CsvImportState = { ok: true; message: string; errors: string[] } | { ok: false; error: string } | null;

/**
 * CSV 한 파일 반영. 파일 자체가 아니라 **글자로 풀린 본문**(`csv`)을 받는다 —
 * 엑셀의 한글 CSV 는 EUC-KR 이라 서버가 바이트를 받으면 인코딩을 다시 맞혀야 한다. 브라우저가 풀어 보낸다
 * (components/shops/listing-csv-form 의 readCsvText).
 */
export async function importCsvAction(shopSlug: string, _prev: CsvImportState, formData: FormData): Promise<CsvImportState> {
  try {
    const { shop, actor } = await openShop(shopSlug);
    const text = String(formData.get("csv") ?? "");
    if (!text.trim()) return { ok: false, error: CSV_MESSAGES.fileRequired };
    // 브라우저도 막지만 손으로 만든 요청은 그걸 안 거친다
    if (Buffer.byteLength(text, "utf8") > LISTING_CSV_MAX_BYTES) return { ok: false, error: CSV_MESSAGES.fileTooBig };

    const read = readListingCsv(text, await listHardwareModels());
    if (!read.ok) return { ok: false, error: read.error };
    if (read.rows.length > LISTING_CSV_MAX_ROWS) return { ok: false, error: CSV_MESSAGES.tooManyRows(LISTING_CSV_MAX_ROWS) };

    const r = await importListingsCsv(shop.id, read.rows, actor);
    refresh(shopSlug);
    const errors = r.errors.map((e) => CSV_MESSAGES.failedLine(e.line, e.error));
    if (r.failed > r.errors.length) errors.push(CSV_MESSAGES.moreFailed(r.failed - r.errors.length));
    return { ok: true, message: CSV_MESSAGES.result(r), errors };
  } catch (e) {
    // 권한 없음, 세션 만료 이동을 오류 문구로 삼키지 않는다(staff/actions 의 fail 주석)
    unstable_rethrow(e);
    return { ok: false, error: e instanceof Error ? e.message : LISTING_MESSAGES.badRequest };
  }
}

/**
 * 바코드로 이미 있는 상품 찾기. 폼이 스캔(또는 엔터) 직후 부른다.
 * 매장 권한을 여기서도 본다 — 상품 사전을 바코드로 훑는 창구를 로그인한 아무에게나 열지 않는다.
 */
export async function lookupBarcodeAction(shopSlug: string, barcode: string): Promise<BarcodeHitDto | null> {
  await openShop(shopSlug);
  const parsed = barcodeLookupSchema.safeParse({ barcode });
  if (!parsed.success) return null;
  return findProductByBarcode(parsed.data.barcode);
}
