// 결제 내역 읽기(2026-10-27) — 내 결제 내역(/indie/mine/payments)과 관리자 결제와 환불(/admin/payments, 2026-10-29 광고 자리 화면에서 뗐다).
// 대상 이름은 대상 표가 둘이라(인디 게임 글, 게시판 홍보 글) 둘 다 left join 해 있는 쪽을 쓴다. 대상이 지워지면 이름이 비고 화면이 "없는 글" 로 적는다.
import "server-only";
import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { indiePosts, payments, posts, promotionBoosts, users, type PaymentStatus } from "@/server/db/schema";
import { PRODUCTS, type ProductKey } from "@/lib/payments/products";
import { paymentRefundBasis, proratedRefund } from "@/lib/payments/refund";
import { MEMBERSHIP_PLANS, type MembershipPlanKey } from "@/lib/membership/plan";

/** 내 결제 내역, 관리자 결제 목록 한 화면 */
const PAYMENT_LIST_LIMIT = 50;

export type PaymentRowDto = {
  orderId: string;
  productName: string;
  amount: number;
  status: PaymentStatus;
  targetTitle: string | null;
  receiptUrl: string | null;
  failMessage: string | null;
  createdAt: Date;
  /** 승인은 됐는데 부스트가 안 걸린 주문(orders 머리 주석). 관리자가 손으로 건다 */
  boostMissing: boolean;
  /** 돌려준 금액. 0 이면 환불 없음 */
  refundedAmount: number;
  /** 사용자가 환불을 요청했나, 그 메모 */
  refundRequested: boolean;
  refundRequestNote: string | null;
  /** 지금 환불하면 남은 기간 몫(관리자 단추에 적는다). 승인된 결제에만 의미가 있다 */
  proratedAmount: number;
  buyer?: string;
};

function productName(key: string): string {
  return PRODUCTS[key as ProductKey]?.name ?? MEMBERSHIP_PLANS[key as MembershipPlanKey]?.name ?? key;
}

const rowSelect = { p: payments, indieTitle: indiePosts.title, postTitle: posts.title, boost: promotionBoosts };
type Row = { p: typeof payments.$inferSelect; indieTitle: string | null; postTitle: string | null; boost: typeof promotionBoosts.$inferSelect | null };

function toDto({ p, indieTitle, postTitle, boost }: Row, now: Date, buyer?: string): PaymentRowDto {
  return {
    orderId: p.orderId,
    productName: productName(p.product),
    amount: p.amount,
    status: p.status,
    // 멤버십 청구는 대상 글이 없다 — 요금제 이름을 대상 자리에 둔다
    targetTitle: p.membershipId ? productName(p.product) : (indieTitle ?? postTitle),
    receiptUrl: p.receiptUrl,
    failMessage: p.failMessage,
    createdAt: p.createdAt,
    // 묶음은 둘째까지 걸려야 끝이다
    boostMissing: p.status === "paid" && (!p.boostId || (Boolean(p.extraTargetId) && !p.extraBoostId)),
    refundedAmount: p.refundedAmount,
    refundRequested: Boolean(p.refundRequestedAt),
    refundRequestNote: p.refundRequestNote,
    proratedAmount: p.status === "paid" ? proratedRefund(p.amount, paymentRefundBasis(p, boost), now) : 0,
    buyer,
  };
}

/**
 * 내 결제 내역, 최신부터. 대기(pending) 주문은 빼고 보인다 — 결제창을 열었다 닫을 때마다 한 줄씩 생겨
 * "결제 중" 이 영영 쌓인다(2026-10-27 실측: 시험 한 번에 넷). 승인으로 이어진 주문은 paid 로 바뀌어 보이고,
 * 창 안에서 실패한 주문은 failed 로 사유와 함께 보인다
 */
export async function listMyPayments(userId: string): Promise<PaymentRowDto[]> {
  const rows = await getDb()
    .select(rowSelect)
    .from(payments)
    .leftJoin(indiePosts, and(eq(payments.targetKind, "indie_post"), eq(indiePosts.id, payments.targetId)))
    .leftJoin(posts, and(eq(payments.targetKind, "board_post"), eq(posts.id, payments.targetId)))
    .leftJoin(promotionBoosts, eq(promotionBoosts.id, payments.boostId))
    .where(and(eq(payments.userId, userId), ne(payments.status, "pending")))
    .orderBy(desc(payments.createdAt))
    .limit(PAYMENT_LIST_LIMIT);
  const now = new Date();
  return rows.map((r) => toDto(r, now));
}

/** 관리자 결제 목록 — 승인, 환불된 결제만. 대기, 실패는 창만 열고 닫은 것이 대부분이라 쌓이면 볼 것이 묻힌다 */
export async function listPaymentsForAdmin(): Promise<PaymentRowDto[]> {
  const rows = await getDb()
    .select({ ...rowSelect, email: users.email })
    .from(payments)
    .innerJoin(users, eq(users.id, payments.userId))
    .leftJoin(indiePosts, and(eq(payments.targetKind, "indie_post"), eq(indiePosts.id, payments.targetId)))
    .leftJoin(posts, and(eq(payments.targetKind, "board_post"), eq(posts.id, payments.targetId)))
    .leftJoin(promotionBoosts, eq(promotionBoosts.id, payments.boostId))
    .where(inArray(payments.status, ["paid", "canceled"]))
    .orderBy(desc(payments.createdAt))
    .limit(PAYMENT_LIST_LIMIT);
  const now = new Date();
  return rows.map((r) => toDto(r, now, r.email));
}

/** 관리자 결제와 환불 머리 숫자. 이번 달은 한국 달이다. 목록(50줄)으로 세면 결제가 쌓인 달에 모자라 따로 한 번 센다 */
export type PaymentSummaryDto = { monthPaid: number; monthCount: number; monthRefunded: number; refundRequests: number; boostMissing: number };

export async function getPaymentSummaryForAdmin(): Promise<PaymentSummaryDto> {
  const kstMonth = (col: unknown) => sql`date_trunc('month', (${col}) at time zone 'Asia/Seoul') = date_trunc('month', now() at time zone 'Asia/Seoul')`;
  const [row] = await getDb()
    .select({
      // 환불된 결제도 그달에 들어온 돈으로 센다 — 돌려준 돈은 옆 칸이 따로 센다
      monthPaid: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} in ('paid', 'canceled') and ${kstMonth(payments.approvedAt)}), 0)::int`,
      monthCount: sql<number>`(count(*) filter (where ${payments.status} in ('paid', 'canceled') and ${kstMonth(payments.approvedAt)}))::int`,
      monthRefunded: sql<number>`coalesce(sum(${payments.refundedAmount}) filter (where ${kstMonth(payments.refundedAt)}), 0)::int`,
      refundRequests: sql<number>`(count(*) filter (where ${payments.status} = 'paid' and ${payments.refundRequestedAt} is not null))::int`,
    })
    .from(payments);
  // 노출이 안 걸린 결제: 목록 줄의 boostMissing 과 같은 규칙(묶음이면 둘째 자리까지). 상품 결제(대상이 있는 줄)만 센다 — 멤버십 청구는 걸 자리가 없다
  const [miss] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(payments)
    .where(and(eq(payments.status, "paid"), sql`${payments.targetId} is not null`, or(isNull(payments.boostId), and(sql`${payments.extraTargetId} is not null`, isNull(payments.extraBoostId)))));
  return { ...row, boostMissing: miss?.n ?? 0 };
}
