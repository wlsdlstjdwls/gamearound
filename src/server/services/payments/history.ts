// 결제 내역 읽기(2026-10-27) — 내 결제 내역(/indie/mine/payments)과 관리자 결제 목록(/admin/promotions).
// 대상 이름은 대상 표가 둘이라(인디 게임 글, 게시판 홍보 글) 둘 다 left join 해 있는 쪽을 쓴다. 대상이 지워지면 이름이 비고 화면이 "없는 글" 로 적는다.
import "server-only";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { indiePosts, payments, posts, promotionBoosts, users, type PaymentStatus } from "@/server/db/schema";
import { PRODUCTS, type ProductKey } from "@/lib/payments/products";
import { proratedRefund } from "@/lib/payments/refund";

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
  return PRODUCTS[key as ProductKey]?.name ?? key;
}

const rowSelect = { p: payments, indieTitle: indiePosts.title, postTitle: posts.title, boost: promotionBoosts };
type Row = { p: typeof payments.$inferSelect; indieTitle: string | null; postTitle: string | null; boost: typeof promotionBoosts.$inferSelect | null };

function toDto({ p, indieTitle, postTitle, boost }: Row, now: Date, buyer?: string): PaymentRowDto {
  return {
    orderId: p.orderId,
    productName: productName(p.product),
    amount: p.amount,
    status: p.status,
    targetTitle: indieTitle ?? postTitle,
    receiptUrl: p.receiptUrl,
    failMessage: p.failMessage,
    createdAt: p.createdAt,
    boostMissing: p.status === "paid" && !p.boostId,
    refundedAmount: p.refundedAmount,
    refundRequested: Boolean(p.refundRequestedAt),
    refundRequestNote: p.refundRequestNote,
    proratedAmount: p.status === "paid" ? proratedRefund(p.amount, boost, now) : 0,
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
