// users 서비스 — 자체 이메일/비밀번호 인증 (§6 개정). Server Action/Route Handler/Server Component에서 현재 사용자를 얻을 때 사용.
import "server-only";
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { userConsents, users, type ConsentKind, type Role } from "@/server/db/schema";
import { createdBy } from "@/server/db/audit";
import { ADMIN_EMAILS_ENV } from "@/lib/auth/constants";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { REVISED_AT } from "@/lib/legal";
import { normalizeEmail } from "@/lib/auth/schemas";
import { getDummyHash, hashPassword, verifyPassword } from "@/server/auth/password";
import { readSessionToken, validateSessionToken } from "@/server/auth/session";
import { dropCachedSessionsOfUser } from "@/server/auth/session-cache";

export type UserRow = typeof users.$inferSelect;
/** 클라이언트로 내려보내도 되는 최소 정보 (passwordHash 등 제외) */
export type PublicUser = Pick<UserRow, "id" | "email" | "displayName" | "role" | "avatarUrl">;

const ROLES: Role[] = ["user", "game_company", "seller", "admin"];
export function toRole(v: unknown): Role {
  return typeof v === "string" && (ROLES as string[]).includes(v) ? (v as Role) : "user";
}

export function toPublicUser(u: UserRow): PublicUser {
  return { id: u.id, email: u.email, displayName: u.displayName, role: u.role, avatarUrl: u.avatarUrl };
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

/**
 * 닉네임 중복(2026-10-26 사용자 결정: 막는다). 게시판이 생겨 남의 이름을 흉내 내는 일을 막으려는 것이다.
 * 대소문자와 띄어쓰기를 무시하고 견준다("Seed Tester" 와 "seedtester" 는 같은 이름). 공백 정리는 JS 에서 해서 넘긴다 —
 * 생 SQL 정규식의 역슬래시는 Neon 드라이버를 지나며 먹힌다(\s 가 s 가 된다).
 * DB unique 제약은 걸지 않았다: 옛 DB 를 덮어쓸 때 이미 겹친 이름이 있으면 복원이 통째로 실패한다. 가입 경로가 막는다.
 */
export function nicknameKey(name: string): string {
  return name.trim().toLowerCase().split(" ").join("");
}

export async function isDisplayNameTaken(name: string): Promise<boolean> {
  const key = nicknameKey(name);
  if (!key) return false;
  const row = await getDb().query.users.findFirst({ columns: { id: true }, where: eq(sql`lower(replace(trim(${users.displayName}), ' ', ''))`, key) });
  return Boolean(row);
}

export class DisplayNameTakenError extends Error {
  constructor() {
    super(AUTH_MESSAGES.displayNameTaken);
    this.name = "DisplayNameTakenError";
  }
}

/** 회원가입. 이메일 중복이면 EmailTakenError, 닉네임 중복이면 DisplayNameTakenError (unique 제약도 동시에 걸러 경합 상황 방어) */
export async function createUser(input: { email: string; password: string; displayName: string }): Promise<UserRow> {
  const email = normalizeEmail(input.email);
  if (await findUserByEmail(email)) throw new EmailTakenError();
  if (await isDisplayNameTaken(input.displayName)) throw new DisplayNameTakenError();
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
 * 가입 동의 기록(기획서 v2.0 S-27). 필수 둘(이용약관, 개인정보)은 늘, 가격 알림 이메일은 고른 사람만 한 행씩 적는다.
 * 계정 행과 따로 적는다 — neon-http 는 묶음 트랜잭션을 못 열어 "계정은 있는데 기록은 실패" 가 날 수 있다.
 * 그때 가입 자체를 실패로 돌리면 사람은 "실패" 를 보는데 계정은 이미 있어 다시 가입하면 "이미 가입된 이메일" 을 만난다.
 * 그래서 호출부(signUpAction)는 실패를 로그로만 남긴다. 필수 동의는 가입 폼이 막지 않으면 계정이 생길 수 없어서
 * 기록이 빠져도 "동의 없이 가입" 은 없다 — 빠지는 것은 동의 시각과 선택 동의 하나다.
 */
export async function recordSignUpConsents(userId: string, opts: { alertEmail: boolean }): Promise<void> {
  const kinds: ConsentKind[] = ["terms", "privacy", ...(opts.alertEmail ? (["alert_email"] as const) : [])];
  await getDb()
    .insert(userConsents)
    // 약관, 개인정보는 동의한 문서의 개정일을 같이 남긴다. 알림 이메일은 문서가 없어 null 이다
    .values(kinds.map((kind) => ({ userId, kind, documentVersion: kind === "alert_email" ? null : REVISED_AT, ...createdBy("user", userId) })))
    .onConflictDoNothing();
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
/** 프로필 사진 바꾸기(null = 기본 그림). 예전 파일은 지우지 않는다 — 아직 다른 화면 캐시가 그 주소를 들고 있을 수 있다 */
export async function setAvatar(userId: string, url: string | null): Promise<void> {
  await getDb().update(users).set({ avatarUrl: url, updatedSource: "user", updatedBy: userId, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** 찜 할인 알림 켜고 끄기(sync/dispatch-wish-alerts 가 읽는다). 끈 시각을 남긴다 — 스키마 wishSaleAlertsOffAt 주석 */
export async function setWishSaleAlerts(userId: string, on: boolean): Promise<void> {
  await getDb()
    .update(users)
    .set({ wishSaleAlertsOffAt: on ? null : sql`now()`, updatedSource: "user", updatedBy: userId, updatedAt: sql`now()` })
    .where(eq(users.id, userId));
  // 화면은 세션 사본(Redis)의 사용자 행을 읽는다. 안 지우면 다시 열었을 때 바꾸기 전 값이 선다(2026-10-30 실측). 사본만 지우고 로그인은 남는다
  await dropCachedSessionsOfUser(userId);
}

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
