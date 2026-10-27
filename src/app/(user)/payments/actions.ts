"use server";
// 노출 자리 결제 주문 만들기. 결제창을 열기 직전에 부른다 — 금액, 주문 번호는 서버가 정한다(services/payments 머리 주석).
// 인디 게임 부스트, 홍보 글 고정이 같은 액션을 쓴다. 상품 열쇠도 브라우저에서 오니 표에 있는 값인지 다시 본다.
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { PAYMENT_MESSAGES as M } from "@/lib/payments/messages";
import { isProductKey } from "@/lib/payments/products";
import { createBoostOrder, type BoostOrder } from "@/server/services/payments";
import { requireUser } from "@/server/services/users";

export async function createBoostOrderAction(product: string, targetId: string): Promise<({ ok: true } & BoostOrder) | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    if (!isProductKey(product) || !z.uuid().safeParse(targetId).success) return { ok: false, error: M.notBuyable };
    return { ok: true, ...(await createBoostOrder(user.id, product, targetId)) };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
