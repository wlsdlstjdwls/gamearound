// users 서비스 — 자체 이메일/비밀번호 인증 (§6 개정). Server Action/Route Handler/Server Component에서 현재 사용자를 얻을 때 사용.
import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { users, type Role } from "@/server/db/schema";
import { ADMIN_EMAILS_ENV } from "@/lib/auth/constants";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { normalizeEmail } from "@/lib/auth/schemas";
import { getDummyHash, hashPassword, verifyPassword } from "@/server/auth/password";
import { readSessionToken, validateSessionToken } from "@/server/auth/session";

export type UserRow = typeof users.$inferSelect;
/** 클라이언트로 내려보내도 되는 최소 정보 (passwordHash 등 제외) */
export type PublicUser = Pick<UserRow, "id" | "email" | "displayName" | "role">;

const ROLES: Role[] = ["user", "game_company", "seller", "admin"];
export function toRole(v: unknown): Role {
  return typeof v === "string" && (ROLES as string[]).includes(v) ? (v as Role) : "user";
}

export function toPublicUser(u: UserRow): PublicUser {
  return { id: u.id, email: u.email, displayName: u.displayName, role: u.role };
}

/** ADMIN_EMAILS 환경변수에 포함된 이메일이면 admin. MVP 부트스트랩용(외부 인증 대시보드 없이 승격) */
function isBootstrapAdmin(email: string): boolean {
  const list = process.env[ADMIN_EMAILS_ENV];
  if (!list) return false;
  return list.split(",").map((s) => normalizeEmail(s)).filter(Boolean).includes(email);
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const row = await getDb().query.users.findFirst({ where: eq(users.email, normalizeEmail(email)) });
  return row ?? null;
}

/** 가입 폼이 칸에서 묻는 중복 확인. 행 전체(비밀번호 해시 포함)를 끌어올 이유가 없어 id 하나만 본다 */
export async function isEmailRegistered(email: string): Promise<boolean> {
  const row = await getDb().query.users.findFirst({ columns: { id: true }, where: eq(users.email, normalizeEmail(email)) });
  return Boolean(row);
}

export class EmailTakenError extends Error {
  constructor() {
    super(AUTH_MESSAGES.emailTaken);
    this.name = "EmailTakenError";
  }
}

/** 회원가입. 이메일 중복이면 EmailTakenError (unique 제약도 동시에 걸러 경합 상황 방어) */
export async function createUser(input: { email: string; password: string; displayName: string }): Promise<UserRow> {
  const email = normalizeEmail(input.email);
  if (await findUserByEmail(email)) throw new EmailTakenError();
  const passwordHash = await hashPassword(input.password);
  try {
    const [row] = await getDb()
      .insert(users)
      .values({ email, passwordHash, displayName: input.displayName.trim(), role: isBootstrapAdmin(email) ? "admin" : "user" })
      .returning();
    return row;
  } catch (e) {
    // 23505 = unique_violation
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "23505") throw new EmailTakenError();
    throw e;
  }
}

/**
 * 이메일/비밀번호 검증. 실패 이유(계정 없음 vs 비밀번호 틀림)를 구분하지 않으며,
 * 계정이 없어도 더미 해시를 검증해 응답 시간을 맞춘다.
 */
export async function verifyCredentials(email: string, password: string): Promise<UserRow | null> {
  const user = await findUserByEmail(email);
  if (!user || !user.passwordHash) {
    await verifyPassword(password, await getDummyHash());
    return null;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  // 관리자 부트스트랩: 환경변수에 추가된 뒤 처음 로그인하면 승격
  if (user.role !== "admin" && isBootstrapAdmin(user.email)) {
    const [updated] = await getDb().update(users).set({ role: "admin", updatedAt: new Date() }).where(eq(users.id, user.id)).returning();
    return updated;
  }
  return user;
}

/** 로그인 사용자의 users 행. 비로그인/만료 시 null. 같은 요청 안에서는 한 번만 조회(React cache) */
export const getCurrentUser = cache(async (): Promise<UserRow | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  const result = await validateSessionToken(token);
  return result?.user ?? null;
});

/** 로그인 필수. 아니면 throw (Server Action 내부 재검증 §6) */
export async function requireUser(): Promise<UserRow> {
  const u = await getCurrentUser();
  if (!u) throw new Error(AUTH_MESSAGES.loginRequired);
  return u;
}

export async function requireRole(...roles: Role[]): Promise<UserRow> {
  const u = await requireUser();
  if (!roles.includes(u.role)) throw new Error(AUTH_MESSAGES.forbidden);
  return u;
}

export const requireAdmin = () => requireRole("admin");
