// 파는 상품과 값(2026-10-27 사용자 확정: 부스트 7일 9,900원, 기획서 4.3). 화면, 서버, 검증이 같은 값을 본다.
// 값은 서버가 이 표에서 읽어 주문 줄에 적는다 — 결제창에서 돌아온 금액은 이 값과 견주기만 한다(schema-payments 머리 주석).
//
// 기획서 4.3 의 부스트는 "인디 목록 + 홍보 고정 7일" 한 묶음이지만, 대상이 다르다(인디 게임 글, 게시판 홍보 글).
// 한 결제로 두 표의 글을 함께 고르게 하면 화면이 무거워져 자리마다 따로 판다. 홍보 고정 값은 아직 사용자가 정하지 않아
// 부스트와 같은 값을 자리표시로 둔다(2026-10-27).
import type { PromoSlot, PromoTargetKind } from "@/server/db/schema";

export type Product = { name: string; amount: number; slot: PromoSlot; target: PromoTargetKind; days: number };

export const PRODUCTS = {
  boost_indie_7d: { name: "인디 게임 부스트 7일", amount: 9_900, slot: "indie_top", target: "indie_post", days: 7 },
  pin_promo_7d: { name: "홍보 글 고정 7일", amount: 9_900, slot: "promo_pin", target: "board_post", days: 7 },
} as const satisfies Record<string, Product>;

export type ProductKey = keyof typeof PRODUCTS;

export function isProductKey(v: string): v is ProductKey {
  return Object.hasOwn(PRODUCTS, v);
}

/**
 * 주문 번호. 토스 규칙(영문 대소문자, 숫자, -, _ 로 6~64자)에 맞추고, 앞에 상품을 알아볼 낱말을 둔다.
 * 무작위 부분은 서버의 crypto 로 만든다 — 부르는 쪽이 넘긴다(이 파일은 클라이언트도 읽는다).
 */
export function makeOrderId(prefix: string, random: string): string {
  return `${prefix}_${random}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}
