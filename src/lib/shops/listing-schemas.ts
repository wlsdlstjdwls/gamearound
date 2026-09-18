// 판매 목록 검증 규칙 — 서버 액션과 폼이 같은 스키마 하나를 본다(AGENTS §2).
import { z } from "zod";
import { LISTING_MESSAGES } from "./listing-messages";

export const PRODUCT_NAME_MAX = 80;
/** EAN 13, UPC 12, JAN 8. 셋을 다 받아 자릿수만 본다 — 체크디짓까지 보면 정상 상품이 막힌다 */
export const BARCODE_MIN = 8;
export const BARCODE_MAX = 14;
/**
 * 한 줄에 적을 수 있는 값의 상한. 실물 게임에 1,000만 원이 넘는 값이 붙는 일은 없고,
 * 0 을 더 붙인 오타를 그대로 받으면 게임 화면의 최저가 줄이 통째로 망가진다.
 */
export const LISTING_PRICE_MAX = 10_000_000;
/** 재고 상한. 이 수를 넘길 매장이면 연동(§8)으로 넣을 일이지 손으로 적을 일이 아니다 */
export const LISTING_STOCK_MAX = 9_999;

/** 숫자만 남긴다. 사람은 바코드를 띄어쓰기와 함께 옮겨 적는다 */
export function normalizeBarcode(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

const barcodeField = z
  .string()
  .trim()
  .transform(normalizeBarcode)
  .refine((v) => v === "" || (v.length >= BARCODE_MIN && v.length <= BARCODE_MAX), LISTING_MESSAGES.barcodeInvalid);

/**
 * 물건 하나 추가. 상품(products)과 판매 줄(shop_listings)을 한 폼에서 받는다.
 *
 * 왜 한 폼인가: 매장이 실제로 하는 일은 "이거 이 값에 몇 개 올린다" 하나다.
 * 상품 만들기와 판매 올리기를 두 화면으로 가르면, 상품만 만들고 안 파는 행이 쌓인다.
 * 표는 갈라 두되(§4) 입력은 한 번에 받는다 — 바코드가 같으면 서비스가 기존 상품에 붙인다.
 */
export const listingCreateSchema = z.object({
  shopId: z.uuid(LISTING_MESSAGES.badRequest),
  name: z.string().trim().min(1, LISTING_MESSAGES.nameRequired).max(PRODUCT_NAME_MAX, LISTING_MESSAGES.nameTooLong),
  barcode: barcodeField.optional(),
  hardwareCode: z.string().trim().max(32).optional(),
  /** 게임과 잇는 것은 선택이다 — 굿즈와 하드웨어에는 게임이 없다(§4) */
  gameId: z.uuid().optional(),
  condition: z.enum(["sealed", "new", "used"]),
  priceMinor: z.coerce.number().int().min(0, LISTING_MESSAGES.priceInvalid).max(LISTING_PRICE_MAX, LISTING_MESSAGES.priceInvalid),
  onHand: z.coerce.number().int().min(0, LISTING_MESSAGES.stockInvalid).max(LISTING_STOCK_MAX, LISTING_MESSAGES.stockInvalid),
  status: z.enum(["draft", "selling", "soldout", "hidden"]),
});

export type ListingCreateInput = z.infer<typeof listingCreateSchema>;

/** 재고만 고치는 자리. 판매 목록에서 줄마다 바로 저장한다 */
export const listingStockSchema = z.object({
  listingId: z.uuid(LISTING_MESSAGES.badRequest),
  onHand: z.coerce.number().int().min(0, LISTING_MESSAGES.stockInvalid).max(LISTING_STOCK_MAX, LISTING_MESSAGES.stockInvalid),
});

export type ListingStockInput = z.infer<typeof listingStockSchema>;

export const listingRemoveSchema = z.object({ listingId: z.uuid(LISTING_MESSAGES.badRequest) });
