// 파는 상품과 값. 화면, 서버, 검증이 같은 값을 본다.
// 값(2026-10-27 사용자 확정): 인디 게임 부스트, 홍보 글 고정 각 7일 6,900원, 둘을 같이 사면 9,900원(기획서 4.3 "부스트 1회 9,900원" 의 묶음).
// 값은 서버가 이 표에서 읽어 주문 줄에 적는다 — 결제창에서 돌아온 금액은 이 값과 견주기만 한다(schema-payments 머리 주석).
//
// 묶음은 대상이 두 표에 걸친다(인디 게임 글, 게시판 홍보 글). 주 대상(slot, target)이 인디 게임이고 둘째(extra)가 홍보 글이다 —
// 결제 줄의 targetId, extraTargetId 에 그대로 담긴다. 멤버십 이용권은 한 장에 자리 하나라 낱개 상품에만 쓴다.
import type { PromoSlot, PromoTargetKind } from "@/server/db/schema";

export type ProductPart = { slot: PromoSlot; target: PromoTargetKind };
export type Product = ProductPart & { name: string; amount: number; days: number; extra?: ProductPart };

export const PRODUCTS = {
  boost_indie_7d: { name: "인디 게임 부스트 7일", amount: 6_900, slot: "indie_top", target: "indie_post", days: 7 },
  pin_promo_7d: { name: "홍보 글 고정 7일", amount: 6_900, slot: "promo_pin", target: "board_post", days: 7 },
  bundle_7d: { name: "인디 게임 부스트 + 홍보 글 고정 7일", amount: 9_900, slot: "indie_top", target: "indie_post", days: 7, extra: { slot: "promo_pin", target: "board_post" } },
} as const satisfies Record<string, Product>;

export type ProductKey = keyof typeof PRODUCTS;

export function isProductKey(v: string): v is ProductKey {
  return Object.hasOwn(PRODUCTS, v);
}

/** 묶음의 정가 — 낱개 둘을 따로 샀을 때의 합. 구매 화면이 이 값을 긋고 묶음 값을 옆에 둔다 */
export const BUNDLE_LIST_PRICE = PRODUCTS.boost_indie_7d.amount + PRODUCTS.pin_promo_7d.amount;
/** 묶음 할인 금액. 구매 화면이 "N원 할인" 으로 말한다(2026-10-27 사용자: 혜택이 할인으로 보이게) */
export const BUNDLE_SAVING = BUNDLE_LIST_PRICE - PRODUCTS.bundle_7d.amount;
/**
 * 묶음 할인율(%). 소수점은 버린다 — 28.26% 를 29% 로 올려 적으면 실제보다 큰 할인을 말하게 된다(표시광고법).
 * 구매 화면, 요금 안내가 "28% 할인" 으로 크게 쓴다(2026-10-28 사용자: 정가를 긋고 할인을 강조)
 */
export const BUNDLE_DISCOUNT_RATE = discountRate(BUNDLE_LIST_PRICE, PRODUCTS.bundle_7d.amount);

/** 정가 대비 할인율(%, 내림). 정가가 0 이하이거나 값이 정가보다 크면 0 */
export function discountRate(listPrice: number, price: number): number {
  if (listPrice <= 0 || price >= listPrice) return 0;
  return Math.floor(((listPrice - price) / listPrice) * 100);
}

/** 하루 값(원, 내림). "하루 약 N원" 으로 쪼개 보이는 자리가 쓴다 — 올려 적으면 실제보다 비싸 보이고, 반올림은 근거가 흐리다 */
export function perDay(amount: number, days: number): number {
  return days > 0 ? Math.floor(amount / days) : amount;
}

/** 이용권으로 걸 수 있는 상품인가(자리 하나짜리) */
export function isSingleProduct(key: ProductKey): boolean {
  return !("extra" in PRODUCTS[key]);
}

/**
 * 주문 번호. 토스 규칙(영문 대소문자, 숫자, -, _ 로 6~64자)에 맞추고, 앞에 상품을 알아볼 낱말을 둔다.
 * 무작위 부분은 서버의 crypto 로 만든다 — 부르는 쪽이 넘긴다(이 파일은 클라이언트도 읽는다).
 */
export function makeOrderId(prefix: string, random: string): string {
  return `${prefix}_${random}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}
