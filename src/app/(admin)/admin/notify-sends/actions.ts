"use server";
// 직접 발송 Server Action(2026-10-30). 관리자 role 을 다시 보고, 화면과 같은 스키마와 같은 채우기 함수(lib/notify/template)로 글을 만든 뒤
// server/notify 로 보낸다. 미리 보기에서 본 글이 그대로 나간다. 결과(성공, 실패, 건너뜀)는 발송 이력에 남고 화면에도 돌려준다.
import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages";
import { manualSendSchema, TELEGRAM_TEXT_MAX } from "@/lib/notify/schemas";
import { renderNotice, templateVars } from "@/lib/notify/template";
import { ROUTES } from "@/lib/routes";
import { dispatchNotice } from "@/server/notify/dispatch";
import type { NotifySendStatus } from "@/server/db/schema";
import { requireAdmin } from "@/server/services/users";

export type SendActionResult = { ok: true; status: NotifySendStatus; error: string | null } | { ok: false; error: string };

export async function sendNoticeAction(input: unknown): Promise<SendActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = manualSendSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.invalid };
    const { body, vars, channel, templateCode } = parsed.data;
    const missing = templateVars(body).filter((n) => !vars[n]?.trim());
    if (missing.length > 0) return { ok: false, error: M.missingVars(missing) };
    const text = renderNotice(body, vars);
    if (text.length > TELEGRAM_TEXT_MAX) return { ok: false, error: M.tooLong(text.length, TELEGRAM_TEXT_MAX) };
    const r = await dispatchNotice({ channel, text, templateCode, trigger: "manual", actorId: admin.id, source: "admin" });
    revalidatePath(ROUTES.adminNotifySends);
    return { ok: true, status: r.status, error: r.error };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
