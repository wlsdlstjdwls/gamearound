"use server";
// 직접 발송 Server Action(2026-10-30). 관리자 role 을 다시 보고, 화면과 같은 스키마와 같은 채우기 함수(lib/notify/template)로 글을 만든 뒤
// server/notify 로 보낸다(텔레그램은 dispatch, 이메일은 mail). 미리 보기에서 본 글이 그대로 나간다. 결과(성공, 실패, 건너뜀)는 발송 이력에 남고 화면에도 돌려준다.
import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages";
import { manualSendSchema } from "@/lib/notify/schemas";
import { bodyLimit } from "@/lib/notify/schemas";
import { renderWebNotice } from "@/lib/notify/web";
import { renderNotice, templateVars } from "@/lib/notify/template";
import { ROUTES } from "@/lib/routes";
import { dispatchNotice } from "@/server/notify/dispatch";
import { dispatchMailNotice } from "@/server/notify/mail";
import type { NotifySendStatus } from "@/server/db/schema";
import { sendManualPush, sendManualWebNotice } from "@/server/services/notify-admin";
import { renderEmailSubject } from "@/lib/notify/email";
import { isPlainMedium } from "@/lib/notify/medium";
import { requireAdmin } from "@/server/services/users";

export type SendActionResult = { ok: true; status: NotifySendStatus; error: string | null } | { ok: false; error: string };

export async function sendNoticeAction(input: unknown): Promise<SendActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = manualSendSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.invalid };
    const { body, vars, medium, channel, recipient, subject, templateCode } = parsed.data;
    const missing = [...new Set([...templateVars(subject ?? ""), ...templateVars(body)])].filter((n) => !vars[n]?.trim());
    if (missing.length > 0) return { ok: false, error: M.missingVars(missing) };
    const text = isPlainMedium(medium) ? renderWebNotice(body, vars) : renderNotice(body, vars);
    const max = bodyLimit(medium);
    if (text.length > max) return { ok: false, error: M.tooLong(text.length, max) };
    const base = { templateCode, trigger: "manual" as const, actorId: admin.id, source: "admin" as const };
    // 스키마가 수단별 필수 칸(받는 곳, 받는 주소, 제목)을 이미 봤다
    if (medium === "push") {
      const sent = await sendManualPush(admin.id, { email: recipient ?? "", title: renderEmailSubject(subject ?? "", vars), body: text, templateCode });
      if (!sent) return { ok: false, error: M.skipNoMember };
      revalidatePath(ROUTES.adminNotifySends);
      return { ok: true, status: sent.status, error: sent.error };
    }
    if (medium === "web") {
      // 웹 알림은 회원 알림함에 한 줄 넣는 것이라 "건너뜀" 이 없다 — 회원이 없으면 화면에 바로 말한다
      const sent = await sendManualWebNotice(admin.id, { email: recipient ?? "", body: text, templateCode });
      if (!sent) return { ok: false, error: M.skipNoMember };
      revalidatePath(ROUTES.adminNotifySends);
      return { ok: true, status: "sent", error: null };
    }
    const r =
      medium === "email"
        ? await dispatchMailNotice({ ...base, to: recipient ?? "", subject: subject ?? "", body, vars })
        : await dispatchNotice({ ...base, channel: channel ?? "", text });
    revalidatePath(ROUTES.adminNotifySends);
    return { ok: true, status: r.status, error: r.error };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
