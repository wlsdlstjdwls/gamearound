import { describe, expect, it } from "vitest";
import { VALIDATION_MESSAGES as V } from "@/lib/admin/validation";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { pricingErrors } from "@/lib/pricing/admin-validation";
import { PRICING_DEFAULTS, type Promotion } from "@/lib/pricing/settings";

const promo = (over: Partial<Promotion>): Promotion => ({ id: "p1", active: true, label: "할인", target: "membership", kind: "percent", value: 10, audience: "all", startsOn: null, endsOn: null, ...over });
const withPromo = (p: Promotion) => ({ ...PRICING_DEFAULTS, promotions: [p] });

describe("pricingErrors", () => {
  it("기본값은 맞다", () => {
    expect(pricingErrors(PRICING_DEFAULTS)).toEqual({});
  });
  it("비율 할인은 90% 를 넘지 못한다", () => {
    expect(pricingErrors(withPromo(promo({ value: 120 })))).toEqual({ "promotions.0.value": V.max(90, "%") });
  });
  it("값 할인은 정가보다 낮아야 한다", () => {
    expect(pricingErrors(withPromo(promo({ kind: "price", value: 19_900 })))).toEqual({ "promotions.0.value": M.errPriceNotBelow });
    expect(pricingErrors(withPromo(promo({ kind: "price", value: 50 })))).toEqual({ "promotions.0.value": V.min(100, "원") });
  });
  it("종료일이 시작일보다 앞이면 종료일 칸", () => {
    expect(pricingErrors(withPromo(promo({ startsOn: "2026-11-02", endsOn: "2026-11-01" })))).toEqual({ "promotions.0.endsOn": M.errEndBeforeStart });
  });
  it("상품 칸 범위와 같은 이름", () => {
    const products = [{ ...PRICING_DEFAULTS.products[0], days: 120, amount: 50 }, { ...PRICING_DEFAULTS.products[1], name: PRICING_DEFAULTS.products[0].name }];
    expect(pricingErrors({ ...PRICING_DEFAULTS, products: [...products, PRICING_DEFAULTS.products[2]] })).toEqual({
      "products.0.days": V.max(90, "일"),
      "products.0.amount": V.min(100, "원"),
      "products.1.name": M.errDuplicateName,
    });
  });
});

describe("묶음 구성 상품", () => {
  it("구성 상품을 고르지 않은 묶음은 저장 검사에 걸린다", () => {
    const [a, b, bundle] = PRICING_DEFAULTS.products;
    expect(pricingErrors({ ...PRICING_DEFAULTS, products: [a, b, { ...bundle, parts: [a.id] }] })).toEqual({ "products.2.parts": M.errBundleParts });
  });
});
