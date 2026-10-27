// 노출 자리 단건 결제(2026-10-27, 기획서 5장 3단계, 토스페이먼츠 결제위젯). 주문 만들기 → (결제창) → 승인과 부스트 걸기.
// 상품마다 자리와 대상 표가 다르다(lib/payments/products): 인디 게임 부스트는 indie_posts, 홍보 글 고정은 posts 의 홍보 글, 묶음은 둘 다.
//
// 금액은 언제나 서버가 정한다(lib/payments/products). 성공 주소로 돌아온 amount 는 주문 줄과 견주기만 하고, 다르면 승인하지 않는다.
// 승인은 한 번만 간다: 이미 paid 인 주문이 다시 오면(새로고침, 뒤로 가기) 토스를 다시 부르지 않고 그 결과를 돌려준다.
//
// 순서는 토스 승인 → 주문 paid → 부스트 걸기 → 주문에 부스트 잇기다. 이 드라이버는 묶음 트랜잭션이 없어 마지막 두 걸음 사이에서
// 끊기면 "돈은 냈는데 부스트가 없는" 주문이 남는다 — boostId 가 빈 paid 주문은 관리자 결제 목록에 그대로 드러나 손으로 건다.
import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { indiePosts, payments, posts, promotionBoosts, type PromoTargetKind } from "@/server/db/schema";
import { confirmTossPayment, TossError } from "@/server/payments/toss";
import { insertPurchasedBoost, isPublicPromo } from "@/server/services/promotions";
import { isPublic } from "@/server/services/indie/read";
import { isProductKey, makeOrderId, PRODUCTS, type Product, type ProductKey } from "@/lib/payments/products";
import { PAYMENT_MESSAGES as M } from "@/lib/payments/messages";

/** 묶음 짝 후보 수. 한 사람의 공개 글은 많지 않고, 오래된 홍보 글에 돈을 거는 일은 드물다 */
const PAIR_CANDIDATES = 20;

/** 주문 번호 무작위 부분 바이트 수. 16바이트(hex 32자)면 겹칠 일이 없다 */
const ORDER_RANDOM_BYTES = 16;

export type BoostOrder = { orderId: string; amount: number; orderName: string; customerKey: string };

/** 내 글이면서 지금 공개인가(살 수 있나). 남의 글이나 공개 전 글에는 살 수 없다. 멤버십 이용권도 같은 문턱을 쓴다 */
export async function ownedLiveTarget(kind: PromoTargetKind, userId: string, targetId: string): Promise<boolean> {
  const db = getDb();
  const rows =
    kind === "indie_post"
      ? await db.select({ id: indiePosts.id }).from(indiePosts).where(and(eq(indiePosts.id, targetId), eq(indiePosts.authorUserId, userId), isPublic)).limit(1)
      : await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, targetId), eq(posts.authorUserId, userId), isPublicPromo)).limit(1);
  return rows.length > 0;
}

/** 결제창에 넘길 주문. 묶음이면 둘째 대상(홍보 글)도 내 공개 글이어야 한다 */
export async function createBoostOrder(userId: string, product: ProductKey, targetId: string, extraTargetId: string | null = null): Promise<BoostOrder> {
  const p: Product = PRODUCTS[product];
  if (Boolean(p.extra) !== Boolean(extraTargetId)) throw new Error(M.notBuyable);
  const [main, extra] = await Promise.all([ownedLiveTarget(p.target, userId, targetId), p.extra && extraTargetId ? ownedLiveTarget(p.extra.target, userId, extraTargetId) : true]);
  if (!main || !extra) throw new Error(M.notBuyable);
  const orderId = makeOrderId(product.split("_")[0], randomBytes(ORDER_RANDOM_BYTES).toString("hex"));
  await getDb().insert(payments).values({ orderId, userId, product, amount: p.amount, targetKind: p.target, targetId, extraTargetId, ...createdBy("user", userId) });
  // customerKey 는 토스가 구매자를 가르는 값이다. 우리 사용자 id(uuid)는 토스 규칙(영숫자와 -, 2~50자)에 맞고 바깥에 드러나도 쓸 데가 없다
  return { orderId, amount: p.amount, orderName: p.name, customerKey: userId };
}

export type BoostTargetDto = { id: string; title: string; live: boolean; boostedUntil: Date | null };

/** 묶음의 짝으로 고를 내 공개 글(인디 게임 구매 화면이면 홍보 글, 홍보 고정 화면이면 인디 게임). 최근 것부터 */
export async function listMyLiveTargets(userId: string, kind: PromoTargetKind): Promise<Array<{ id: string; title: string }>> {
  const db = getDb();
  return kind === "indie_post"
    ? db.select({ id: indiePosts.id, title: indiePosts.title }).from(indiePosts).where(and(eq(indiePosts.authorUserId, userId), isPublic)).orderBy(desc(indiePosts.createdAt)).limit(PAIR_CANDIDATES)
    : db.select({ id: posts.id, title: posts.title }).from(posts).where(and(eq(posts.authorUserId, userId), isPublicPromo)).orderBy(desc(posts.createdAt)).limit(PAIR_CANDIDATES);
}

/** 광고 걸기 화면의 대상 — 내 글만. 그 자리에 지금 걸린 광고(관리자든 결제든)가 있으면 가장 늦은 끝 시각 */
export async function getMyBoostTarget(userId: string, product: ProductKey, targetId: string): Promise<BoostTargetDto | null> {
  const db = getDb();
  const p = PRODUCTS[product];
  const postQuery =
    p.target === "indie_post"
      ? db
          .select({ id: indiePosts.id, title: indiePosts.title, live: sql<boolean>`${isPublic}` })
          .from(indiePosts)
          .where(and(eq(indiePosts.id, targetId), eq(indiePosts.authorUserId, userId)))
          .limit(1)
      : db
          .select({ id: posts.id, title: posts.title, live: sql<boolean>`${isPublicPromo}` })
          .from(posts)
          .where(and(eq(posts.id, targetId), eq(posts.authorUserId, userId), eq(posts.category, "promo")))
          .limit(1);
  const [[post], [boost]] = await Promise.all([
    postQuery,
    db
      .select({ end: sql<Date | null>`max(${promotionBoosts.endsAt})` })
      .from(promotionBoosts)
      .where(and(eq(promotionBoosts.slot, p.slot), eq(promotionBoosts.targetId, targetId), isNull(promotionBoosts.revokedAt), gt(promotionBoosts.endsAt, sql`now()`))),
  ]);
  if (!post) return null;
  return { ...post, boostedUntil: boost?.end ? new Date(boost.end) : null };
}

export type ConfirmResult = { ok: true; orderId: string } | { ok: false; message: string };

/** 성공 주소에서 부른다. 로그인한 그 사람의 주문만 승인한다 */
export async function confirmBoostPayment(input: { paymentKey: string; orderId: string; amount: number }, userId: string): Promise<ConfirmResult> {
  const db = getDb();
  const [order] = await db.select().from(payments).where(and(eq(payments.orderId, input.orderId), eq(payments.userId, userId))).limit(1);
  // 대상이 없는 줄은 멤버십 청구다 — 결제위젯 성공 주소로 올 일이 없다
  if (!order || !order.targetId || !isProductKey(order.product)) return { ok: false, message: M.orderNotFound };
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

  const p: Product = PRODUCTS[order.product];
  const boostId = await insertPurchasedBoost({ slot: p.slot, targetId: order.targetId, days: p.days, note: order.orderId }, userId);
  await db.update(payments).set({ boostId, ...updatedBy("system") }).where(eq(payments.id, order.id));
  // 묶음의 둘째. 여기서 끊기면 extraBoostId 가 빈 채 남아 관리자 목록에 "걸기 실패" 로 드러난다(history 의 boostMissing)
  if (p.extra && order.extraTargetId) {
    const extraBoostId = await insertPurchasedBoost({ slot: p.extra.slot, targetId: order.extraTargetId, days: p.days, note: order.orderId }, userId);
    await db.update(payments).set({ extraBoostId, ...updatedBy("system") }).where(eq(payments.id, order.id));
  }
  return { ok: true, orderId: order.orderId };
}

async function markFailed(orderId: string, code: string, message: string, userId: string): Promise<void> {
  await getDb()
    .update(payments)
    .set({ status: "failed", failCode: code, failMessage: message, ...updatedBy("user", userId) })
    .where(and(eq(payments.orderId, orderId), eq(payments.status, "pending")));
}

/** 결제창 실패 주소에서 부른다(사용자가 창을 닫음, 카드 거절 등). 그 사람의 대기 주문만 실패로 */
export async function failBoostPayment(orderId: string, code: string, message: string, userId: string): Promise<void> {
  await markFailed(orderId, code, message, userId);
}
