// 멤버십 청구와 갱신(2026-10-27, 기획서 8장 "월 정기결제 빌링키, 결제 실패 재시도와 알림함 안내, 해지 시 기간 끝까지 유지").
//
// 청구 한 번 = 결제 줄 하나(payments, membershipId). 결제 줄을 먼저 pending 으로 쓰고 토스를 부른다 — 응답을 잃어도 주문 번호가 남아
// 토스 관리자 화면에서 맞춰 볼 수 있다. 청구 요청에는 주문 번호를 멱등 키로 붙인다(server/payments/toss-billing).
//
// 갱신은 매일 도는 크론(api/cron/daily, 한국 03시)이 한다. 그래서 기간이 끝나고 최대 하루 가까이 active 로 남을 수 있는데,
// 혜택은 기간 끝 시각으로 판단하므로(lib/membership/plan 의 canUseBenefits) 그사이 이용권을 더 쓰지는 못한다.
// 갱신이 성공하면 새 기간은 지난 기간 끝에서 바로 잇는다 — 크론이 늦어도 결제일이 밀리지 않는다.
// 프로모션(2026-10-30): 첫 청구에 걸린 프로모션을 멤버십 줄에 받아 두고(promo_*), 갱신은 그 받은 값으로 매긴다(lib/pricing/promo-terms).
// 관리자가 프로모션을 바꾸거나 신규만 중지해도 가입 때 약속(할인가, 개월)이 지켜진다. 받은 혜택은 청구가 성공했을 때만 고친다.
import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, lte, or } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { memberships, payments } from "@/server/db/schema";
import { chargeBilling } from "@/server/payments/toss-billing";
import { TossError } from "@/server/payments/toss";
import { pushNotification } from "@/server/services/notifications";
import { quoteFor } from "@/server/services/pricing";
import { grantFromRow, renewalCharge, type MembershipGrant } from "@/lib/pricing/promo-terms";
import { getPricingSettings } from "@/server/services/settings";
import { addMonth, afterFailedCharge, MEMBERSHIP_PLANS, nextPeriodStart, renewalAction, type MembershipPlanKey } from "@/lib/membership/plan";
import { MEMBERSHIP_MESSAGES as M } from "@/lib/membership/messages";
import { makeOrderId } from "@/lib/payments/products";
import { formatDate } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

/** 주문 번호 무작위 부분 바이트 수(services/payments/orders 와 같은 값) */
const ORDER_RANDOM_BYTES = 16;
/** 한 번 크론에 갱신하는 멤버십 수. 한 건에 토스 왕복 1회(몇 초) — 크론 함수 시간(60초) 안에 끝나는 만큼 */
const RENEW_BATCH = 10;

type MembershipRow = typeof memberships.$inferSelect;
export type ChargeResult = { ok: true } | { ok: false; message: string };

/**
 * 한 달 청구. 성공하면 멤버십을 active 로, 새 기간과 이용권을 채운다. 실패하면 결제 줄만 failed 로 두고 문구를 돌려준다 —
 * 실패 뒤 멤버십 상태(재시도, 끝내기)는 부르는 쪽이 정한다(첫 시작이면 시작을 접고, 갱신이면 재시도로 넘긴다).
 * first: 첫 달이면 지난 기간이 없다(시작은 지금)
 */
export async function chargeMembership(m: MembershipRow, now: Date, first: boolean, actor: { source: "user"; userId: string } | { source: "system" }): Promise<ChargeResult> {
  const db = getDb();
  const plan = MEMBERSHIP_PLANS[m.plan as MembershipPlanKey];
  if (!plan || !m.billingKey) return { ok: false, message: M.failed };
  // 값과 이용권 수는 요금 설정에서(관리자가 바꾼다). 첫 청구는 지금 걸린 프로모션으로, 갱신은 가입 때 받아 둔 혜택으로 매긴다
  const pricing = await getPricingSettings();
  const { amount, grant } = first ? await firstCharge(m.userId) : renewalCharge(grantFromRow(m), pricing);
  const audit = actor.source === "user" ? createdBy("user", actor.userId) : createdBy("cron:membership");
  const orderId = makeOrderId("member", randomBytes(ORDER_RANDOM_BYTES).toString("hex"));
  await db.insert(payments).values({ orderId, userId: m.userId, product: m.plan, amount, membershipId: m.id, ...audit });

  let charged;
  try {
    charged = await chargeBilling({ billingKey: m.billingKey, customerKey: m.customerKey, amount, orderId, orderName: plan.name });
  } catch (e) {
    const code = e instanceof TossError ? e.code : "CHARGE_ERROR";
    const message = e instanceof TossError ? e.message : M.failed;
    await db.update(payments).set({ status: "failed", failCode: code, failMessage: message, ...updatedBy("system") }).where(eq(payments.orderId, orderId));
    return { ok: false, message };
  }

  const start = nextPeriodStart(first ? null : m, now);
  const end = addMonth(start);
  await db
    .update(payments)
    .set({ status: "paid", paymentKey: charged.paymentKey, method: charged.method, receiptUrl: charged.receiptUrl, approvedAt: charged.approvedAt ? new Date(charged.approvedAt) : now, ...updatedBy("system") })
    .where(eq(payments.orderId, orderId));
  await db
    .update(memberships)
    .set({
      status: "active",
      currentPeriodStart: start,
      currentPeriodEnd: end,
      boostCredits: pricing.membership.boostCredits,
      nextChargeAt: end,
      failedAttempts: 0,
      lastFailMessage: null,
      canceledAt: null,
      endedAt: null,
      promoId: grant?.promoId ?? null,
      promoLabel: grant?.label ?? null,
      promoAmount: grant?.amount ?? null,
      promoMonths: grant?.months ?? null,
      promoPaid: grant?.paid ?? null,
      ...updatedBy("system"),
    })
    .where(eq(memberships.id, m.id));
  return { ok: true };
}

/** 첫 청구 값. 걸린 프로모션이 있으면 첫 결제 한 번을 낸 것으로 센 혜택을 같이 돌려준다 */
async function firstCharge(userId: string): Promise<{ amount: number; grant: MembershipGrant | null }> {
  const q = await quoteFor(userId, "membership", true);
  if (!q.promoId || !q.promoLabel || q.promoMonths === null) return { amount: q.amount, grant: null };
  return { amount: q.amount, grant: { promoId: q.promoId, label: q.promoLabel, amount: q.amount, months: q.promoMonths, paid: 1 } };
}

/** 끝내기. 빌링키를 지운다 — 다시 시작하면 카드를 새로 등록한다(schema-memberships 머리 주석) */
export async function endMembership(id: string, now: Date, actor: { source: "admin"; userId: string } | { source: "system" }): Promise<void> {
  await getDb()
    .update(memberships)
    .set({ status: "ended", billingKey: null, boostCredits: 0, nextChargeAt: null, endedAt: now, ...(actor.source === "admin" ? updatedBy("admin", actor.userId) : updatedBy("system")) })
    .where(eq(memberships.id, id));
}

async function renewOne(m: MembershipRow, now: Date): Promise<void> {
  const action = renewalAction(m, now);
  if (action === "end") {
    await endMembership(m.id, now, { source: "system" });
    await pushNotification(m.userId, "payment", M.noticeEnded, ROUTES.membership);
    return;
  }
  if (action !== "charge") return;
  const r = await chargeMembership(m, now, false, { source: "system" });
  if (r.ok) {
    await pushNotification(m.userId, "payment", M.noticeRenewed(formatDate(addMonth(nextPeriodStart(m, now))), (await getPricingSettings()).membership.boostCredits), ROUTES.membership);
    return;
  }
  const next = afterFailedCharge(m.failedAttempts, now);
  if (next.status === "ended") {
    await endMembership(m.id, now, { source: "system" });
    await getDb().update(memberships).set({ failedAttempts: next.failedAttempts, lastFailMessage: r.message }).where(eq(memberships.id, m.id));
    await pushNotification(m.userId, "payment", M.noticeEnded, ROUTES.membership);
    return;
  }
  await getDb()
    .update(memberships)
    .set({ status: "past_due", failedAttempts: next.failedAttempts, nextChargeAt: next.nextChargeAt, lastFailMessage: r.message, ...updatedBy("system") })
    .where(eq(memberships.id, m.id));
  await pushNotification(m.userId, "payment", M.noticeFailed(r.message), ROUTES.membership);
}

/**
 * 크론: 청구할 때가 된 것(active, past_due)과 기간이 끝난 해지 예약(canceling)을 처리한다. 처리한 수를 돌려준다.
 * 한 건의 실패가 나머지를 멈추지 않는다(AGENTS §7) — 실패한 건은 다음 날 다시 잡힌다
 */
export async function renewDueMemberships(now: Date): Promise<number> {
  const due = await getDb()
    .select()
    .from(memberships)
    .where(
      or(
        and(inArray(memberships.status, ["active", "past_due"]), lte(memberships.nextChargeAt, now)),
        and(eq(memberships.status, "canceling"), lte(memberships.currentPeriodEnd, now)),
      ),
    )
    .limit(RENEW_BATCH);
  let done = 0;
  for (const m of due) {
    try {
      await renewOne(m, now);
      done++;
    } catch {
      // 다음 날 다시 잡힌다. 실패한 청구는 결제 줄에 사유가 남는다
    }
  }
  return done;
}
