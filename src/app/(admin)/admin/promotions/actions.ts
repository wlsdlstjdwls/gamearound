"use server";
// 유료 노출 걸기, 회수 Server Action. 관리자 role 을 다시 본다(§6). 걸리면 노출 자리(인디 목록, 홍보 게시판)를 민다.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { PROMO_MESSAGES as M } from "@/lib/promo/messages";
import { grantBoostSchema, type GrantBoostInput } from "@/lib/promo/schemas";
import { ROUTES } from "@/lib/routes";
import { grantBoost, revokeBoost } from "@/server/services/promotions";
import { requireAdmin } from "@/server/services/users";

export type PromoActionResult = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath(ROUTES.adminPromotions);
  revalidatePath(ROUTES.indie);
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
