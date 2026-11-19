"use server";
// 프로그램 노출, 사용 여부 저장 Server Action. 관리자 role 을 다시 보고, 화면과 같은 스키마(lib/admin/programs)로 검증한다.
// 끌 수 없는 프로그램(대시보드, 프로그램관리)은 스키마가 거른다.
import { revalidatePath, updateTag } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { PROGRAMS_MESSAGES as M } from "@/lib/admin/messages";
import { programSettingsInputSchema } from "@/lib/admin/programs";
import { ROUTES } from "@/lib/routes";
import { ADMIN_PROGRAMS_TAG, saveProgramSettings } from "@/server/services/admin-programs";
import { requireProgram } from "@/server/services/admin-grants";

export type ProgramsActionResult = { ok: true; written: number } | { ok: false; error: string };

export async function saveProgramSettingsAction(input: unknown): Promise<ProgramsActionResult> {
  try {
    const admin = await requireProgram(ROUTES.adminPrograms, "save");
    const parsed = programSettingsInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.invalid };
    const written = await saveProgramSettings(admin.id, parsed.data);
    // 메뉴와 진입 막기는 관리자 레이아웃이 읽는다 — 캐시를 비우고 관리자 영역 전체를 민다
    updateTag(ADMIN_PROGRAMS_TAG);
    revalidatePath(ROUTES.admin, "layout");
    revalidatePath(ROUTES.shopsAdmin);
    return { ok: true, written };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
