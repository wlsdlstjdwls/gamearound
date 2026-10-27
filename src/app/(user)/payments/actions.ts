"use server";
// 노출 자리 결제 주문 만들기, 환불 요청, 멤버십 해지와 해지 취소, 이용권 쓰기. 결제창을 열기 직전에 부른다 — 금액, 주문 번호는 서버가 정한다(services/payments 머리 주석).
// 인디 게임 부스트, 홍보 글 고정이 같은 액션을 쓴다. 상품 열쇠도 브라우저에서 오니 표에 있는 값인지 다시 본다.
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { PAYMENT_MESSAGES as M } from "@/lib/payments/messages";
import { isProductKey, isSingleProduct } from "@/lib/payments/products";
import { createBoostOrder, requestRefund, type BoostOrder } from "@/server/services/payments";
import { cancelMembership, resumeMembership, spendBoostCredit } from "@/server/services/membership";
import { requireUser } from "@/server/services/users";
import { MEMBERSHIP_MESSAGES as MM } from "@/lib/membership/messages";

/** extraTargetId: 묶음 상품의 둘째 대상(홍보 글). 낱개면 null */
export async function createBoostOrderAction(product: string, targetId: string, extraTargetId: string | null = null): Promise<({ ok: true } & BoostOrder) | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    if (!isProductKey(product) || !z.uuid().safeParse(targetId).success) return { ok: false, error: M.notBuyable };
    if (extraTargetId !== null && !z.uuid().safeParse(extraTargetId).success) return { ok: false, error: M.notBuyable };
    return { ok: true, ...(await createBoostOrder(user.id, product, targetId, extraTargetId)) };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

/** 환불 요청. 돈은 관리자가 확인한 뒤 돌려준다(services/payments/refunds 머리 주석) */
export async function requestRefundAction(orderId: string, note: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    await requestRefund(user.id, String(orderId).slice(0, 64), String(note ?? ""));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

type Plain = { ok: true } | { ok: false; error: string };

async function run(fn: (userId: string) => Promise<void>, fallback: string): Promise<Plain> {
  try {
    const user = await requireUser();
    await fn(user.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, fallback) };
  }
}

/** 해지 예약 — 이번 기간 끝까지는 쓴다 */
export async function cancelMembershipAction(): Promise<Plain> {
  return run(cancelMembership, MM.failed);
}

export async function resumeMembershipAction(): Promise<Plain> {
  return run(resumeMembership, MM.failed);
}

/** 멤버십 이용권 한 장으로 광고 걸기 */
export async function spendBoostCreditAction(product: string, targetId: string): Promise<Plain> {
  // 이용권 한 장은 자리 하나 — 묶음은 이용권으로 못 건다
  if (!isProductKey(product) || !isSingleProduct(product) || !z.uuid().safeParse(targetId).success) return { ok: false, error: M.notBuyable };
  return run((userId) => spendBoostCredit(userId, product, targetId), MM.failed);
}
