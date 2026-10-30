// 알림 발송 한 곳(2026-10-30). 직접 발송(알림발송관리)과 사건 알림(업무요청, 데이터 점검)이 모두 여기를 지난다.
// 하는 일: 받는 곳 코드를 chat id 로 바꾸고 → 텔레그램에 보내고 → 결과를 발송 이력(notify_sends)에 한 줄 남긴다.
//
// services 가 아니라 server/notify 에 둔 이유: 수집(sync/quality)도 부른다. 수집 계층이 services 를 부르지 않는 규칙(AGENTS §1)을 지키면서
// 둘이 같은 길을 쓰려면 텔레그램(server/telegram), 메일(server/mail) 같은 하부 모듈 자리여야 한다.
// 실패해도 던지지 않는다 — 결과를 돌려주고 이력에 사유를 남긴다. 사건 알림은 응답 뒤(after)에 돌아 던질 곳이 없다.
import "server-only";
import { and, eq } from "drizzle-orm";
import { errorMessage } from "@/lib/errors";
import { CODE_GROUPS } from "@/lib/codes/groups";
import { NOTIFY_MESSAGES as M } from "@/lib/admin/messages/notify";
import { renderNotice } from "@/lib/notify/template";
import { createdBy, type AuditSource } from "@/server/db/audit";
import { getDb } from "@/server/db/client";
import { commonCodeGroups, commonCodes, notifySends, notifyTemplates, type NotifySendStatus, type NotifyTrigger } from "@/server/db/schema";
import { adminChatId, sendTelegram, telegramConfigured, telegramTokenSet } from "@/server/telegram/send";

/** 실패 사유를 이력에 남기는 길이. 텔레그램 거절 본문은 앞 몇 줄이면 사유가 다 보인다 */
const ERROR_KEEP = 300;

export type NoticeResult = { status: NotifySendStatus; error: string | null; id: string | null };

export interface NoticeInput {
  channel: string;
  /** 변수를 채운 글(renderNotice 결과) */
  text: string;
  templateCode: string | null;
  trigger: NotifyTrigger;
  /** 직접 발송한 관리자. 사건 알림은 사건을 낸 관리자 */
  actorId?: string;
  source: AuditSource;
}

/** 받는 곳 코드 → chat id. 못 찾으면 건너뛸 사유 */
async function resolveChat(channel: string): Promise<{ chatId: string } | { skip: string }> {
  // services/common-codes 를 부르지 않고 직접 읽는다 — 수집 계층도 이 함수를 지난다(머리 주석)
  const [code] = await getDb()
    .select({ name: commonCodes.name, attr1: commonCodes.attr1, active: commonCodes.active, groupActive: commonCodeGroups.active })
    .from(commonCodes)
    .innerJoin(commonCodeGroups, eq(commonCodeGroups.groupCode, commonCodes.groupCode))
    .where(and(eq(commonCodes.groupCode, CODE_GROUPS.notifyChannel), eq(commonCodes.code, channel)))
    .limit(1);
  if (!code) return { skip: M.skipNoChannel(channel) };
  if (!code.active || !code.groupActive) return { skip: M.skipChannelOff(code.name) };
  const chatId = code.attr1?.trim() || adminChatId();
  return chatId ? { chatId } : { skip: M.skipNoChatId(code.name) };
}

/** 한 통 보내고 이력을 남긴다 */
export async function dispatchNotice(input: NoticeInput): Promise<NoticeResult> {
  let status: NotifySendStatus = "skipped";
  let error: string | null = null;
  let chatId: string | null = null;
  try {
    const target = telegramTokenSet() ? await resolveChat(input.channel) : { skip: M.skipNoToken };
    if ("skip" in target) error = target.skip;
    else {
      chatId = target.chatId;
      try {
        await sendTelegram(chatId, input.text);
        status = "sent";
      } catch (e) {
        status = "failed";
        error = errorMessage(e).slice(0, ERROR_KEEP);
      }
    }
  } catch (e) {
    // 받는 곳을 읽다 DB 가 넘어진 경우. 이력도 못 남길 수 있지만 한 번은 시도한다
    status = "failed";
    error = errorMessage(e).slice(0, ERROR_KEEP);
  }
  try {
    const [row] = await getDb()
      .insert(notifySends)
      .values({
        templateCode: input.templateCode,
        channel: input.channel,
        chatId,
        trigger: input.trigger,
        text: input.text,
        status,
        error,
        sentAt: status === "sent" ? new Date() : null,
        ...createdBy(input.source, input.actorId),
      })
      .returning({ id: notifySends.id });
    return { status, error, id: row?.id ?? null };
  } catch (e) {
    console.error(`[notify] 이력 기록 실패: ${errorMessage(e)}`);
    return { status, error, id: null };
  }
}

/**
 * 사건 알림 한 통. 템플릿을 읽어 변수를 채워 보낸다.
 * 템플릿이 없으면(시드 전 DB, 누가 코드를 지움) fallback 글을 관리자 채널로 보낸다 — 알림이 조용히 사라지는 것보다 낫다.
 * 템플릿이 미사용이면 보내지 않는다 — 알림템플릿관리에서 끄는 것이 곧 그 사건 알림을 끄는 길이다. 이력에 건너뛴 사유를 남긴다.
 * 토큰과 관리자 채널(TELEGRAM_ADMIN_CHAT_ID) 중 하나라도 없으면 보내지도, 이력을 남기지도 않는다 — 앞 규칙(telegramConfigured)과 같다.
 * 이 PC 처럼 다른 일로 토큰만 깔린 곳(로컬 DB 가 운영)에서 개발 중 조작마다 건너뜀 줄이 쌓이면 안 된다.
 */
export async function dispatchSystemNotice(
  templateCode: string,
  vars: Record<string, string>,
  opts: { fallback: () => string; fallbackChannel: string; actorId?: string; source: AuditSource },
): Promise<NoticeResult | null> {
  if (!telegramConfigured()) return null;
  const [tpl] = await getDb()
    .select({ body: notifyTemplates.body, channel: notifyTemplates.channel, active: notifyTemplates.active, name: notifyTemplates.name })
    .from(notifyTemplates)
    .where(eq(notifyTemplates.code, templateCode))
    .limit(1);
  const base = { templateCode, trigger: "system" as const, actorId: opts.actorId, source: opts.source };
  if (!tpl) return dispatchNotice({ ...base, channel: opts.fallbackChannel, text: opts.fallback() });
  const text = renderNotice(tpl.body, vars);
  if (!tpl.active) {
    try {
      await getDb()
        .insert(notifySends)
        .values({ ...base, channel: tpl.channel, text, status: "skipped", error: M.skipTemplateOff(tpl.name), ...createdBy(opts.source, opts.actorId) });
    } catch (e) {
      console.error(`[notify] 이력 기록 실패: ${errorMessage(e)}`);
    }
    return { status: "skipped", error: M.skipTemplateOff(tpl.name), id: null };
  }
  return dispatchNotice({ ...base, channel: tpl.channel, text });
}
