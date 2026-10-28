"use server";
// 요금 설정 저장 Server Action(2026-10-28). 관리자 role 을 다시 보고, 같은 스키마(lib/pricing/settings)로 검증한 뒤 저장한다.
// 저장하면 설정 캐시 태그를 민다 — 요금 화면, 결제 화면, 주문 만들기가 모두 이 캐시를 읽으므로 바로 다음 요청부터 새 값이다.
import { revalidatePath, revalidateTag } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { PRICING_ADMIN_MESSAGES as M } from "@/lib/pricing/admin-messages";
import { pricingSettingsSchema } from "@/lib/pricing/settings";
import { ROUTES } from "@/lib/routes";
import { setPricingSettings, SETTINGS_TAG } from "@/server/services/settings";
import { requireAdmin } from "@/server/services/users";

export type PricingActionResult = { ok: true } | { ok: false; error: string };

export async function savePricingAction(input: unknown): Promise<PricingActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = pricingSettingsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.invalid };
    await setPricingSettings(admin.id, parsed.data);
    revalidateTag(SETTINGS_TAG, "max");
    revalidatePath(ROUTES.adminPricing);
    revalidatePath(ROUTES.makerPlans);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
