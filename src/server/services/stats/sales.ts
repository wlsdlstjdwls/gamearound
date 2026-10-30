// 매출현황 질의(2026-10-30). 결제(payments) 한 표에서 날짜별, 상품별 합을 낸다.
//
// 셈 규칙은 결제/환불관리 머리 숫자(services/payments/history 의 getPaymentSummaryForAdmin)와 같다:
//   결제 = 승인된 결제(paid, 그 뒤 환불된 canceled 포함)를 승인일에 센다. 환불 = 돌려준 금액을 환불일에 센다.
//   순매출 = 결제 - 환불(같은 기간). 환불한 결제가 결제 칸에서 빠지지 않는 이유: 그날 들어온 돈은 들어온 돈이고, 돌려준 날은 따로 있다.
// 날짜는 한국 날짜로 묶는다. 질의를 한 번에 보낸다(db.batch) — 왕복 한 번(neon-roundtrip-cost).
import "server-only";
import { and, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { memberships, payments } from "@/server/db/schema";
import { daySeries, periodRange, previousPeriod, type Period } from "@/lib/stats/period";
import { paymentProductName } from "@/server/services/payments";
import { getPricingSettings } from "@/server/services/settings";
import { kstDay } from "./kst-day";

/** 결제로 센 상태 */
const PAID = ["paid", "canceled"] as const;
/** 지금 구독 중으로 센 상태(해지 예약도 아직 이용 중이다) */
const LIVE_MEMBERSHIP = ["active", "canceling"] as const;

export interface SalesDay {
  day: string;
  count: number;
  paid: number;
  refunded: number;
  net: number;
}

export interface SalesByProduct {
  product: string;
  name: string;
  count: number;
  paid: number;
  refunded: number;
}

export interface SalesStats {
  period: Period;
  days: SalesDay[];
  products: SalesByProduct[];
  totals: { count: number; paid: number; refunded: number; net: number };
  previous: { paid: number; net: number };
  liveMemberships: number;
}

export async function getSalesStats(period: Period): Promise<SalesStats> {
  const db = getDb();
  const { start, end } = periodRange(period);
  const prev = periodRange(previousPeriod(period));
  const paidIn = (s: Date, e: Date) => and(inArray(payments.status, [...PAID]), gte(payments.approvedAt, s), lt(payments.approvedAt, e));
  const refundIn = (s: Date, e: Date) => and(sql`${payments.refundedAmount} > 0`, gte(payments.refundedAt, s), lt(payments.refundedAt, e));

  const [paidDays, refundDays, byProduct, prevPaid, prevRefund, live] = await db.batch([
    db
      .select({ day: kstDay(payments.approvedAt), count: sql<number>`count(*)::int`, amount: sql<number>`coalesce(sum(${payments.amount}), 0)::int` })
      .from(payments)
      .where(paidIn(start, end))
      .groupBy(kstDay(payments.approvedAt)),
    db
      .select({ day: kstDay(payments.refundedAt), amount: sql<number>`coalesce(sum(${payments.refundedAmount}), 0)::int` })
      .from(payments)
      .where(refundIn(start, end))
      .groupBy(kstDay(payments.refundedAt)),
    db
      .select({
        product: payments.product,
        count: sql<number>`count(*)::int`,
        paid: sql<number>`coalesce(sum(${payments.amount}), 0)::int`,
        refunded: sql<number>`coalesce(sum(${payments.refundedAmount}), 0)::int`,
      })
      .from(payments)
      .where(paidIn(start, end))
      .groupBy(payments.product),
    db.select({ n: sql<number>`coalesce(sum(${payments.amount}), 0)::int` }).from(payments).where(paidIn(prev.start, prev.end)),
    db.select({ n: sql<number>`coalesce(sum(${payments.refundedAmount}), 0)::int` }).from(payments).where(refundIn(prev.start, prev.end)),
    db.select({ n: sql<number>`count(*)::int` }).from(memberships).where(inArray(memberships.status, [...LIVE_MEMBERSHIP])),
  ]);

  const paidBy = new Map(paidDays.map((r) => [r.day, r]));
  const refundBy = new Map(refundDays.map((r) => [r.day, r.amount]));
  const days = daySeries(period).map((day) => {
    const p = paidBy.get(day);
    const refunded = refundBy.get(day) ?? 0;
    const paid = p?.amount ?? 0;
    return { day, count: p?.count ?? 0, paid, refunded, net: paid - refunded };
  });
  const totals = days.reduce((t, d) => ({ count: t.count + d.count, paid: t.paid + d.paid, refunded: t.refunded + d.refunded, net: t.net + d.net }), { count: 0, paid: 0, refunded: 0, net: 0 });
  const settings = await getPricingSettings();
  const pPaid = prevPaid[0]?.n ?? 0;
  return {
    period,
    days,
    products: byProduct.map((r) => ({ ...r, name: paymentProductName(r.product, settings) })).sort((a, b) => b.paid - a.paid),
    totals,
    previous: { paid: pPaid, net: pPaid - (prevRefund[0]?.n ?? 0) },
    liveMemberships: live[0]?.n ?? 0,
  };
}
