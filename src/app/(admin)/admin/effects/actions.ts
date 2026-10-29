"use server";
// 화면 연출 저장 Server Action. 관리자 role 을 다시 보고(§6), 같은 스키마(lib/indie/fame-intro)로 검증한 뒤 저장한다.
// 저장하면 설정 캐시 태그를 바로 만료하고(updateTag, 낡은 값을 한 번 더 내주지 않는다) 명예의 전당 경로를 민다 — 명예의 전당은 ISR 이라 밀지 않으면 다음 갱신까지 옛 설정으로 돈다.
import { revalidatePath, updateTag } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { FAME_INTRO_ADMIN_MESSAGES as M, fameIntroSettingsSchema } from "@/lib/indie/fame-intro";
import { ROUTES } from "@/lib/routes";
import { setFameIntroSettings, SETTINGS_TAG } from "@/server/services/settings";
import { requireAdmin } from "@/server/services/users";

export type EffectsActionResult = { ok: true } | { ok: false; error: string };

export async function saveFameIntroAction(input: unknown): Promise<EffectsActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = fameIntroSettingsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.failed };
    await setFameIntroSettings(admin.id, parsed.data);
    updateTag(SETTINGS_TAG);
    revalidatePath(ROUTES.hallOfFame);
    revalidatePath(ROUTES.adminEffects);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
