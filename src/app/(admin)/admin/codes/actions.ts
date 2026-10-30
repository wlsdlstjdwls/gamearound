"use server";
// 공통코드 저장 Server Action. 관리자 role 을 다시 보고, 화면과 같은 스키마(lib/codes/schemas)로 검증한 뒤 그룹 하나를 저장한다.
import { revalidatePath, updateTag } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { CODES_MESSAGES as M } from "@/lib/admin/messages";
import { commonCodeGroupSchema } from "@/lib/codes/schemas";
import { CODES_TAG, saveCodeGroup } from "@/server/services/common-codes";
import { requireAdmin } from "@/server/services/users";

export type CodesActionResult = { ok: true } | { ok: false; error: string };

export async function saveCodeGroupAction(input: unknown, isNew: boolean): Promise<CodesActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = commonCodeGroupSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.invalid };
    const r = await saveCodeGroup(admin.id, parsed.data, isNew);
    if (!r.ok) return { ok: false, error: r.reason === "group_exists" ? M.groupExists : M.failed };
    // 코드북 캐시를 바로 비우고 모든 화면을 민다 — 이름표가 화면 곳곳(공개 화면 포함)에 박혀 있다
    updateTag(CODES_TAG);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
