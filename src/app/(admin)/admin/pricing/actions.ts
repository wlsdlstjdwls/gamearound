"use server";
// 요금 설정 저장 Server Action(2026-10-28). 관리자 role 을 다시 보고, 같은 스키마(lib/pricing/settings)로 검증한 뒤 저장한다.
// 저장하면 설정 캐시 태그를 바로 만료한다(updateTag). revalidateTag(…, "max") 는 낡은 값을 한 번 더 내주는 방식이라 저장 직후 요금 화면, 주문 만들기가
// 옛 값을 읽었다(2026-10-29). 요금은 낡은 값이 한 번이라도 주문에 쓰이면 안 된다.
import { revalidatePath, updateTag } from "next/cache";
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
    updateTag(SETTINGS_TAG);
    revalidatePath(ROUTES.adminPricing);
    revalidatePath(ROUTES.makerPlans);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
