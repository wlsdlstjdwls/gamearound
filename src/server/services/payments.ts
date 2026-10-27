// 부스트 결제(2026-10-27, 기획서 5장 3단계, 토스페이먼츠 결제위젯). 주문 만들기 → (결제창) → 승인과 부스트 걸기 → 내 결제 내역.
//
// 금액은 언제나 서버가 정한다(lib/payments/products). 성공 주소로 돌아온 amount 는 주문 줄과 견주기만 하고, 다르면 승인하지 않는다.
// 승인은 한 번만 간다: 이미 paid 인 주문이 다시 오면(새로고침, 뒤로 가기) 토스를 다시 부르지 않고 그 결과를 돌려준다.
//
// 순서는 토스 승인 → 주문 paid → 부스트 걸기 → 주문에 부스트 잇기다. 이 드라이버는 묶음 트랜잭션이 없어 마지막 두 걸음 사이에서
// 끊기면 "돈은 냈는데 부스트가 없는" 주문이 남는다 — boostId 가 빈 paid 주문은 관리자 결제 목록에 그대로 드러나 손으로 건다.
import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { indiePosts, payments, promotionBoosts, users, type PaymentStatus } from "@/server/db/schema";
import { confirmTossPayment, TossError } from "@/server/payments/toss";
import { insertPurchasedBoost } from "@/server/services/promotions";
import { isPublic } from "@/server/services/indie/read";
import { makeOrderId, PRODUCTS, type ProductKey } from "@/lib/payments/products";
import { PAYMENT_MESSAGES as M } from "@/lib/payments/messages";

/** 주문 번호 무작위 부분 바이트 수. 16바이트(hex 32자)면 겹칠 일이 없다 */
const ORDER_RANDOM_BYTES = 16;
/** 내 결제 내역, 관리자 결제 목록 한 화면 */
const PAYMENT_LIST_LIMIT = 50;

export type BoostOrder = { orderId: string; amount: number; orderName: string; customerKey: string };

/** 결제창에 넘길 주문. 내 공개 인디 게임에만 — 남의 글이나 공개 전 글에는 살 수 없다 */
export async function createIndieBoostOrder(userId: string, postId: string, product: ProductKey = "boost_indie_7d"): Promise<BoostOrder> {
  const db = getDb();
  const p = PRODUCTS[product];
  const [post] = await db
    .select({ id: indiePosts.id })
    .from(indiePosts)
    .where(and(eq(indiePosts.id, postId), eq(indiePosts.authorUserId, userId), isPublic))
    .limit(1);
  if (!post) throw new Error(M.notBuyable);
  const orderId = makeOrderId("boost", randomBytes(ORDER_RANDOM_BYTES).toString("hex"));
  await db.insert(payments).values({ orderId, userId, product, amount: p.amount, targetKind: p.target, targetId: post.id, ...createdBy("user", userId) });
  // customerKey 는 토스가 구매자를 가르는 값이다. 우리 사용자 id(uuid)는 토스 규칙(영숫자와 -, 2~50자)에 맞고 바깥에 드러나도 쓸 데가 없다
  return { orderId, amount: p.amount, orderName: p.name, customerKey: userId };
}

export type BoostTargetDto = { id: string; title: string; slug: string; live: boolean; boostedUntil: Date | null };

/** 광고 걸기 화면의 대상 — 내 글만. 지금 걸린 광고(관리자든 결제든)가 있으면 가장 늦은 끝 시각 */
export async function getMyBoostTarget(userId: string, postId: string): Promise<BoostTargetDto | null> {
  const db = getDb();
  const [[post], [boost]] = await Promise.all([
    db
      .select({ id: indiePosts.id, title: indiePosts.title, slug: indiePosts.slug, live: sql<boolean>`${isPublic}` })
      .from(indiePosts)
      .where(and(eq(indiePosts.id, postId), eq(indiePosts.authorUserId, userId)))
      .limit(1),
    db
      .select({ end: sql<Date | null>`max(${promotionBoosts.endsAt})` })
      .from(promotionBoosts)
      .where(and(eq(promotionBoosts.targetId, postId), isNull(promotionBoosts.revokedAt), gt(promotionBoosts.endsAt, sql`now()`))),
  ]);
  if (!post) return null;
  return { ...post, boostedUntil: boost?.end ? new Date(boost.end) : null };
}

export type ConfirmResult = { ok: true; orderId: string } | { ok: false; message: string };

/** 성공 주소에서 부른다. 로그인한 그 사람의 주문만 승인한다 */
export async function confirmIndieBoostPayment(input: { paymentKey: string; orderId: string; amount: number }, userId: string): Promise<ConfirmResult> {
  const db = getDb();
  const [order] = await db.select().from(payments).where(and(eq(payments.orderId, input.orderId), eq(payments.userId, userId))).limit(1);
  if (!order) return { ok: false, message: M.orderNotFound };
  if (order.status === "paid") return { ok: true, orderId: order.orderId };
  if (order.status !== "pending") return { ok: false, message: order.failMessage ?? M.failed };
  if (order.amount !== input.amount) {
    await markFailed(order.orderId, "AMOUNT_MISMATCH", M.amountMismatch, userId);
    return { ok: false, message: M.amountMismatch };
  }

  let confirmed;
  try {
    confirmed = await confirmTossPayment(input);
  } catch (e) {
    const code = e instanceof TossError ? e.code : "CONFIRM_ERROR";
    const message = e instanceof TossError ? e.message : M.failed;
    await markFailed(order.orderId, code, message, userId);
    return { ok: false, message };
  }

  // pending 일 때만 paid 로 — 두 탭이 동시에 승인을 끝내도 부스트는 한 번만 건다
  const claimed = await db
    .update(payments)
    .set({
      status: "paid",
      paymentKey: confirmed.paymentKey,
      method: confirmed.method,
      receiptUrl: confirmed.receiptUrl,
      approvedAt: confirmed.approvedAt ? new Date(confirmed.approvedAt) : new Date(),
      ...updatedBy("user", userId),
    })
    .where(and(eq(payments.id, order.id), eq(payments.status, "pending")))
    .returning({ id: payments.id });
  if (claimed.length === 0) return { ok: true, orderId: order.orderId };

  const p = PRODUCTS[order.product as ProductKey];
  const boostId = await insertPurchasedBoost({ slot: p.slot, targetId: order.targetId, days: p.days, note: order.orderId }, userId);
  await db.update(payments).set({ boostId, ...updatedBy("system") }).where(eq(payments.id, order.id));
  return { ok: true, orderId: order.orderId };
}

async function markFailed(orderId: string, code: string, message: string, userId: string): Promise<void> {
  await getDb()
    .update(payments)
    .set({ status: "failed", failCode: code, failMessage: message, ...updatedBy("user", userId) })
    .where(and(eq(payments.orderId, orderId), eq(payments.status, "pending")));
}

/** 결제창 실패 주소에서 부른다(사용자가 창을 닫음, 카드 거절 등). 그 사람의 대기 주문만 실패로 */
export async function failIndieBoostPayment(orderId: string, code: string, message: string, userId: string): Promise<void> {
  await markFailed(orderId, code, message, userId);
}

export type PaymentRowDto = {
  orderId: string;
  productName: string;
  amount: number;
  status: PaymentStatus;
  targetTitle: string | null;
  receiptUrl: string | null;
  failMessage: string | null;
  createdAt: Date;
  /** 승인은 됐는데 부스트가 안 걸린 주문(머리 주석). 관리자가 손으로 건다 */
  boostMissing: boolean;
  buyer?: string;
};

function productName(key: string): string {
  return PRODUCTS[key as ProductKey]?.name ?? key;
}

/**
 * 내 결제 내역, 최신부터. 대기(pending) 주문은 빼고 보인다 — 결제창을 열었다 닫을 때마다 한 줄씩 생겨
 * "결제 중" 이 영영 쌓인다(2026-10-27 실측: 시험 한 번에 넷). 승인으로 이어진 주문은 paid 로 바뀌어 보이고,
 * 창 안에서 실패한 주문은 failed 로 사유와 함께 보인다
 */
export async function listMyPayments(userId: string): Promise<PaymentRowDto[]> {
  const rows = await getDb()
    .select({ p: payments, title: indiePosts.title })
    .from(payments)
    .leftJoin(indiePosts, eq(indiePosts.id, payments.targetId))
    .where(and(eq(payments.userId, userId), ne(payments.status, "pending")))
    .orderBy(desc(payments.createdAt))
    .limit(PAYMENT_LIST_LIMIT);
  return rows.map(({ p, title }) => ({
    orderId: p.orderId,
    productName: productName(p.product),
    amount: p.amount,
    status: p.status,
    targetTitle: title,
    receiptUrl: p.receiptUrl,
    failMessage: p.failMessage,
    createdAt: p.createdAt,
    boostMissing: p.status === "paid" && !p.boostId,
  }));
}

/** 관리자 결제 목록 — 승인된 결제만. 대기, 실패는 창만 열고 닫은 것이 대부분이라 쌓이면 볼 것이 묻힌다 */
export async function listPaymentsForAdmin(): Promise<PaymentRowDto[]> {
  const db = getDb();
  const rows = await db
    .select({ p: payments, title: indiePosts.title, email: users.email })
    .from(payments)
    .innerJoin(users, eq(users.id, payments.userId))
    .leftJoin(indiePosts, eq(indiePosts.id, payments.targetId))
    .where(eq(payments.status, "paid"))
    .orderBy(desc(payments.createdAt))
    .limit(PAYMENT_LIST_LIMIT);
  return rows.map(({ p, title, email }) => ({
    orderId: p.orderId,
    productName: productName(p.product),
    amount: p.amount,
    status: p.status,
    targetTitle: title,
    receiptUrl: p.receiptUrl,
    failMessage: p.failMessage,
    createdAt: p.createdAt,
    boostMissing: !p.boostId,
    buyer: email,
  }));
}
