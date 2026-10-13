// 세션 사본을 Redis 에 읽고 쓴다. 판정 규칙과 이유는 lib/auth/session-cache 머리 주석에 있다.
//
// Redis 가 실패해도 인증은 서야 한다 — 이 파일의 모든 함수는 실패를 삼키고 "사본 없음" 처럼 군다.
// 사본은 덤이고 원본은 DB 다. 사본 때문에 로그인이 깨지는 날이 오면 덤이 원본을 해친 것이다.
import "server-only";
import { SESSION_CACHE_KEY_PREFIX, SESSION_CACHE_USER_KEY_PREFIX, SESSION_TTL_SEC } from "@/lib/auth/constants";
import { reviveDates, sessionCacheTtlSec, type CachedSession } from "@/lib/auth/session-cache";
import { errorMessage } from "@/lib/errors";
import type { sessions, users } from "@/server/db/schema";
import { getRedis } from "@/server/redis";

type UserRow = typeof users.$inferSelect;
type SessionRow = typeof sessions.$inferSelect;
export type SessionCacheEntry = CachedSession<UserRow, SessionRow>;

const sessionKey = (id: string) => `${SESSION_CACHE_KEY_PREFIX}${id}`;
const userKey = (userId: string) => `${SESSION_CACHE_USER_KEY_PREFIX}${userId}`;

function warn(what: string, e: unknown): void {
  console.error(`[session-cache] ${what} 실패:`, errorMessage(e));
}

export async function readCachedSession(id: string): Promise<SessionCacheEntry | null> {
  try {
    const raw = await getRedis().get<SessionCacheEntry>(sessionKey(id));
    if (!raw || typeof raw !== "object" || !raw.user || !raw.session) return null;
    return { ...raw, user: reviveDates(raw.user), session: reviveDates(raw.session) };
  } catch (e) {
    warn("읽기", e);
    return null;
  }
}

/** 비밀번호 해시는 사본에 넣지 않는다 — 세션 확인에 필요 없고, Redis 가 털려도 해시까지 나가지 않게 */
export async function writeCachedSession(id: string, user: UserRow, session: SessionRow): Promise<void> {
  const now = Date.now();
  const expiresAt = session.expiresAt.getTime();
  const entry: SessionCacheEntry = { user: { ...user, passwordHash: null }, session, cachedAt: now, expiresAt };
  const ttl = sessionCacheTtlSec(expiresAt, now);
  try {
    const r = getRedis();
    // 사람별 목록은 세션 하나의 남은 수명이 아니라 최대 수명으로 둔다 — 더 오래 사는 다른 기기 사본을 잃지 않게
    await Promise.all([r.set(sessionKey(id), entry, { ex: ttl }), r.sadd(userKey(user.id), id).then(() => r.expire(userKey(user.id), SESSION_TTL_SEC))]);
  } catch (e) {
    warn("쓰기", e);
  }
}

export async function dropCachedSession(id: string): Promise<void> {
  try {
    await getRedis().del(sessionKey(id));
  } catch (e) {
    warn("지우기", e);
  }
}

/** 그 사람의 사본 전부. 비밀번호 재설정이 DB 세션을 지울 때 같이 부른다 */
export async function dropCachedSessionsOfUser(userId: string): Promise<void> {
  try {
    const r = getRedis();
    const ids = await r.smembers(userKey(userId));
    await Promise.all([...ids.map((id) => r.del(sessionKey(id))), r.del(userKey(userId))]);
  } catch (e) {
    warn("사람별 지우기", e);
  }
}
