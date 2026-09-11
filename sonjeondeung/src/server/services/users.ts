// users 서비스 — Clerk 미러 (§6). Server Action/Route Handler에서 현재 사용자 행을 얻을 때 사용.
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { users, type Role } from "@/server/db/schema";

export type UserRow = typeof users.$inferSelect;

const ROLES: Role[] = ["user", "game_company", "seller", "admin"];
export function toRole(v: unknown): Role {
  return typeof v === "string" && (ROLES as string[]).includes(v) ? (v as Role) : "user";
}

/** clerkId 기준 upsert. 웹훅(user.created/updated)과 첫 요청 양쪽에서 호출 가능 */
export async function upsertUserFromClerk(input: { clerkId: string; displayName?: string | null; role?: Role }): Promise<UserRow> {
  const db = getDb();
  const [row] = await db
    .insert(users)
    .values({ clerkId: input.clerkId, displayName: input.displayName ?? null, role: input.role ?? "user" })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        displayName: input.displayName ?? null,
        ...(input.role ? { role: input.role } : {}),
      },
    })
    .returning();
  return row;
}

export async function deleteUserByClerkId(clerkId: string): Promise<void> {
  await getDb().delete(users).where(eq(users.clerkId, clerkId));
}

/** 로그인 사용자의 users 행. 없으면 Clerk 정보로 생성. 비로그인 시 null */
export async function getCurrentUser(): Promise<UserRow | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;
  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
  if (existing) return existing;
  const cu = await currentUser();
  const meta = (sessionClaims?.publicMetadata ?? cu?.publicMetadata ?? {}) as Record<string, unknown>;
  return upsertUserFromClerk({
    clerkId: userId,
    displayName: cu?.username ?? cu?.firstName ?? null,
    role: toRole(meta.role),
  });
}

/** 로그인 필수. 아니면 throw (Server Action 내부 재검증 §6) */
export async function requireUser(): Promise<UserRow> {
  const u = await getCurrentUser();
  if (!u) throw new Error("로그인이 필요합니다");
  return u;
}

export async function requireRole(...roles: Role[]): Promise<UserRow> {
  const u = await requireUser();
  if (!roles.includes(u.role)) throw new Error("권한이 없습니다");
  return u;
}

export const requireAdmin = () => requireRole("admin");
