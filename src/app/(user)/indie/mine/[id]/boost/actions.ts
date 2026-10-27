"use server";
// 광고 결제 주문 만들기. 결제창을 열기 직전에 부른다 — 금액, 주문 번호는 서버가 정한다(services/payments 머리 주석).
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { PAYMENT_MESSAGES as M } from "@/lib/payments/messages";
import { createIndieBoostOrder, type BoostOrder } from "@/server/services/payments";
import { requireUser } from "@/server/services/users";

export async function createIndieBoostOrderAction(postId: string): Promise<({ ok: true } & BoostOrder) | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    if (!z.uuid().safeParse(postId).success) return { ok: false, error: M.notBuyable };
    return { ok: true, ...(await createIndieBoostOrder(user.id, postId)) };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
