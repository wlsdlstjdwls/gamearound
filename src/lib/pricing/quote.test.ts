import { describe, expect, it } from "vitest";
import { bundleListPrice, discountRate, perDay, priceBook, promotionLive, quote } from "@/lib/pricing/quote";
import { PRICING_DEFAULTS, parsePricingSettings, fillCopy, type PricingSettings, type Promotion } from "@/lib/pricing/settings";

const now = new Date("2026-10-28T03:00:00Z");
const promo = (p: Partial<Promotion>): Promotion => ({ id: "p", active: true, label: "할인", target: "boost_indie_7d", kind: "percent", value: 10, audience: "all", startsOn: null, endsOn: null, ...p });
const withPromos = (promotions: Promotion[]): PricingSettings => ({ ...PRICING_DEFAULTS, promotions });

describe("quote", () => {
  it("멤버십 첫 달 할인은 처음 가입하는 사람의 첫 청구에만", () => {
    expect(quote(PRICING_DEFAULTS, "membership", { everPaid: false }, now)).toEqual({ amount: 9_900, regular: 19_900, promoLabel: "첫 달 할인" });
    expect(quote(PRICING_DEFAULTS, "membership", { everPaid: true }, now).amount).toBe(19_900);
    // 갱신(first=false)은 언제나 정가
    expect(quote(PRICING_DEFAULTS, "membership", { everPaid: false }, now, false).amount).toBe(19_900);
  });
  it("비율 할인은 10원 단위로 내린다", () => {
    expect(quote(withPromos([promo({ value: 15 })]), "boost_indie_7d", { everPaid: true }, now).amount).toBe(5_860);
  });
  it("여럿 걸리면 가장 싼 하나만(겹쳐 깎지 않는다)", () => {
    const s = withPromos([promo({ id: "a", value: 10 }), promo({ id: "b", value: 30, label: "큰 할인" })]);
    expect(quote(s, "boost_indie_7d", { everPaid: true }, now)).toEqual({ amount: 4_830, regular: 6_900, promoLabel: "큰 할인" });
  });
  it("정가보다 비싼 프로모션 값은 버린다", () => {
    expect(quote(withPromos([promo({ kind: "price", value: 8_000 })]), "boost_indie_7d", { everPaid: true }, now).amount).toBe(6_900);
  });
  it("꺼진, 기간 밖, 다른 상품 프로모션은 걸리지 않는다", () => {
    const s = withPromos([promo({ active: false }), promo({ startsOn: "2026-11-01" }), promo({ endsOn: "2026-10-27" }), promo({ target: "pin_promo_7d" })]);
    expect(quote(s, "boost_indie_7d", { everPaid: false }, now).promoLabel).toBeNull();
  });
});

describe("promotionLive", () => {
  it("한국 날짜 끝까지 살아 있다", () => {
    const p = promo({ endsOn: "2026-10-28" });
    expect(promotionLive(p, new Date("2026-10-28T14:59:59Z"))).toBe(true);
    expect(promotionLive(p, new Date("2026-10-28T15:00:00Z"))).toBe(false);
  });
});

describe("값 계산", () => {
  it("묶음 그을 값은 낱개 정가 합, 할인율은 내림", () => {
    expect(bundleListPrice(PRICING_DEFAULTS)).toBe(13_800);
    expect(discountRate(13_800, 9_900)).toBe(28);
    expect(discountRate(100, 120)).toBe(0);
    expect(perDay(19_900, 30)).toBe(663);
  });
  it("priceBook 은 상품, 멤버십 처지를 따로 본다", () => {
    const b = priceBook(PRICING_DEFAULTS, { productsPaid: true, membershipPaid: false }, now);
    expect(b.membership.amount).toBe(9_900);
    expect(b.bundle.amount).toBe(9_900);
    expect(b.bundleList).toBe(13_800);
  });
});

describe("parsePricingSettings, fillCopy", () => {
  it("모양이 틀리면 기본값", () => {
    expect(parsePricingSettings({ products: {} })).toBe(PRICING_DEFAULTS);
    expect(parsePricingSettings(PRICING_DEFAULTS)).toEqual(PRICING_DEFAULTS);
  });
  it("100% 할인, 최소 금액 아래 값은 받지 않는다", () => {
    expect(parsePricingSettings(withPromos([promo({ value: 100 })]))).toBe(PRICING_DEFAULTS);
    expect(parsePricingSettings(withPromos([promo({ kind: "price", value: 50 })]))).toBe(PRICING_DEFAULTS);
  });
  it("{이름} 을 채우고 모르는 이름은 둔다", () => {
    expect(fillCopy("{saving} 싸요 {x}", { saving: "3,900원" })).toBe("3,900원 싸요 {x}");
  });
});
