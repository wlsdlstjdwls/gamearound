// 권한 저장 액션의 몸통. 권한을 고치는 두 화면(사용자별프로그램관리, 프로그램별사용자권한관리)이 같은 표를 같은 규칙으로 쓰므로 여기 한 벌 둔다.
// 액션마다 다른 것은 "어느 화면의 저장 권한을 보느냐" 하나다 — 그 화면 주소를 받는다.
// 자기 계정의 권한 화면 조회, 저장은 끌 수 없다(SELF_LOCKED) — 화면이 칸을 잠그지만 여기서 한 번 더 막는다.
import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { GRANTS_MESSAGES as M } from "@/lib/admin/messages";
import { dropsSelfLock, grantsBatchSchema } from "@/lib/admin/grants";
import { ROUTES } from "@/lib/routes";
import { ADMIN_GRANTS_TAG, requireProgram, saveGrants } from "@/server/services/admin-grants";

export type GrantsActionResult = { ok: true; written: number } | { ok: false; error: string };

export async function saveGrantsFrom(screenHref: string, input: unknown): Promise<GrantsActionResult> {
  try {
    const admin = await requireProgram(screenHref, "save");
    const parsed = grantsBatchSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.invalid };
    if (parsed.data.some((b) => dropsSelfLock(admin.id, b))) return { ok: false, error: M.selfLockError };
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
