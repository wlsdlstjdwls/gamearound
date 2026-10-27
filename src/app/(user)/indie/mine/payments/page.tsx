// /indie/mine/payments — 내 광고 결제 내역(2026-10-27, 기획서 8장 "결제 내역과 영수증").
// 결제창에서 돌아오면 이 화면으로 온다(?paid=1 또는 ?failed=문구, api/payments/toss). 맨 위에 그 결과를 한 줄로 말한다.
// 영수증은 토스가 주는 주소로 연다 — 우리가 영수증을 따로 만들지 않는다.
// 승인된 결제에는 "환불 요청" 을 둔다(요청만, 돈은 관리자가 돌려준다). 환불된 결제는 돌려준 금액을 적는다.
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { FormMessage } from "@/components/ui/form-message";
import { Page, PageHead, ROWS } from "@/components/ui/page";
import { Tag, type TagTone } from "@/components/ui/tag";
import { formatPrice } from "@/lib/currency";
import { formatDateTime } from "@/lib/format";
import { firstParam } from "@/lib/games-query";
import { INDIE_MESSAGES } from "@/lib/indie/messages";
import { PAYMENT_MESSAGES as M, PAYMENT_STATUS_LABEL } from "@/lib/payments/messages";
import { ROUTES } from "@/lib/routes";
import type { PaymentStatus } from "@/server/db/schema";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listMyPayments } from "@/server/services/payments";
import { RefundRequest } from "@/components/payments/refund-request";

export const metadata: Metadata = { title: M.historyTitle, robots: { index: false } };

const STATUS_TONE: Record<PaymentStatus, TagTone> = { pending: "info", paid: "ok", failed: "danger", canceled: "warn" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function IndiePaymentsPage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const [rows, sp] = await Promise.all([listMyPayments(user.id), searchParams]);
  const paid = firstParam(sp.paid);
  const failed = firstParam(sp.failed);

  return (
    <Page gap={20} width="tight">
      <PageHead title={M.historyTitle} action={<Link href={ROUTES.indieStats} className="tap inline-flex items-center text-[13.5px] font-semibold text-acc hover:underline">{M.toStats}</Link>}>
        <p className="text-[14px] text-mut">{M.historyLead}</p>
      </PageHead>
      {paid && <FormMessage tone="success">{M.paidBanner}</FormMessage>}
      {failed && <FormMessage tone="error">{M.failedBanner(failed)}</FormMessage>}

      {rows.length === 0 ? (
        <EmptyState title={M.historyEmpty} action={{ href: ROUTES.indieStats, label: M.toStats }} />
      ) : (
        <ul className={ROWS}>
          {rows.map((r) => (
            <li key={r.orderId} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={STATUS_TONE[r.status]}>{r.boostMissing ? M.boostMissing : PAYMENT_STATUS_LABEL[r.status]}</Tag>
                  <span className="min-w-0 break-words text-[14.5px] font-semibold text-ink">{r.targetTitle ?? INDIE_MESSAGES.notFound}</span>
                </div>
                <span className="text-[12.5px] text-dim tabular-nums">{[r.productName, formatDateTime(r.createdAt)].join(" | ")}</span>
                {r.status === "failed" && r.failMessage && <span className="text-[12.5px] text-danger">{r.failMessage}</span>}
                {r.refundedAmount > 0 && <span className="text-[12.5px] text-mut tabular-nums">{M.refunded(formatPrice(r.refundedAmount))}</span>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-[15px] font-bold tabular-nums text-ink">{formatPrice(r.amount)}</span>
                {r.receiptUrl && (
                  <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" className="tap inline-flex items-center text-[13px] font-semibold text-acc hover:underline">
                    {M.receipt}
                    <span className="sr-only">{INDIE_MESSAGES.newWindow}</span>
                  </a>
                )}
              </div>
              {r.status === "paid" && <RefundRequest orderId={r.orderId} requested={r.refundRequested} />}
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
