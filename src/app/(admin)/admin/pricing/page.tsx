// /admin/pricing — 요금, 프로모션(2026-10-28). 사용자: "첫 달 할인, 첫 결제 할인 같은 프로모션을 관리자가 설정하게,
// 구독 멤버십도 문구부터 모든 설정을 관리자가". 값, 판매 여부, 이용권 수, 요금 카드와 멤버십 화면 문구, 프로모션을 한 화면에서 고친다.
// 저장 값은 site_settings 의 pricing 키 하나(lib/pricing/settings). 폼은 components/admin/pricing-form.
import { AdminLead } from "@/components/admin/admin-lead";
import type { Metadata } from "next";
import Link from "next/link";
import { PricingForm } from "@/components/admin/pricing-form";
import { buttonClass } from "@/components/ui/button";
import { PageHead } from "@/components/ui/page";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { ROUTES } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getPricingSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: ADMIN_NAV.pricing };

export default async function AdminPricingPage() {
  await requireRoleOrForbid("admin");
  const settings = await getPricingSettings();
  return (
    <div className="flex flex-col gap-5">
      <PageHead
        size="admin"
        title={ADMIN_NAV.pricing}
        action={
          <Link href={ROUTES.makerPlans} className={buttonClass({ variant: "secondary", size: "sm" })}>
            {M.preview}
          </Link>
        }
      >
        <AdminLead>{M.lead}</AdminLead>
      </PageHead>
      <PricingForm initial={settings} />
    </div>
  );
}
