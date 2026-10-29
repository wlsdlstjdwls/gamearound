// /admin/payments — 결제와 환불(2026-10-29). 광고 화면 아래에 붙어 있던 결제 목록을 뗐다(사용자 "서비스 기획 관점으로").
// 결제는 광고만이 아니라 메이커 멤버십 청구도 담는다 — 광고 화면 아래에 두면 멤버십 환불을 하러 광고 화면으로 가야 했다.
// 위는 이번 달 숫자 넷(services/payments 의 getPaymentSummaryForAdmin), 아래는 최근 결제 목록과 환불 단추.
// 부스트가 안 걸린 결제는 빨갛게 — 돈은 빠졌는데 노출이 없는 상태라 손으로 걸어야 한다. 환불하면 걸린 부스트도 그 자리에서 거둔다(services/payments/refunds).
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { StatTiles } from "@/components/admin/stat-tiles";
import { PaymentsScreen } from "@/components/admin/payments-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { formatAmount } from "@/lib/currency";
import { PAYMENT_MESSAGES as PM } from "@/lib/payments/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getPaymentSummaryForAdmin, listPaymentsForAdmin } from "@/server/services/payments";

export const metadata: Metadata = { title: ADMIN_NAV.payments };

export default async function AdminPaymentsPage() {
  await requireRoleOrForbid("admin");
  const [paid, sum] = await Promise.all([listPaymentsForAdmin(), getPaymentSummaryForAdmin()]);

  return (
    <div className="flex flex-col gap-5">
      <AdminScreenHead title={ADMIN_NAV.payments} count={paid.length} />

      <StatTiles
        tiles={[
          { label: PM.adminStatMonth, value: formatAmount(sum.monthPaid), hint: PM.adminStatMonthHint(sum.monthCount) },
          { label: PM.adminStatRefunded, value: formatAmount(sum.monthRefunded) },
          { label: PM.adminStatRequests, value: PM.adminStatCount(sum.refundRequests), tone: sum.refundRequests > 0 ? "danger" : undefined },
          { label: PM.adminStatMissing, value: PM.adminStatCount(sum.boostMissing), tone: sum.boostMissing > 0 ? "danger" : undefined },
        ]}
      />

      {/* 백오피스 주문이력 꼴 — 조회조건, 결제 목록, 고른 결제 상세(components/admin/payments-screen) */}
      <PaymentsScreen rows={paid} />
    </div>
  );
}
