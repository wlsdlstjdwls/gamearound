// 서버 세션 — 쿠키에는 랜덤 토큰, DB(sessions)에는 sha256 해시. DB가 털려도 쿠키를 위조할 수 없다.
// 슬라이딩 만료: 남은 수명이 절반 아래면 연장. Server Action/Route Handler에서만 호출(cookies() 쓰기 가능 컨텍스트).
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { SESSION_COOKIE_NAME, SESSION_RENEW_BELOW_SEC, SESSION_TOKEN_BYTES, SESSION_TTL_SEC } from "@/lib/auth/constants";

export type SessionUser = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;

function generateToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, token, cookieOptions(expiresAt));
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, "", cookieOptions(new Date(0)));
}

export async function readSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;
}

/** 새 세션 발급 + 쿠키 설정. 로그인/가입 성공 직후 호출 */
export async function createSession(userId: string, meta: { userAgent?: string | null; ip?: string | null } = {}): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SEC * 1000);
  await getDb().insert(sessions).values({
    id: hashSessionToken(token),
    userId,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 512) ?? null,
    ip: meta.ip?.slice(0, 64) ?? null,
  });
  await setSessionCookie(token, expiresAt);
}

/**
 * 토큰 검증 → 사용자 행. 만료면 행 삭제 후 null.
 * 연장이 필요할 때만 DB write. 쿠키 갱신은 호출자가 쓰기 가능한 컨텍스트일 때만(`renewCookie`).
 */
export async function validateSessionToken(token: string, opts: { renewCookie?: boolean } = {}): Promise<{ user: SessionUser; session: SessionRow } | null> {
  const id = hashSessionToken(token);
  const db = getDb();
  const row = await db.query.sessions.findFirst({ where: eq(sessions.id, id), with: { user: true } });
  if (!row) return null;

  const now = Date.now();
  if (row.expiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  const { user, ...session } = row;
  const remainingSec = (row.expiresAt.getTime() - now) / 1000;
  if (remainingSec < SESSION_RENEW_BELOW_SEC) {
    const expiresAt = new Date(now + SESSION_TTL_SEC * 1000);
    await db.update(sessions).set({ expiresAt, lastSeenAt: new Date() }).where(eq(sessions.id, id));
    session.expiresAt = expiresAt;
    if (opts.renewCookie) {
      try {
        await setSessionCookie(token, expiresAt);
      } catch {
        // Server Component 렌더 중에는 쿠키를 쓸 수 없다 — 다음 액션/요청에서 갱신됨
      }
    }
  }
  return { user, session };
}

/** 현재 세션 폐기 (로그아웃) */
export async function invalidateCurrentSession(): Promise<void> {
  const token = await readSessionToken();
  if (token) await getDb().delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
  await clearSessionCookie();
}

/** 특정 사용자의 다른 기기 세션 전부 폐기 (비밀번호 변경 등 — 확장 지점) */
export async function invalidateUserSessions(userId: string, exceptToken?: string): Promise<void> {
  const db = getDb();
  if (exceptToken) {
    const keep = hashSessionToken(exceptToken);
    await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.id, keep)));
    await db.delete(sessions).where(and(eq(sessions.userId, userId), gt(sessions.id, keep)));
    return;
  }
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** 만료 세션 정리 — cron(daily)에서 호출 */
export async function purgeExpiredSessions(): Promise<number> {
  const deleted = await getDb().delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id });
  return deleted.length;
}
