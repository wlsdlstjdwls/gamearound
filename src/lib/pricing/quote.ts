// 값 매기기 — 요금 설정(lib/pricing/settings)과 사는 사람의 처지로 이번 결제 값을 정한다(2026-10-28).
// 순수 함수다. 서버의 주문 만들기, 멤버십 첫 청구, 요금 화면 카드, 결제 화면 고르기가 모두 이 함수로 값을 낸다 —
// 화면이 보인 값과 실제 청구가 갈리면 안 된다(서버는 이 값을 주문 줄에 적고, 결제창 금액은 그 줄과 견주기만 한다).
//
// 프로모션이 여럿 걸리면 가장 싼 값 하나만 쓴다(겹쳐 깎지 않는다) — 겹치면 관리자가 예상 못 한 값이 나온다.
// 멤버십 프로모션은 첫 달 청구에만 걸린다. 갱신은 언제나 설정의 정가다.
// 날짜는 한국 날짜로 본다: startsOn 00:00 부터 endsOn 23:59:59 까지(KST).
import { PRICING_DEFAULTS, type PricedKey, type PricingSettings, type Promotion, MIN_CHARGE } from "@/lib/pricing/settings";

/** 할인 결과를 이 단위로 내린다(원). 6,210원 같은 값보다 6,200원이 읽힌다 */
const ROUND_UNIT = 10;
const KST_OFFSET = "+09:00";
const END_OF_DAY = "T23:59:59.999";

export type Buyer = {
  /** 이 갈래(상품이면 상품, 멤버십이면 멤버십)를 한 번이라도 결제한 적이 있나. 모르면(비로그인) true 로 — 첫 결제 값을 약속하지 않는다 */
  everPaid: boolean;
};

export type Quote = {
  /** 이번에 낼 값 */
  amount: number;
  /** 정가(설정 값). amount 보다 크면 화면이 긋는다 */
  regular: number;
  /** 걸린 프로모션 딱지 글. 없으면 null */
  promoLabel: string | null;
};

function regularOf(s: PricingSettings, key: PricedKey): number {
  return key === "membership" ? s.membership.amount : s.products[key].amount;
}

export function promotionLive(p: Promotion, now: Date): boolean {
  if (!p.active) return false;
  if (p.startsOn && now < new Date(`${p.startsOn}T00:00:00${KST_OFFSET}`)) return false;
  if (p.endsOn && now > new Date(`${p.endsOn}${END_OF_DAY}${KST_OFFSET}`)) return false;
  return true;
}

function applyPromotion(regular: number, p: Promotion): number {
  const raw = p.kind === "percent" ? regular * (1 - p.value / 100) : p.value;
  return Math.max(MIN_CHARGE, Math.floor(raw / ROUND_UNIT) * ROUND_UNIT);
}

/**
 * 이번 결제 값. 멤버십이면 first 가 첫 달 청구인지다(갱신이면 프로모션 없이 정가).
 * 프로모션 값이 정가보다 비싸면 버린다(가격 인상을 할인처럼 보이게 하지 않는다)
 */
export function quote(s: PricingSettings, key: PricedKey, buyer: Buyer, now: Date, first = true): Quote {
  const regular = regularOf(s, key);
  if (key === "membership" && !first) return { amount: regular, regular, promoLabel: null };
  let best: Quote = { amount: regular, regular, promoLabel: null };
  for (const p of s.promotions) {
    if (p.target !== key || !promotionLive(p, now)) continue;
    if (p.audience === "first" && buyer.everPaid) continue;
    const amount = applyPromotion(regular, p);
    if (amount < best.amount) best = { amount, regular, promoLabel: p.label };
  }
  return best;
}

/** 정가 대비 할인율(%, 내림 — 올려 적으면 실제보다 큰 할인을 말한다) */
export function discountRate(listPrice: number, price: number): number {
  if (listPrice <= 0 || price >= listPrice) return 0;
  return Math.floor(((listPrice - price) / listPrice) * 100);
}

/** 하루 값(원, 내림) */
export function perDay(amount: number, days: number): number {
  return days > 0 ? Math.floor(amount / days) : amount;
}

/** 묶음의 그을 값 — 낱개 둘을 정가로 따로 샀을 때의 합. 묶음 정가, 프로모션 값과 견줄 근거다 */
export function bundleListPrice(s: PricingSettings): number {
  return s.products.boost_indie_7d.amount + s.products.pin_promo_7d.amount;
}

/** 멤버십 이용권을 낱개 정가로 환산한 값(이용권 한 장 = 자리 하나 7일) */
export function creditsListValue(s: PricingSettings): number {
  return s.membership.boostCredits * s.products.boost_indie_7d.amount;
}

/** 화면이 한 번에 쓰는 값 묶음. 사는 사람 처지는 상품, 멤버십 따로 */
export type PriceBook = {
  boost: Quote;
  pin: Quote;
  bundle: Quote;
  membership: Quote;
  /** 묶음의 그을 값(낱개 정가 합) */
  bundleList: number;
};

export function priceBook(s: PricingSettings, buyer: { productsPaid: boolean; membershipPaid: boolean }, now: Date): PriceBook {
  const product = { everPaid: buyer.productsPaid };
  return {
    boost: quote(s, "boost_indie_7d", product, now),
    pin: quote(s, "pin_promo_7d", product, now),
    bundle: quote(s, "bundle_7d", product, now),
    membership: quote(s, "membership", { everPaid: buyer.membershipPaid }, now),
    bundleList: bundleListPrice(s),
  };
}

/** 설정을 못 읽은 화면(테스트, 정적 자리)이 쓰는 값 */
export const DEFAULT_PRICE_BOOK = priceBook(PRICING_DEFAULTS, { productsPaid: true, membershipPaid: true }, new Date(0));
