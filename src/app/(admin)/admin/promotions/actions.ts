"use server";
// 유료 노출 걸기, 회수, 결제 환불 Server Action. 관리자 role 을 다시 본다(§6). 걸리면 노출 자리(인디 목록, 홍보 게시판)를 민다.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { PROMO_MESSAGES as M } from "@/lib/promo/messages";
import { grantBoostSchema, type GrantBoostInput } from "@/lib/promo/schemas";
import { ROUTES } from "@/lib/routes";
import { grantBoost, revokeBoost } from "@/server/services/promotions";
import { refundPayment, type RefundMode } from "@/server/services/payments";
import { PAYMENT_MESSAGES as PM } from "@/lib/payments/messages";
import { requireAdmin } from "@/server/services/users";

export type PromoActionResult = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath(ROUTES.adminPromotions);
  revalidatePath(ROUTES.indie);
  // 인디 부스트는 홈 인디 줄 첫 칸에도 선다(services/promotions/indie-spots). 홈은 ISR 이라 밀지 않으면 한 시간 늦는다
  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.boardPromos);
}

export async function grantBoostAction(input: GrantBoostInput): Promise<PromoActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = grantBoostSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.failed };
    await grantBoost(parsed.data, admin.id);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

export async function revokeBoostAction(id: string): Promise<PromoActionResult> {
  try {
    const admin = await requireAdmin();
    if (!z.uuid().safeParse(id).success) return { ok: false, error: M.failed };
    await revokeBoost(id, admin.id);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

/** 환불 사유 상한. 토스 cancelReason 은 200자까지다 */
const REFUND_REASON_MAX = 200;

export async function refundPaymentAction(orderId: string, mode: RefundMode, reason: string): Promise<({ ok: true; amount: number }) | { ok: false; error: string }> {
  try {
    const admin = await requireAdmin();
    if (mode !== "full" && mode !== "prorated") return { ok: false, error: PM.refundNotAllowed };
    const amount = await refundPayment(String(orderId).slice(0, 64), mode, String(reason ?? "").trim().slice(0, REFUND_REASON_MAX), admin.id);
    refresh();
    return { ok: true, amount };
  } catch (e) {
    return { ok: false, error: actionError(e, PM.failed) };
  }
}
