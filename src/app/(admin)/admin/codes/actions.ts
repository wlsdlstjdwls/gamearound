"use server";
// 공통코드 저장 Server Action. 관리자 role 을 다시 보고, 화면과 같은 스키마(lib/codes/schemas)로 검증한 뒤 그룹 하나를 저장한다.
import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { CODES_MESSAGES as M } from "@/lib/admin/messages";
import { commonCodeGroupSchema } from "@/lib/codes/schemas";
import { ROUTES } from "@/lib/routes";
import { saveCodeGroup } from "@/server/services/common-codes";
import { requireAdmin } from "@/server/services/users";

export type CodesActionResult = { ok: true } | { ok: false; error: string };

export async function saveCodeGroupAction(input: unknown, isNew: boolean): Promise<CodesActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = commonCodeGroupSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.invalid };
    const r = await saveCodeGroup(admin.id, parsed.data, isNew);
    if (!r.ok) return { ok: false, error: r.reason === "group_exists" ? M.groupExists : M.failed };
    revalidatePath(ROUTES.adminCodes);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
