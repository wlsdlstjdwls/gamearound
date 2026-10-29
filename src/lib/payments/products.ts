// 광고 상품의 구조 — 상품의 자리 목록을 결제가 쓰는 모양(주 대상, 둘째 대상)으로 푼다. 화면, 서버, 검증이 같은 함수를 본다.
// 상품 자체(이름, 자리, 기간, 값, 판매)는 관리자가 만드는 목록이다(lib/pricing/settings, 2026-10-29). 앞에는 이 파일의 고정 표 셋이 상품이었다.
// 값은 여기 없다: 요금 설정과 프로모션으로 서버가 매겨(services/pricing) 주문 줄에 적고, 결제창에서 돌아온 금액은 그 줄과 견주기만 한다.
//
// 묶음(자리 둘)은 대상이 두 표에 걸친다(인디 게임 글, 게시판 홍보 글). 주 대상이 인디 게임이고 둘째(extra)가 홍보 글이다 —
// 결제 줄의 targetId, extraTargetId 에 그대로 담긴다.
import type { PromoSlot, PromoTargetKind } from "@/server/db/schema";
import type { CatalogProduct } from "@/lib/pricing/settings";

export type ProductPart = { slot: PromoSlot; target: PromoTargetKind };
export type ProductShape = ProductPart & { extra?: ProductPart };

export const SLOT_TARGET: Record<PromoSlot, PromoTargetKind> = { indie_top: "indie_post", promo_pin: "board_post" };
export const TARGET_SLOT: Record<PromoTargetKind, PromoSlot> = { indie_post: "indie_top", board_post: "promo_pin" };

/** 멤버십 이용권 한 장의 기간(일). 혜택 문구가 "한 장이면 7일" 로 약속한다 — 관리자가 만든 상품 기간과 따로 간다 */
export const CREDIT_DAYS = 7;

/** 자리 목록을 주 대상, 둘째 대상으로. 인디 목록 자리가 있으면 그쪽이 주 대상이다 */
export function productShape(p: Pick<CatalogProduct, "slots">): ProductShape {
  const main: PromoSlot = p.slots.includes("indie_top") ? "indie_top" : p.slots[0];
  const rest = p.slots.find((s) => s !== main);
  return { slot: main, target: SLOT_TARGET[main], ...(rest ? { extra: { slot: rest, target: SLOT_TARGET[rest] } } : {}) };
}

/** 브라우저에서 온 상품 id 의 꼴 검사. 있는 상품인지는 서버가 설정에서 다시 찾는다 */
export function isProductIdLike(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v);
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

/**
 * 주문 번호. 토스 규칙(영문 대소문자, 숫자, -, _ 로 6~64자)에 맞추고, 앞에 상품을 알아볼 낱말을 둔다.
 * 무작위 부분은 서버의 crypto 로 만든다 — 부르는 쪽이 넘긴다(이 파일은 클라이언트도 읽는다).
 */
export function makeOrderId(prefix: string, random: string): string {
  return `${prefix}_${random}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}
