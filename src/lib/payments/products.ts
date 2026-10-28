// 파는 상품의 구조 — 자리, 대상, 기간, 영수증 이름. 화면, 서버, 검증이 같은 표를 본다.
// 값은 여기 없다(2026-10-28): 관리자가 바꾸는 요금 설정(lib/pricing/settings)과 프로모션으로 서버가 매겨(services/pricing) 주문 줄에 적는다 —
// 결제창에서 돌아온 금액은 그 줄과 견주기만 한다(schema-payments 머리 주석).
//
// 묶음은 대상이 두 표에 걸친다(인디 게임 글, 게시판 홍보 글). 주 대상(slot, target)이 인디 게임이고 둘째(extra)가 홍보 글이다 —
// 결제 줄의 targetId, extraTargetId 에 그대로 담긴다. 멤버십 이용권은 한 장에 자리 하나라 낱개 상품에만 쓴다.
import type { PromoSlot, PromoTargetKind } from "@/server/db/schema";

export type ProductPart = { slot: PromoSlot; target: PromoTargetKind };
export type Product = ProductPart & { name: string; days: number; extra?: ProductPart };

export const PRODUCTS = {
  boost_indie_7d: { name: "인디 게임 부스트 7일", slot: "indie_top", target: "indie_post", days: 7 },
  pin_promo_7d: { name: "홍보 글 고정 7일", slot: "promo_pin", target: "board_post", days: 7 },
  bundle_7d: { name: "인디 게임 부스트 + 홍보 글 고정 7일", slot: "indie_top", target: "indie_post", days: 7, extra: { slot: "promo_pin", target: "board_post" } },
} as const satisfies Record<string, Product>;

export type ProductKey = keyof typeof PRODUCTS;

export function isProductKey(v: string): v is ProductKey {
  return Object.hasOwn(PRODUCTS, v);
}

/**
 * 구매 화면의 "이것만 / 같이 사기" 처음 값. 요금 안내 카드(/indie/mine/plans)가 고른 쪽을 주소로 넘겨
 * 구매 화면에서 다시 고르지 않게 한다(2026-10-28 사용자: 카드 고르고, 글 고르고, 또 고르는 길이 불편하다)
 */
export const PLAN_PARAM = "plan";
export type PlanChoice = "single" | "bundle";
export function readPlanChoice(v: string | undefined): PlanChoice | null {
  return v === "single" || v === "bundle" ? v : null;
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
