// 푸시 구독 저장 서비스 (§7). 발송은 워커(web-push)가 담당하고 Next.js는 구독 저장/삭제만 한다.
import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { ownedByCurrentSession } from "@/server/auth/session";
import { pushSubscriptions } from "@/server/db/schema";

export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

/** endpoint 기준 upsert. 같은 endpoint가 다른 사용자로 재등록되면 소유자도 갱신 */
export async function upsertPushSubscription(userId: string, input: PushSubscriptionInput): Promise<{ id: string }> {
  const [row] = await getDb()
    .insert(pushSubscriptions)
    .values({ userId, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: input.keys.p256dh, auth: input.keys.auth },
    })
    .returning({ id: pushSubscriptions.id });
  return row;
}

/** 본인 소유 endpoint만 삭제. 삭제된 행 수 반환 */
export async function deletePushSubscription(userId: string, endpoint: string): Promise<number> {
  const rows = await getDb()
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
    .returning({ id: pushSubscriptions.id });
  return rows.length;
}

/**
 * 내 등록 기기(구독) 수 — 설정 페이지 표시용. 비로그인이면 0.
 *
 * userId 를 받지 않는다: 받으면 호출부가 세션 조회를 먼저 기다려야 해서 왕복이 줄을 선다.
 * 소유자를 세션 서브질의로 걸면 설정 화면이 사용자 조회와 이 집계를 나란히 쏠 수 있다.
 * 근거는 currentUserIdSql 주석.
 */
export async function countMyPushSubscriptions(): Promise<number> {
  const owner = await ownedByCurrentSession(pushSubscriptions.userId);
  if (!owner) return 0;
  const [row] = await getDb().select({ n: count() }).from(pushSubscriptions).where(owner);
  return Number(row?.n ?? 0);
}
