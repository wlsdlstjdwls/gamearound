// /admin/discounts — 프로모션(2026-10-29). 구독상품 화면 맨 아래 판이던 것을 뗐다(사용자 "메뉴 이름 이쁘게, 서비스 기획 관점으로").
// 값을 정하는 일(구독상품)과 기간을 정해 깎아 주는 일은 여는 때가 다르다 — 값은 거의 안 바꾸고, 행사는 달마다 켜고 끈다.
// 저장 값은 같은 요금 설정 하나(lib/pricing/settings)라 폼도 같다(components/admin/pricing-form, part "discounts").
import type { Metadata } from "next";
import { PricingForm } from "@/components/admin/pricing-form";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getPricingSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: ADMIN_NAV.discounts };

export default async function AdminDiscountsPage() {
  await requireRoleOrForbid("admin");
  const settings = await getPricingSettings();
  // 제목, 설명, 요금 화면 열기, 저장은 폼 머리 툴바가 한 줄로 세운다(pricing-form 주석)
  return <PricingForm initial={settings} part="discounts" title={ADMIN_NAV.discounts} lead={M.discountsLead} />;
}
