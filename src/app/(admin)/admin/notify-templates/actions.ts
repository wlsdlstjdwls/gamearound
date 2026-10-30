"use server";
// 알림 템플릿 저장 Server Action. 관리자 role 을 다시 보고, 화면과 같은 스키마(lib/notify/schemas)로 검증한다.
import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages";
import { notifyTemplateSchema } from "@/lib/notify/schemas";
import { ROUTES } from "@/lib/routes";
import { saveNotifyTemplate } from "@/server/services/notify-admin";
import { requireAdmin } from "@/server/services/users";

export type TemplateActionResult = { ok: true } | { ok: false; error: string };

export async function saveTemplateAction(input: unknown, isNew: boolean): Promise<TemplateActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = notifyTemplateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.invalid };
    const r = await saveNotifyTemplate(admin.id, parsed.data, isNew);
    if (!r.ok) return { ok: false, error: r.reason === "code_exists" ? M.codeExists : M.failed };
    revalidatePath(ROUTES.adminNotifyTemplates);
    revalidatePath(ROUTES.adminNotifySends);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
