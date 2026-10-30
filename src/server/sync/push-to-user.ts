// 한 사람의 등록 기기 전부에 웹푸시 한 통. 목표가 알림(dispatch-alerts)과 찜 할인 알림(dispatch-wish-alerts)이 같이 쓴다.
// 만료된 구독(404, 410)은 여기서 지운다 — 두 발송이 따로 지우면 한쪽이 지운 행을 다른 쪽이 또 찾는다.
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { pushSubscriptions } from "@/server/db/schema";
import { sendPush, type PushPayload } from "@/server/push/webpush";

export type PushToUserResult = { attempted: boolean; sent: number; failed: number; removed: number };

export async function pushToUser(userId: string, payload: PushPayload, logTag: string): Promise<PushToUserResult> {
  const db = getDb();
  const out: PushToUserResult = { attempted: false, sent: 0, failed: 0, removed: 0 };
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  for (const sub of subs) {
    out.attempted = true;
    const res = await sendPush(sub, payload);
    if (res.ok) {
      out.sent++;
      continue;
    }
    out.failed++;
    if (res.gone) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      out.removed++;
    } else {
      console.warn(`[${logTag}] push 실패 (status=${res.statusCode}): ${res.error}`);
    }
  }
  return out;
}
