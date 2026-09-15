// 서버 세션 — 쿠키에는 랜덤 토큰, DB(sessions)에는 sha256 해시. DB가 털려도 쿠키를 위조할 수 없다.
// 슬라이딩 만료: 남은 수명이 절반 아래면 연장. Server Action/Route Handler에서만 호출(cookies() 쓰기 가능 컨텍스트).
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, inArray, lt, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
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

/**
 * "이 컬럼이 가리키는 소유자가 곧 현재 세션의 사용자" 라는 조회 조건. 세션 쿠키가 없으면 null.
 *
 * 왜 있나: 사용자 화면은 "세션 검증(왕복 1회) → userId → 데이터 조회(왕복 2회)" 로 왕복을 줄 세우고
 * 있었다. Neon 이 us-east-1 이라 왕복 1회가 210~220ms 다(2026-09-15 실측) — /wishlist 본문이
 * 525ms 에 오던 것의 거의 전부가 그 기다림이었다. 소유자 조건을 세션 서브질의로 바꾸면 검증과
 * 조회가 한 왕복에서 끝난다. 이 함수 자체는 쿠키만 읽으므로 왕복을 더하지 않는다.
 *
 * 서브질의가 아니라 **완성된 조건(SQL)** 을 돌려주는 이유가 둘이다.
 *  - drizzle 의 select 빌더는 thenable 이다. async 함수가 그것을 return 하면 그 자리에서
 *    await 돼 질의가 실행된다 — 왕복을 줄이려다 오히려 한 번 더 나간다.
 *  - `sql` 템플릿으로 서브질의를 쓰면 안 된다. 그렇게 썼다가 /wishlist 가 통째로 죽었다:
 *    `db.query.*.findMany` 는 뿌리 테이블에 별칭을 붙이고 조건 안의 컬럼 참조를 그 별칭으로
 *    다시 쓴다. 서브질의 안의 sessions 컬럼까지 바깥 별칭이 돼
 *    `select "wishlists"."user_id" from "sessions" where "wishlists"."expires_at" > now()`
 *    가 나갔다. 빌더가 만든 서브질의 객체는 따로 컴파일되므로 그 재작성을 타지 않는다.
 *
 * 만료 조건을 서브질의 안에 둔다 — 폐기된 쿠키로는 한 행도 읽히지 않는다. 만료 행 삭제는
 * 여기서 하지 않는다. 그건 validateSessionToken 과 일일 정리(purgeExpiredSessions)의 몫이다.
 *
 * 레이아웃 가드(requireUserOrRedirect)를 대신하지 않는다. 가드는 병렬로 돌며 "로그인 화면으로
 * 보낼지" 를 정하고, 이 조건은 "남의 행을 못 읽게" 한다. 둘 다 있어야 한다.
 */
export async function ownedByCurrentSession(column: PgColumn): Promise<SQL | null> {
  const token = await readSessionToken();
  if (!token) return null;
  const db = getDb();
  return inArray(
    column,
    db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(and(eq(sessions.id, hashSessionToken(token)), gt(sessions.expiresAt, new Date()))),
  );
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
