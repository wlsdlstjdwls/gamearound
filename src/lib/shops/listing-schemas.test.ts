// 판매 목록 검증 테스트 — 순수 함수만. 네트워크, DB 를 건드리지 않는다(AGENTS §8).
import { describe, expect, it } from "vitest";
import {
  LISTING_PRICE_MAX,
  LISTING_STOCK_MAX,
  listingCreateSchema,
  listingStockSchema,
  normalizeBarcode,
} from "./listing-schemas";
import { LISTING_MESSAGES } from "./listing-messages";

const SHOP_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

function listing(over: Record<string, unknown> = {}) {
  return {
    shopId: SHOP_ID,
    name: "젤다의 전설 티어스 오브 더 킹덤",
    condition: "used",
    priceMinor: "54000",
    onHand: "2",
    status: "selling",
    ...over,
  };
}

describe("normalizeBarcode", () => {
  it("사람이 띄어 적은 바코드에서 숫자만 남긴다", () => {
    expect(normalizeBarcode("4 902370 548501")).toBe("4902370548501");
    expect(normalizeBarcode("045496-590420")).toBe("045496590420");
  });
});

describe("listingCreateSchema", () => {
  it("값과 수량은 글자로 와도 숫자로 읽는다 — 폼은 언제나 문자열을 보낸다", () => {
    const parsed = listingCreateSchema.safeParse(listing());
    expect(parsed.success).toBe(true);
    expect(parsed.data?.priceMinor).toBe(54000);
    expect(parsed.data?.onHand).toBe(2);
  });

  it("바코드는 없어도 되지만, 적었으면 자릿수를 본다", () => {
    expect(listingCreateSchema.safeParse(listing({ barcode: "" })).success).toBe(true);
    expect(listingCreateSchema.safeParse(listing({ barcode: "4902370548501" })).success).toBe(true);

    const short = listingCreateSchema.safeParse(listing({ barcode: "1234" }));
    expect(short.success).toBe(false);
    expect(short.error?.issues[0]?.message).toBe(LISTING_MESSAGES.barcodeInvalid);
  });

  it("0 을 더 붙인 오타를 막는다 — 그대로 받으면 게임 화면의 최저가 줄이 통째로 망가진다", () => {
    const parsed = listingCreateSchema.safeParse(listing({ priceMinor: String(LISTING_PRICE_MAX + 1) }));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(LISTING_MESSAGES.priceInvalid);
  });

  it("값 0 은 받는다 — 사은품과 덤으로 주는 물건이 실제로 있다", () => {
    expect(listingCreateSchema.safeParse(listing({ priceMinor: "0" })).success).toBe(true);
  });

  it("음수 재고는 막는다", () => {
    const parsed = listingCreateSchema.safeParse(listing({ onHand: "-1" }));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(LISTING_MESSAGES.stockInvalid);
  });

  it("이름이 비면 막는다 — 손님이 보는 이름이 그 줄의 전부다", () => {
    const parsed = listingCreateSchema.safeParse(listing({ name: "   " }));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(LISTING_MESSAGES.nameRequired);
  });

  it("게임을 안 고르면 그 칸은 없는 것으로 본다 — 굿즈와 하드웨어에는 게임이 없다", () => {
    const parsed = listingCreateSchema.safeParse(listing({ gameId: undefined }));
    expect(parsed.success).toBe(true);
    expect(parsed.data?.gameId).toBeUndefined();
  });
});

describe("listingStockSchema", () => {
  it("상한을 넘는 재고는 막는다 — 그만큼 있으면 손으로 적을 일이 아니다", () => {
    expect(listingStockSchema.safeParse({ listingId: SHOP_ID, onHand: String(LISTING_STOCK_MAX) }).success).toBe(true);
    expect(listingStockSchema.safeParse({ listingId: SHOP_ID, onHand: String(LISTING_STOCK_MAX + 1) }).success).toBe(false);
  });

  it("listingId 가 uuid 가 아니면 막는다 — 폼에 남의 값을 박아 보내는 자리다", () => {
    expect(listingStockSchema.safeParse({ listingId: "1", onHand: "1" }).success).toBe(false);
  });
});
