// 환불(2026-10-27, 기획서 8장 "환불 요청", "결제와 환불 처리", "환불(전액, 일할)").
//
// 사용자는 요청만 한다 — 돈은 관리자가 사유를 보고 돌려준다. 요청 버튼이 곧 환불이면 7일을 다 쓰고 전액을 돌려받는 길이 열린다.
// 관리자는 전액 또는 남은 기간 몫(lib/payments/refund)을 고른다. 순서: 토스 취소 → 결제 줄 canceled → 부스트 회수 → 알림함.
// 멤버십 청구를 환불하면 그 멤버십을 바로 끝낸다(이용권 0, 빌링키 지움) — 돈을 돌려받고 혜택이 남는 길을 닫는다.
// 멤버십 청구는 빌링 키(API 개별 연동)로 승인됐으니 취소도 그 키로 한다(server/payments/toss 의 TOSS_BILLING_SECRET_KEY_ENV).
// 토스가 거절하면 DB 는 그대로다. 토스는 됐는데 그 뒤가 끊기면 같은 단추를 다시 누르면 된다 — 취소 요청에 멱등 키를 붙여
// 토스가 두 번 돌려주지 않고, 결제 줄 갱신은 paid 일 때만 간다.
import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { updatedBy } from "@/server/db/audit";
import { payments, promotionBoosts } from "@/server/db/schema";
import { cancelTossPayment, TOSS_BILLING_SECRET_KEY_ENV, TOSS_SECRET_KEY_ENV } from "@/server/payments/toss";
import { endMembership } from "@/server/services/membership/charge";
import { pushNotification } from "@/server/services/notifications";
import { paymentRefundBasis, proratedRefund } from "@/lib/payments/refund";
import { MEMBERSHIP_PLANS, type MembershipPlanKey } from "@/lib/membership/plan";
import { PAYMENT_MESSAGES as M } from "@/lib/payments/messages";
import { PRODUCTS, type ProductKey } from "@/lib/payments/products";
import { formatPrice } from "@/lib/currency";
import { ROUTES } from "@/lib/routes";

/** 사용자 요청 메모 상한. 사유 한두 줄이면 된다 */
export const REFUND_NOTE_MAX = 300;

export type RefundMode = "full" | "prorated";

/** 내 승인된 결제에 환불 요청. 이미 요청했거나 환불된 결제는 그대로 둔다 */
export async function requestRefund(userId: string, orderId: string, note: string): Promise<void> {
  const updated = await getDb()
    .update(payments)
    .set({ refundRequestedAt: new Date(), refundRequestNote: note.trim().slice(0, REFUND_NOTE_MAX) || null, ...updatedBy("user", userId) })
    .where(and(eq(payments.orderId, orderId), eq(payments.userId, userId), eq(payments.status, "paid"), isNull(payments.refundRequestedAt)))
    .returning({ id: payments.id });
  if (updated.length === 0) throw new Error(M.refundNotAllowed);
}

/** 관리자 환불. 돌려준 금액을 돌려준다 */
export async function refundPayment(orderId: string, mode: RefundMode, reason: string, adminId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ p: payments, boost: promotionBoosts })
    .from(payments)
    .leftJoin(promotionBoosts, eq(promotionBoosts.id, payments.boostId))
    .where(eq(payments.orderId, orderId))
    .limit(1);
  if (!row || row.p.status !== "paid" || !row.p.paymentKey) throw new Error(M.refundNotAllowed);
  const { p, boost } = row;
  const now = new Date();
  const amount = mode === "full" ? p.amount : proratedRefund(p.amount, paymentRefundBasis(p, boost), now);
  if (amount <= 0) throw new Error(M.refundNothingLeft);

  await cancelTossPayment({
    paymentKey: p.paymentKey!,
    reason: reason || M.refundDefaultReason,
    amount: amount < p.amount ? amount : undefined,
    // 금액까지 열쇠에 넣는다 — 일할로 시도했다 실패한 뒤 전액으로 바꾸면 다른 요청이어야 한다(같은 열쇠에 다른 본문은 토스가 거절한다)
    idempotencyKey: `refund-${p.orderId}-${amount}`,
    secretEnv: p.membershipId ? TOSS_BILLING_SECRET_KEY_ENV : TOSS_SECRET_KEY_ENV,
  });

  const claimed = await db
    .update(payments)
    .set({ status: "canceled", refundedAmount: amount, refundedAt: now, refundReason: reason || null, ...updatedBy("admin", adminId) })
    .where(and(eq(payments.id, p.id), eq(payments.status, "paid")))
    .returning({ id: payments.id });
  if (claimed.length === 0) return amount;
  if (p.boostId) {
    await db
      .update(promotionBoosts)
      .set({ revokedAt: now, ...updatedBy("admin", adminId) })
      .where(and(eq(promotionBoosts.id, p.boostId), isNull(promotionBoosts.revokedAt)));
  }
  if (p.membershipId) await endMembership(p.membershipId, now, { source: "admin", userId: adminId });
  const name = PRODUCTS[p.product as ProductKey]?.name ?? MEMBERSHIP_PLANS[p.product as MembershipPlanKey]?.name ?? p.product;
  await pushNotification(p.userId, "payment", M.refundedNotice(name, formatPrice(amount)), ROUTES.indiePayments).catch(() => {});
  return amount;
}
