"use server";
// 사용자별프로그램권한 저장 Server Action. 권한관리 저장 권한을 다시 보고, 화면과 같은 스키마(lib/admin/grants)로 검증한다.
// 자기 계정의 권한관리 조회, 저장은 끌 수 없다(SELF_LOCKED) — 화면이 칸을 잠그지만 여기서 한 번 더 막는다.
import { revalidatePath, updateTag } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { GRANTS_MESSAGES as M } from "@/lib/admin/messages";
import { dropsSelfLock, grantsInputSchema } from "@/lib/admin/grants";
import { ROUTES } from "@/lib/routes";
import { ADMIN_GRANTS_TAG, requireProgram, saveGrants } from "@/server/services/admin-grants";

export type GrantsActionResult = { ok: true; written: number } | { ok: false; error: string };

export async function saveGrantsAction(input: unknown): Promise<GrantsActionResult> {
  try {
    const admin = await requireProgram(ROUTES.adminGrants, "save");
    const parsed = grantsInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.invalid };
    if (dropsSelfLock(admin.id, parsed.data)) return { ok: false, error: M.selfLockError };
    const written = await saveGrants(admin.id, parsed.data);
    // 메뉴, 툴바, 진입 막기는 관리자 레이아웃이 읽는다 — 캐시를 비우고 관리자 영역 전체를 민다
    updateTag(ADMIN_GRANTS_TAG);
    revalidatePath(ROUTES.admin, "layout");
    revalidatePath(ROUTES.shopsAdmin);
    return { ok: true, written };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
