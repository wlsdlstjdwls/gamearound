// 웹푸시 발송 — 설계서 §7. VAPID 키는 환경변수. 발송은 워커(GitHub Actions)에서만 실행.
import webpush, { WebPushError } from "web-push";

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** sw.js 가 showNotification 에 그대로 쓰는 페이로드 */
export interface PushPayload {
  title: string;
  body: string;
  url: string; // 예: /games/<slug>
  tag?: string;
}

export type PushResult =
  | { ok: true; statusCode: number }
  | { ok: false; statusCode: number | null; gone: boolean; error: string };

/** 만료 구독으로 간주하고 삭제해야 하는 응답 코드 (§7: 410 Gone, 404) */
export const GONE_STATUS_CODES = new Set([404, 410]);

const PUSH_TTL_SEC = 60 * 60 * 24; // 하루 안에 못 받으면 폐기

let vapidConfigured = false;

function ensureVapid(): void {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT 환경변수가 없습니다");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

/** 단건 발송. 예외를 던지지 않고 결과 객체로 돌려준다 (410/404 → gone=true) */
export async function sendPush(sub: PushSubscriptionRow, payload: PushPayload): Promise<PushResult> {
  ensureVapid();
  try {
    const res = await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: PUSH_TTL_SEC, urgency: "normal" },
    );
    return { ok: true, statusCode: res.statusCode };
  } catch (e) {
    if (e instanceof WebPushError) {
      return { ok: false, statusCode: e.statusCode, gone: GONE_STATUS_CODES.has(e.statusCode), error: e.message };
    }
    return { ok: false, statusCode: null, gone: false, error: e instanceof Error ? e.message : String(e) };
  }
}
