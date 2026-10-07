// 메일 한 통 보내기 — Resend HTTP API.
// adapters/http 의 createHttpClient 를 쓰지 않는 이유: 그쪽은 수집 소스(Source)에 매인 클라이언트라
// 실패를 AdapterError 로 바꾸고 sync_logs 에 남기는 흐름에 맞춰져 있다. 메일은 수집이 아니다.
import "server-only";
import { MAIL_FROM_ENV, MAIL_TIMEOUT_MS, RESEND_API_KEY_ENV, RESEND_SEND_URL } from "@/server/mail/constants";

export type MailMessage = { to: string; subject: string; text: string; html: string };

/** 키와 보내는 주소가 둘 다 있어야 보낼 수 있다 */
export function mailConfigured(): boolean {
  return Boolean(process.env[RESEND_API_KEY_ENV]?.trim() && process.env[MAIL_FROM_ENV]?.trim());
}

/** 실패하면 던진다. 받는 쪽(재설정 요청)은 응답을 이미 돌려준 뒤라 로그로만 남긴다 */
export async function sendMail(message: MailMessage): Promise<void> {
  const key = process.env[RESEND_API_KEY_ENV]?.trim();
  const from = process.env[MAIL_FROM_ENV]?.trim();
  if (!key || !from) throw new Error(`${RESEND_API_KEY_ENV} / ${MAIL_FROM_ENV} 없음`);

  const res = await fetch(RESEND_SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
    signal: AbortSignal.timeout(MAIL_TIMEOUT_MS),
  });
  if (!res.ok) {
    // 본문에 실패 사유(도메인 미인증, 수신 제한 등)가 온다 — 받는 주소는 로그에 남기지 않는다
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
  }
}
