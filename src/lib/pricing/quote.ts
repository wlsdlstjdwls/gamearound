// 값 매기기 — 요금 설정(lib/pricing/settings)과 사는 사람의 처지로 이번 결제 값을 정한다(2026-10-28).
// 순수 함수다. 서버의 주문 만들기, 멤버십 첫 청구, 요금 화면 카드, 결제 화면 고르기가 모두 이 함수로 값을 낸다 —
// 화면이 보인 값과 실제 청구가 갈리면 안 된다(서버는 이 값을 주문 줄에 적고, 결제창 금액은 그 줄과 견주기만 한다).
//
// 프로모션이 여럿 걸리면 가장 싼 값 하나만 쓴다(겹쳐 깎지 않는다) — 겹치면 관리자가 예상 못 한 값이 나온다.
// 멤버십 프로모션은 첫 달 청구에만 걸린다. 갱신은 언제나 설정의 정가다.
// 날짜는 한국 날짜로 본다: startsOn 00:00 부터 endsOn 23:59:59 까지(KST).
import { findProduct, isBundleProduct, MEMBERSHIP_KEY, PRICING_DEFAULTS, type CatalogProduct, type PricedKey, type PricingSettings, type Promotion, MIN_CHARGE } from "@/lib/pricing/settings";
import type { BadgeTone, ToneValue } from "@/lib/pricing/copy-tones";

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
  /** 그 딱지 색. 관리자가 고르지 않았으면 null — 화면이 DEFAULT_TONES.promo 로 그린다 */
  promoTone: ToneValue<BadgeTone> | null;
};

/** 정가. 모르는 상품이면 던진다 — 부르는 쪽(주문 만들기)이 먼저 상품을 찾아 판매 중인지 본다 */
function regularOf(s: PricingSettings, key: PricedKey): number {
  if (key === MEMBERSHIP_KEY) return s.membership.amount;
  const p = findProduct(s, key);
  if (!p) throw new Error(`없는 상품: ${key}`);
  return p.amount;
}

export function promotionLive(p: Promotion, now: Date): boolean {
  if (!p.active) return false;
  if (p.startsOn && now < new Date(`${p.startsOn}T00:00:00${KST_OFFSET}`)) return false;
  if (p.endsOn && now > new Date(`${p.endsOn}${END_OF_DAY}${KST_OFFSET}`)) return false;
  return true;
}

/** 할인 행사가 지금 어디쯤인가 — 관리자 할인 행사 줄의 꼬리표(2026-10-29). 켜 두었어도 기간 밖이면 걸리지 않는다는 것을 말해야 한다 */
export type PromotionPhase = "off" | "upcoming" | "live" | "ended";

/**
 * 관리 화면의 진행상태 — 진행 중, 중단 둘뿐이다(2026-10-30 사용자 "진행 중, 중단만 관리, 중단은 항목이 여러 개").
 * 중단 사유는 사람이 고른 것(운영 중단, 가격변동 중단)과 기간이 정한 것(시작 전, 기간 종료)이 있다.
 */
export type PromotionStopReason = "manual" | "price_change" | "before" | "after";
export type PromotionStatus = { state: "live" } | { state: "stopped"; reason: PromotionStopReason };

export function promotionStatus(p: Promotion, now: Date): PromotionStatus {
  const phase = promotionPhase(p, now);
  if (phase === "live") return { state: "live" };
  if (phase === "off") return { state: "stopped", reason: p.stopReason ?? "manual" };
  return { state: "stopped", reason: phase === "upcoming" ? "before" : "after" };
}

export function promotionPhase(p: Promotion, now: Date): PromotionPhase {
  if (!p.active) return "off";
  if (promotionLive(p, now)) return "live";
  return p.startsOn && now < new Date(`${p.startsOn}T00:00:00${KST_OFFSET}`) ? "upcoming" : "ended";
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
  if (key === MEMBERSHIP_KEY && !first) return { amount: regular, regular, promoLabel: null, promoTone: null };
  let best: Quote = { amount: regular, regular, promoLabel: null, promoTone: null };
  for (const p of s.promotions) {
    if (p.target !== key || !promotionLive(p, now)) continue;
    if (p.audience === "first" && buyer.everPaid) continue;
    const amount = applyPromotion(regular, p);
    if (amount < best.amount) best = { amount, regular, promoLabel: p.label, promoTone: p.tone ?? null };
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

/**
 * 자리 하나짜리 상품 중 이 자리, 이 기간의 대표(판매 중인 것 먼저, 목록 순서대로). 같은 기간이 없으면 그 자리 첫 상품.
 * 묶음의 그을 값과 이용권 환산이 이 값을 낱개 정가로 쓴다
 */
export function singleFor(s: PricingSettings, slot: CatalogProduct["slots"][number], days?: number): CatalogProduct | null {
  const singles = s.products.filter((p) => !isBundleProduct(p) && p.slots[0] === slot);
  const ordered = [...singles.filter((p) => p.active), ...singles.filter((p) => !p.active)];
  return ordered.find((p) => days === undefined || p.days === days) ?? ordered[0] ?? null;
}

/** 묶음의 그을 값 — 같은 기간 낱개 둘을 정가로 따로 샀을 때의 합. 짝 낱개가 없으면 0(긋지 않는다) */
export function bundleListPrice(s: PricingSettings, bundle: Pick<CatalogProduct, "slots" | "days" | "parts"> | null = representative(s, "bundle")): number {
  if (!bundle) return 0;
  // 관리자가 고른 구성 상품이 먼저다. 고르지 않았거나(앞 판 저장값) 자리 수와 안 맞으면 같은 기간 낱개로
  const picked = bundlePartsOf(s, bundle);
  const parts = picked ?? bundle.slots.map((slot) => singleFor(s, slot, bundle.days));
  return parts.every(Boolean) ? parts.reduce((n, p) => n + (p?.amount ?? 0), 0) : 0;
}

/** 묶음이 고른 구성 상품(자리 순서). 하나라도 없거나 자리 수와 다르면 null */
export function bundlePartsOf(s: PricingSettings, bundle: Pick<CatalogProduct, "slots" | "parts">): CatalogProduct[] | null {
  if (!bundle.parts || bundle.parts.length !== bundle.slots.length) return null;
  const found = bundle.slots.map((slot) => s.products.find((p) => bundle.parts?.includes(p.id) && !isBundleProduct(p) && p.slots[0] === slot) ?? null);
  return found.every(Boolean) ? (found as CatalogProduct[]) : null;
}

/** 묶음으로 바꿀 때 채울 구성 상품 — 자리마다 같은 기간 낱개(없으면 그 자리 첫 낱개) */
export function defaultBundleParts(s: PricingSettings, slots: CatalogProduct["slots"], days: number): string[] {
  return slots.map((slot) => singleFor(s, slot, days)?.id).filter((id): id is string => Boolean(id));
}

/** 멤버십 이용권을 낱개 정가로 환산한 값(이용권 한 장 = 인디 목록 자리 하나 CREDIT_DAYS 일) */
export function creditsListValue(s: PricingSettings, creditDays: number): number {
  return s.membership.boostCredits * (singleFor(s, "indie_top", creditDays)?.amount ?? 0);
}

/** 요금 카드 갈래. 낱개는 자리 하나, 묶음은 자리 둘 */
export type AdTier = "boost" | "pin" | "bundle";

function tierOf(p: CatalogProduct): AdTier {
  return isBundleProduct(p) ? "bundle" : p.slots[0] === "indie_top" ? "boost" : "pin";
}

/** 그 갈래의 대표 상품 — 판매 중인 첫 상품(관리자 목록 순서), 없으면 첫 상품. 요금 카드는 이 상품의 값을 보인다 */
export function representative(s: PricingSettings, tier: AdTier): CatalogProduct | null {
  const of = s.products.filter((p) => tierOf(p) === tier);
  return of.find((p) => p.active) ?? of[0] ?? null;
}

/** 요금 카드 셋 중 지금 파는 것. 낱개는 둘 중 하나라도 팔면 선다 */
export function sellingTiers(s: PricingSettings): { single: boolean; bundle: boolean; membership: boolean } {
  const selling = (t: AdTier) => s.products.some((p) => p.active && tierOf(p) === t);
  return { single: selling("boost") || selling("pin"), bundle: selling("bundle"), membership: s.membership.active };
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

/** 상품이 없는 갈래의 자리 값. 그 카드는 sellingTiers 가 끄므로 보이지 않는다 */
const NO_QUOTE: Quote = { amount: 0, regular: 0, promoLabel: null, promoTone: null };

export function priceBook(s: PricingSettings, buyer: { productsPaid: boolean; membershipPaid: boolean }, now: Date): PriceBook {
  const product = { everPaid: buyer.productsPaid };
  const of = (t: AdTier) => {
    const p = representative(s, t);
    return p ? quote(s, p.id, product, now) : NO_QUOTE;
  };
  return {
    boost: of("boost"),
    pin: of("pin"),
    bundle: of("bundle"),
    membership: quote(s, MEMBERSHIP_KEY, { everPaid: buyer.membershipPaid }, now),
    bundleList: bundleListPrice(s),
  };
}

/** 설정을 못 읽은 화면(테스트, 정적 자리)이 쓰는 값 */
export const DEFAULT_PRICE_BOOK = priceBook(PRICING_DEFAULTS, { productsPaid: true, membershipPaid: true }, new Date(0));
