import { describe, expect, it } from "vitest";
import { lockedPromotionEdits, promotionLocked, renewalCharge, type MembershipGrant } from "@/lib/pricing/promo-terms";
import { audienceMatches } from "@/lib/pricing/quote";
import { PRICING_DEFAULTS, type PricingSettings, type Promotion } from "@/lib/pricing/settings";

const now = new Date("2026-10-30T03:00:00Z");
const promo = (p: Partial<Promotion>): Promotion => ({ id: "m3", active: true, label: "3개월 할인", target: "membership", kind: "price", value: 9_900, audience: "first", months: 3, startsOn: null, endsOn: null, ...p });
const withPromos = (promotions: Promotion[]): PricingSettings => ({ ...PRICING_DEFAULTS, promotions });
const grant = (g: Partial<MembershipGrant>): MembershipGrant => ({ promoId: "m3", label: "3개월 할인", amount: 9_900, months: 3, paid: 1, ...g });

describe("renewalCharge", () => {
  it("받은 개월이 남았으면 받아 둔 값, 다 쓰면 정가로 돌아가고 혜택을 지운다", () => {
    const s = withPromos([promo({})]);
    expect(renewalCharge(grant({ paid: 1 }), s)).toEqual({ amount: 9_900, grant: grant({ paid: 2 }) });
    expect(renewalCharge(grant({ paid: 2 }), s)).toEqual({ amount: 9_900, grant: grant({ paid: 3 }) });
    expect(renewalCharge(grant({ paid: 3 }), s)).toEqual({ amount: 19_900, grant: null });
  });
  it("매달 계속(0)은 끝이 없다", () => {
    expect(renewalCharge(grant({ months: 0, paid: 40 }), withPromos([])).amount).toBe(9_900);
  });
  it("신규만 중지하면 기존 회원은 남은 개월을 받고, 기존 회원도 중지하면 정가", () => {
    expect(renewalCharge(grant({}), withPromos([promo({ active: false })])).amount).toBe(9_900);
    expect(renewalCharge(grant({}), withPromos([promo({ active: false, stopScope: "new" })])).amount).toBe(9_900);
    expect(renewalCharge(grant({}), withPromos([promo({ active: false, stopScope: "all" })]))).toEqual({ amount: 19_900, grant: null });
  });
  it("관리자가 나중에 할인 값을 바꿔도 가입 때 값을 지킨다, 정가가 더 낮으면 정가", () => {
    expect(renewalCharge(grant({}), withPromos([promo({ value: 15_000 })])).amount).toBe(9_900);
    const cheap = { ...withPromos([]), membership: { ...PRICING_DEFAULTS.membership, amount: 8_000 } };
    expect(renewalCharge(grant({}), cheap).amount).toBe(8_000);
  });
  it("받은 혜택이 없으면 정가", () => {
    expect(renewalCharge(null, withPromos([]))).toEqual({ amount: 19_900, grant: null });
  });
});

describe("audienceMatches", () => {
  it("첫 결제 회원, 재가입 회원, 전체 회원", () => {
    expect(audienceMatches("first", false)).toBe(true);
    expect(audienceMatches("first", true)).toBe(false);
    expect(audienceMatches("returning", true)).toBe(true);
    expect(audienceMatches("returning", false)).toBe(false);
    expect(audienceMatches("all", true)).toBe(true);
  });
});

describe("lockedPromotionEdits", () => {
  const started = promo({ startsOn: "2026-10-01" });
  const upcoming = promo({ id: "next", startsOn: "2026-11-15" });
  it("시작한 프로모션은 진행상태, 중지 범위만 바꿀 수 있다", () => {
    const before = withPromos([started, upcoming]);
    expect(lockedPromotionEdits(before, withPromos([{ ...started, active: false, stopScope: "all" }, upcoming]), now)).toEqual([]);
    expect(lockedPromotionEdits(before, withPromos([{ ...started, value: 5_000 }, upcoming]), now)).toEqual(["m3"]);
    expect(lockedPromotionEdits(before, withPromos([{ ...started, months: 6 }, upcoming]), now)).toEqual(["m3"]);
    expect(lockedPromotionEdits(before, withPromos([upcoming]), now)).toEqual(["m3"]);
  });
  it("시작 전 프로모션은 고칠 수 있다, 개월을 비운 것과 1은 같다", () => {
    const before = withPromos([upcoming, promo({ id: "old", months: undefined })]);
    expect(lockedPromotionEdits(before, withPromos([{ ...upcoming, value: 5_000 }, promo({ id: "old", months: 1 })]), now)).toEqual([]);
  });
  it("저장된 적 없는 줄은 잠그지 않는다", () => {
    expect(promotionLocked(undefined, now)).toBe(false);
    expect(promotionLocked(started, now)).toBe(true);
    expect(promotionLocked(upcoming, now)).toBe(false);
  });
});
