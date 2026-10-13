// 세션 사본(Redis)의 모양과 판정 — 순수 함수만 둔다. 읽고 쓰는 일은 server/auth/session-cache 가 한다.
//
// 사본이 하는 일 둘:
//  1) 신선한 동안(SESSION_CACHE_FRESH_SEC)은 DB 를 안 묻는다. 페이지마다 세션 확인 왕복이 나가 Neon 을 깨웠다.
//  2) DB 가 안 열릴 때 세션 만료 전까지는 사본으로 로그인을 유지한다(2026-10-13 Neon 한도 초과로 로그인한 회원이 전부 튕겼다).
// 신선한 창을 짧게 두는 이유: 권한이 바뀌거나(판매자 승인) 세션이 폐기돼도 이 시간 안에는 옛 값이 보인다.
// 폐기는 지우는 쪽(로그아웃, 비번 재설정)이 사본까지 지워서 즉시 반영한다 — 늦는 것은 권한 변경뿐이다.
import { SESSION_CACHE_FRESH_SEC } from "@/lib/auth/constants";

export type SessionCacheState = "fresh" | "stale" | "expired";

export interface CachedSession<U, S> {
  user: U;
  session: S;
  /** 사본을 쓴 시각(ms) */
  cachedAt: number;
  /** 세션 만료 시각(ms). 이 뒤로는 DB 가 안 열려도 사본을 쓰지 않는다 */
  expiresAt: number;
}

export function sessionCacheState(entry: Pick<CachedSession<unknown, unknown>, "cachedAt" | "expiresAt">, now: number): SessionCacheState {
  if (entry.expiresAt <= now) return "expired";
  return now - entry.cachedAt < SESSION_CACHE_FRESH_SEC * 1000 ? "fresh" : "stale";
}

/** Redis 에 남길 수명(초). 세션이 끝나는 시각까지만 — 그 뒤의 사본은 쓸모가 없다 */
export function sessionCacheTtlSec(expiresAt: number, now: number): number {
  return Math.max(1, Math.ceil((expiresAt - now) / 1000));
}

/**
 * JSON 을 거치며 문자열이 된 시각 칸(이름이 At 으로 끝나는 칸)을 Date 로 되살린다.
 * users, sessions 의 시각 칸이 전부 이 이름 규칙을 따른다(createdAt, updatedAt, expiresAt, lastSeenAt, emailVerifiedAt).
 */
export function reviveDates<T>(row: T): T {
  if (!row || typeof row !== "object") return row;
  const out: Record<string, unknown> = { ...(row as Record<string, unknown>) };
  for (const [k, v] of Object.entries(out)) {
    if (k.endsWith("At") && typeof v === "string") out[k] = new Date(v);
  }
  return out as T;
}
