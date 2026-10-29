// /admin/payments — 결제와 환불(2026-10-29). 광고 화면 아래에 붙어 있던 결제 목록을 뗐다(사용자 "서비스 기획 관점으로").
// 결제는 광고만이 아니라 메이커 멤버십 청구도 담는다 — 광고 화면 아래에 두면 멤버십 환불을 하러 광고 화면으로 가야 했다.
// 위는 이번 달 숫자 넷(services/payments 의 getPaymentSummaryForAdmin), 아래는 최근 결제 목록과 환불 단추.
// 부스트가 안 걸린 결제는 빨갛게 — 돈은 빠졌는데 노출이 없는 상태라 손으로 걸어야 한다. 환불하면 걸린 부스트도 그 자리에서 거둔다(services/payments/refunds).
import type { Metadata } from "next";
import { AdminLead } from "@/components/admin/admin-lead";
import { RefundControls } from "@/components/admin/refund-controls";
import { StatTiles } from "@/components/admin/stat-tiles";
import { DataCell, DataHead, DataList, DataRow } from "@/components/admin/data-rows";
import { PageHead } from "@/components/ui/page";
import { PAYMENT_COLS } from "@/lib/admin/table-cols";
import { Tag } from "@/components/ui/tag";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { formatAmount, formatPrice } from "@/lib/currency";
import { formatDateTime } from "@/lib/format";
import { PAYMENT_MESSAGES as PM, PAYMENT_STATUS_LABEL } from "@/lib/payments/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getPaymentSummaryForAdmin, listPaymentsForAdmin } from "@/server/services/payments";

export const metadata: Metadata = { title: ADMIN_NAV.payments };

export default async function AdminPaymentsPage() {
  await requireRoleOrForbid("admin");
  const [paid, sum] = await Promise.all([listPaymentsForAdmin(), getPaymentSummaryForAdmin()]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <PageHead size="admin" title={ADMIN_NAV.payments} />
        <AdminLead>{PM.adminLead}</AdminLead>
      </div>

      <StatTiles
        tiles={[
          { label: PM.adminStatMonth, value: formatAmount(sum.monthPaid), hint: PM.adminStatMonthHint(sum.monthCount) },
          { label: PM.adminStatRefunded, value: formatAmount(sum.monthRefunded) },
          { label: PM.adminStatRequests, value: PM.adminStatCount(sum.refundRequests), tone: sum.refundRequests > 0 ? "danger" : undefined },
          { label: PM.adminStatMissing, value: PM.adminStatCount(sum.boostMissing), tone: sum.boostMissing > 0 ? "danger" : undefined },
        ]}
      />

      <section aria-labelledby="payments-list" className="flex flex-col gap-2">
        <h2 id="payments-list" className="text-[15px] font-bold text-ink">
          {PM.adminTitle}
        </h2>
        {paid.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-mut">{PM.adminEmpty}</p>
        ) : (
          // 칸 맞춘 표(2026-10-29, data-rows) — 금액이 한 세로줄에 서야 훑어 내려가며 견준다. 손이 필요한 결제(환불 요청, 광고 안 걸림)는 빨갛게 말한다
          <div className="flex flex-col gap-1">
            <DataHead cols={PAYMENT_COLS} labels={[PM.adminColItem, PM.adminColBuyer, PM.adminColPaidAt, PM.adminColAmount, PM.adminColAction]} />
            <DataList>
              {paid.map((p) => (
                <DataRow key={p.orderId} cols={PAYMENT_COLS}>
                  <DataCell label={PM.adminColItem}>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {p.status === "canceled" && <Tag tone="warn">{PAYMENT_STATUS_LABEL.canceled}</Tag>}
                      {p.status === "paid" && p.refundRequested && <Tag tone="danger">{PM.adminRefundRequested}</Tag>}
                      <span className="min-w-0 break-words font-semibold">{p.targetTitle ?? p.productName}</span>
                    </span>
                    {p.targetTitle && <span className="block text-[12px] text-dim">{p.productName}</span>}
                    {p.boostMissing && <span className="block text-[12px] text-danger">{PM.adminBoostMissing}</span>}
                    {p.refundRequestNote && <span className="block break-words text-[12px] text-mut">{p.refundRequestNote}</span>}
                  </DataCell>
                  <DataCell label={PM.adminColBuyer} className="break-words text-mut">
                    {p.buyer}
                  </DataCell>
                  <DataCell label={PM.adminColPaidAt} className="tabular-nums text-mut">
                    {formatDateTime(p.createdAt)}
                    {/* 주문 번호는 토스 대조용이라 작게 둔다 */}
                    <span className="block truncate text-[11px] text-dim-2">{p.orderId}</span>
                  </DataCell>
                  <DataCell label={PM.adminColAmount} className="tabular-nums md:text-right">
                    <span className="block font-bold">{formatPrice(p.amount)}</span>
                    {p.refundedAmount > 0 && <span className="block text-[12px] text-mut">{PM.refunded(formatPrice(p.refundedAmount))}</span>}
                  </DataCell>
                  <DataCell label={PM.adminColAction}>{p.status === "paid" ? <RefundControls orderId={p.orderId} amount={p.amount} prorated={p.proratedAmount} /> : <span className="text-dim-2">-</span>}</DataCell>
                </DataRow>
              ))}
            </DataList>
          </div>
        )}
      </section>
    </div>
  );
}
