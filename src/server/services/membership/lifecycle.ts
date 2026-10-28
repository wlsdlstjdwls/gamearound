// 멤버십 시작, 해지 예약, 해지 취소, 이용권 쓰기(2026-10-27, 기획서 4.3, 8장).
//
// 시작: 카드 등록 창이 준 authKey → 빌링키 → 첫 달 청구. 첫 청구가 실패하면 시작하지 않고 빌링키를 지운다 —
// 카드만 등록되고 이용은 못 하는 반쪽 상태를 남기지 않는다.
// 해지는 예약이다: 이번 기간 끝까지 이용권을 쓰고, 다음 청구만 하지 않는다(기획서 8장 "해지 시 기간 끝까지 유지").
// 이용권 쓰기는 한 번의 조건부 UPDATE 로 한 장을 깎는다 — 두 탭에서 동시에 눌러도 남은 장수보다 많이 쓰지 못한다.
import "server-only";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy, updatedBy } from "@/server/db/audit";
import { memberships } from "@/server/db/schema";
import { issueBillingKey } from "@/server/payments/toss-billing";
import { TossError } from "@/server/payments/toss";
import { insertPurchasedBoost } from "@/server/services/promotions";
import { ownedLiveTarget } from "@/server/services/payments";
import { chargeMembership } from "@/server/services/membership/charge";
import { getPricingSettings } from "@/server/services/settings";
import { DEFAULT_PLAN } from "@/lib/membership/plan";
import { MEMBERSHIP_MESSAGES as M } from "@/lib/membership/messages";
import { PAYMENT_MESSAGES as PM } from "@/lib/payments/messages";
import { PRODUCTS, type ProductKey } from "@/lib/payments/products";

export type StartResult = { ok: true } | { ok: false; message: string };

/** 카드 등록 성공 주소에서 부른다. customerKey 는 우리가 등록 창에 넘긴 사용자 id 여야 한다 */
export async function startMembership(userId: string, authKey: string, customerKey: string): Promise<StartResult> {
  if (customerKey !== userId) return { ok: false, message: M.notOwnCustomer };
  const db = getDb();
  const [existing] = await db.select({ status: memberships.status }).from(memberships).where(eq(memberships.userId, userId)).limit(1);
  if (existing && existing.status !== "ended") return { ok: false, message: M.alreadyActive };
  // 관리자가 판매를 멈췄으면 새 가입을 받지 않는다(요금 설정 membership.active). 이용 중인 사람의 갱신은 그대로 간다
  if (!(await getPricingSettings()).membership.active) return { ok: false, message: M.notOnSale };

  let issued;
  try {
    issued = await issueBillingKey(authKey, customerKey);
  } catch (e) {
    return { ok: false, message: e instanceof TossError ? e.message : M.failed };
  }

  const now = new Date();
  // 첫 청구 전에는 ended 로 둔다 — 청구가 실패하면 그대로 끝난 줄이고, 성공하면 chargeMembership 이 active 로 바꾼다
  const fields = { plan: DEFAULT_PLAN, status: "ended" as const, billingKey: issued.billingKey, customerKey, cardLabel: issued.cardLabel, currentPeriodStart: now, currentPeriodEnd: now, boostCredits: 0, nextChargeAt: null, failedAttempts: 0, lastFailMessage: null, canceledAt: null };
  const [row] = await db
    .insert(memberships)
    .values({ userId, ...fields, ...createdBy("user", userId) })
    .onConflictDoUpdate({ target: memberships.userId, set: { ...fields, ...updatedBy("user", userId) } })
    .returning();
  const charged = await chargeMembership(row, now, true, { source: "user", userId });
  if (!charged.ok) {
    await db.update(memberships).set({ billingKey: null, lastFailMessage: charged.message, ...updatedBy("user", userId) }).where(eq(memberships.id, row.id));
    return charged;
  }
  return { ok: true };
}

/** 해지 예약. 이용 중일 때만 */
export async function cancelMembership(userId: string): Promise<void> {
  const r = await getDb()
    .update(memberships)
    .set({ status: "canceling", canceledAt: new Date(), nextChargeAt: null, ...updatedBy("user", userId) })
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")))
    .returning({ id: memberships.id });
  if (r.length === 0) throw new Error(M.failed);
}

/** 해지 취소. 기간이 아직 남은 해지 예약만 — 끝난 뒤에는 카드를 다시 등록한다 */
export async function resumeMembership(userId: string): Promise<void> {
  const r = await getDb()
    .update(memberships)
    .set({ status: "active", canceledAt: null, nextChargeAt: sql`${memberships.currentPeriodEnd}`, ...updatedBy("user", userId) })
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "canceling"), gt(memberships.currentPeriodEnd, sql`now()`)))
    .returning({ id: memberships.id });
  if (r.length === 0) throw new Error(M.failed);
}

/** 이용권 한 장으로 광고 7일. 대상 문턱(내 공개 글)은 결제와 같다 */
export async function spendBoostCredit(userId: string, product: ProductKey, targetId: string): Promise<void> {
  const p = PRODUCTS[product];
  if (!(await ownedLiveTarget(p.target, userId, targetId))) throw new Error(PM.notBuyable);
  const db = getDb();
  const spent = await db
    .update(memberships)
    .set({ boostCredits: sql`${memberships.boostCredits} - 1`, ...updatedBy("user", userId) })
    .where(and(eq(memberships.userId, userId), gt(memberships.boostCredits, 0), inArray(memberships.status, ["active", "canceling"]), gt(memberships.currentPeriodEnd, sql`now()`)))
    .returning({ id: memberships.id });
  if (spent.length === 0) throw new Error(M.noCredit);
  try {
    await insertPurchasedBoost({ slot: p.slot, targetId, days: p.days, note: `membership:${spent[0].id}`, source: "membership" }, userId);
  } catch (e) {
    // 걸기가 실패하면 깎은 한 장을 돌려준다 — 이용권만 사라지고 노출이 없는 상태를 남기지 않는다
    await db.update(memberships).set({ boostCredits: sql`${memberships.boostCredits} + 1` }).where(eq(memberships.id, spent[0].id));
    throw e;
  }
}
