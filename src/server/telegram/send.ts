// 텔레그램 메시지 한 통 보내기 — Bot API sendMessage.
// adapters/http 의 createHttpClient 를 쓰지 않는 이유는 메일(server/mail/send)과 같다: 그쪽은 수집 소스에 매인 클라이언트다.
import "server-only";
import {
  TELEGRAM_ADMIN_CHAT_ID_ENV,
  TELEGRAM_API_BASE,
  TELEGRAM_BOT_TOKEN_ENV,
  TELEGRAM_TEXT_MAX,
  TELEGRAM_TIMEOUT_MS,
} from "@/server/telegram/constants";

/** 토큰과 받는 곳이 둘 다 있어야 보낸다 */
export function telegramConfigured(): boolean {
  return Boolean(process.env[TELEGRAM_BOT_TOKEN_ENV]?.trim() && process.env[TELEGRAM_ADMIN_CHAT_ID_ENV]?.trim());
}

/**
 * 관리자 채널로 글 한 통. 실패하면 던진다 — 부르는 쪽은 응답을 이미 돌려준 뒤라 로그로만 남긴다.
 * parse_mode 를 쓰지 않는다: 할 일 제목은 사람이 친 글이라 `_`, `*`, `<` 를 이스케이프 없이 넣으면 400 이 난다. 주소는 텔레그램이 알아서 링크로 만든다.
 */
export async function sendAdminTelegram(text: string): Promise<void> {
  const token = process.env[TELEGRAM_BOT_TOKEN_ENV]?.trim();
  const chatId = process.env[TELEGRAM_ADMIN_CHAT_ID_ENV]?.trim();
  if (!token || !chatId) throw new Error(`${TELEGRAM_BOT_TOKEN_ENV} / ${TELEGRAM_ADMIN_CHAT_ID_ENV} 없음`);

  const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, TELEGRAM_TEXT_MAX),
      // 링크 미리보기는 관리자 로그인 화면 카드라 쓸모가 없고 글만 길어진다
      link_preview_options: { is_disabled: true },
    }),
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    // 본문에 사유가 온다(chat not found, bot is not a member 등). 토큰이 든 주소는 남기지 않는다
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram ${res.status}: ${body.slice(0, 300)}`);
  }
}
