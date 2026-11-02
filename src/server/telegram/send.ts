// 텔레그램 메시지 한 통 보내기 — Bot API sendMessage. 받는 곳 고르기, 템플릿, 이력은 server/notify 가 맡는다.
// adapters/http 의 createHttpClient 를 쓰지 않는 이유는 메일(server/mail/send)과 같다: 그쪽은 수집 소스에 매인 클라이언트다.
import "server-only";
import {
  TELEGRAM_ADMIN_CHAT_ID_ENV,
  TELEGRAM_API_BASE,
  TELEGRAM_BOT_TOKEN_ENV,
  TELEGRAM_TEXT_MAX,
  TELEGRAM_TIMEOUT_MS,
} from "@/server/telegram/constants";
import { splitNotice } from "@/lib/notify/media";

/** 봇 토큰이 있나. 없으면(로컬, 미리보기) 알림은 꺼진 것으로 본다 — 로컬 DB 가 운영이라 개발 중 조작이 운영 채널로 나가면 안 된다 */
export function telegramTokenSet(): boolean {
  return Boolean(process.env[TELEGRAM_BOT_TOKEN_ENV]?.trim());
}

/** 기본 받는 곳(관리자 채널) chat id. 공통코드 NOTIFY_CHANNEL 의 chat id 가 비면 이 값으로 보낸다 */
export function adminChatId(): string | null {
  return process.env[TELEGRAM_ADMIN_CHAT_ID_ENV]?.trim() || null;
}

/** 토큰과 관리자 채널이 둘 다 있어야 보낸다(사건 알림이 보낼지 정할 때) */
export function telegramConfigured(): boolean {
  return telegramTokenSet() && adminChatId() !== null;
}

/**
 * 글 한 통. 실패하면 던진다 — 부르는 쪽(server/notify)이 사유를 발송 이력에 남긴다.
 * 글은 텔레그램 HTML 이다(parse_mode HTML). 변수 값은 lib/notify/template 이 이스케이프해 넘긴다 — 안 하면 `<` 하나에 400 이 난다.
 * MarkdownV2 를 안 고른 이유: 이스케이프할 글자가 18개라 제목의 `.`, `-` 하나도 빠뜨리면 실패한다. HTML 은 셋이다.
 * 상한으로 자르면 닫는 태그가 잘려 400 이 나지만, 템플릿 저장 검사와 변수 길이 상한이 상한에 닿지 않게 한다.
 */
export async function sendTelegram(chatId: string, text: string): Promise<void> {
  await callBot("sendMessage", {
    chat_id: chatId,
    text: text.slice(0, TELEGRAM_TEXT_MAX),
    parse_mode: "HTML",
    // 링크 미리보기는 관리자 로그인 화면 카드라 쓸모가 없고 글만 길어진다
    link_preview_options: { is_disabled: true },
  });
}

/**
 * 본문 한 통을 조각마다 메시지로(2026-11-02). 한 메시지에 글과 사진을 섞을 수 없어 이미지, 영상 자리에서 나눈다(lib/notify/media).
 * 사진, 영상은 주소로 보낸다 — 텔레그램이 우리 Blob 주소에서 직접 받아 간다(주소 상한: 사진 5MB, 파일 20MB, 올릴 때 막는다).
 * 앞 조각이 실패하면 뒤는 보내지 않는다 — 반쯤 간 글이 순서가 뒤섞여 이어지면 더 헷갈린다
 */
export async function sendTelegramParts(chatId: string, html: string): Promise<void> {
  const parts = splitNotice(html);
  for (const p of parts) {
    if (p.kind === "text") await sendTelegram(chatId, p.html);
    else if (p.kind === "image") await callBot("sendPhoto", { chat_id: chatId, photo: p.src });
    else await callBot("sendVideo", { chat_id: chatId, video: p.src, supports_streaming: true });
  }
}

/** Bot API 한 번. 실패하면 사유를 담아 던진다 */
async function callBot(method: string, payload: Record<string, unknown>): Promise<void> {
  const token = process.env[TELEGRAM_BOT_TOKEN_ENV]?.trim();
  if (!token) throw new Error(`${TELEGRAM_BOT_TOKEN_ENV} 없음`);
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    // 본문에 사유가 온다(chat not found, bot is not a member 등). 토큰이 든 주소는 남기지 않는다
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram ${method} ${res.status}: ${body.slice(0, 300)}`);
  }
}
