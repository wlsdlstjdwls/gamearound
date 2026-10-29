// 상품등록, 프로모션등록의 저장 검사 — 칸별 오류 문구까지(2026-10-31, 사용자 "저장 있는 화면은 유효성 체크, 비율인데 100% 를 넘어간다거나").
//
// 읽기 스키마(pricingSettingsSchema)에 없는 규칙은 저장 스키마(pricingSaveSchema)에만 더한다. 읽기 스키마에 넣으면 이미 저장된 값이
// 새 규칙에 걸리는 순간 통째로 기본값으로 물러나 요금 화면이 바뀐다(settings 의 parsePricingSettings) — 새 규칙은 다음 저장부터 막는다.
// 폼(pricing-form)과 저장 액션이 이 파일 하나를 쓴다. 액션은 첫 오류 문구를 돌려준다.
import { fieldErrors, VALIDATION_MESSAGES as V, type FieldErrors } from "@/lib/admin/validation";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { isBundleProduct, MAX_CHARGE, MAX_PERCENT, MAX_PRODUCT_DAYS, MEMBERSHIP_KEY, MIN_CHARGE, pricingSettingsSchema, type PricingSettings } from "@/lib/pricing/settings";
import { bundlePartsOf } from "@/lib/pricing/quote";

/** 이 프로모션 대상의 정가. 지운 상품이면 null */
function regularOf(s: PricingSettings, target: string): number | null {
  if (target === MEMBERSHIP_KEY) return s.membership.amount;
  return s.products.find((p) => p.id === target)?.amount ?? null;
}

export const pricingSaveSchema = pricingSettingsSchema.superRefine((s, ctx) => {
  // 값 지정 할인이 정가 이상이면 quote 가 버린다 — 켜 둔 프로모션이 아무 일도 안 하는데 화면은 "진행 중" 이라 말한다
  s.promotions.forEach((p, i) => {
    const regular = regularOf(s, p.target);
    if (p.kind === "price" && regular !== null && p.value >= regular) ctx.addIssue({ code: "custom", path: ["promotions", i, "value"], message: M.errPriceNotBelow });
  });
  // 묶음은 자리마다 낱개 하나를 구성 상품으로 고른다 — 고르지 않으면 그을 값(낱개 합)을 무엇으로 셀지 관리자가 모른다
  s.products.forEach((p, i) => {
    if (isBundleProduct(p) && !bundlePartsOf(s, p)) ctx.addIssue({ code: "custom", path: ["products", i, "parts"], message: M.errBundleParts });
  });
  // 같은 이름의 상품 둘은 구매 화면 고르기 칸에서 갈리지 않는다
  const seen = new Set<string>();
  s.products.forEach((p, i) => {
    const key = p.name.trim();
    if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["products", i, "name"], message: M.errDuplicateName });
    seen.add(key);
  });
});

/** 칸별 오류. 경로는 "products.2.amount", "promotions.0.value" 꼴 */
export function pricingErrors(s: PricingSettings): FieldErrors {
  const custom: Record<string, string> = {};
  s.promotions.forEach((p, i) => {
    // 할인 값 칸의 refine(비율 상한, 값 하한)은 스키마 문구가 없어 방식에 맞춰 말한다
    custom[`promotions.${i}.value`] =
      p.kind === "percent" ? (p.value > MAX_PERCENT ? V.max(MAX_PERCENT, "%") : V.min(1, "%")) : p.value < MIN_CHARGE ? V.min(MIN_CHARGE, M.won) : M.errPriceNotBelow;
    custom[`promotions.${i}.endsOn`] = M.errEndBeforeStart;
  });
  custom.promotions = M.errTargetGone;
  // 값, 기간 칸은 단위를 붙여 말한다(원, 일)
  const won = (n: number) => (n < MIN_CHARGE ? V.min(MIN_CHARGE, M.won) : V.max(MAX_CHARGE, M.won));
  s.products.forEach((p, i) => {
    custom[`products.${i}.amount`] = won(p.amount);
    custom[`products.${i}.days`] = p.days < 1 ? V.min(1, M.daysUnit) : V.max(MAX_PRODUCT_DAYS, M.daysUnit);
    custom[`products.${i}.parts`] = M.errBundleParts;
  });
  custom["membership.amount"] = won(s.membership.amount);
  return fieldErrors(pricingSaveSchema.safeParse(s), custom);
}
