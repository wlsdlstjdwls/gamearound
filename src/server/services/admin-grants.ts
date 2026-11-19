// 관리자 계정별 프로그램 권한 읽기, 쓰기, 가드(schema-admin 의 adminProgramGrants 주석, 판정은 lib/admin/grants).
//
// 레이아웃이 관리자 화면마다 제 권한을 읽고, 서버 액션도 매번 읽으므로 계정별로 캐시한다(태그 ADMIN_GRANTS_TAG, 키에 계정 id).
// 저장 액션이 태그를 밀어 바로 반영된다. 권한관리 화면 목록(listGrantRows)은 캐시하지 않는다 — 고친 직후 그대로 보여야 한다.
// 읽기 실패는 null(판정하지 않음)로 받는다 — 표 하나 때문에 관리자 전원이 잠기면 권한을 고칠 화면도 못 연다(lib/admin/grants 머리 주석).
//
// 화면 막기는 세 겹이다: 메뉴에서 빼고(program-policy), 페이지가 requireProgramPage 로 다시 보고, 서버 액션이 requireProgram 으로 본다.
// 툴바 단추를 흐리는 것(screen/head)은 손이 헛누르지 않게 하는 표시일 뿐이고 막는 일은 서버가 한다.
// 메뉴 밖 화면(게임 고치기)과 여러 화면이 같이 쓰는 액션은 관리자 확인(requireAdmin)만 한다 — 어느 프로그램 권한으로 볼지 정할 수 없다.
import "server-only";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/server/db/client";
import { adminProgramGrants, users } from "@/server/db/schema";
import { createdBy, updatedBy } from "@/server/db/audit";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { requireAdmin } from "@/server/services/users";
import { DTO_CACHE_VERSION } from "@/lib/cache";
import { GRANTS_MESSAGES as M } from "@/lib/admin/messages";
import { canProgram, normalizeGrant, type GrantsInput, type ProgramGrant, type ProgramGrants, type ProgramPerm } from "@/lib/admin/grants";
import { ROUTES } from "@/lib/routes";

/** 권한 캐시 태그. 권한관리 저장 액션이 민다 */
export const ADMIN_GRANTS_TAG = "admin-grants";
/** 캐시 수명(초). 저장이 태그를 밀어 바로 바뀌므로 태그가 빠졌을 때의 안전판이다(프로그램관리와 같은 값) */
const ADMIN_GRANTS_REVALIDATE_SECONDS = 3600;

const GRANT_COLS = {
  href: adminProgramGrants.href,
  read: adminProgramGrants.canRead,
  insert: adminProgramGrants.canInsert,
  save: adminProgramGrants.canSave,
  delete: adminProgramGrants.canDelete,
  excel: adminProgramGrants.canExcel,
};

const pickGrant = (r: ProgramGrant): ProgramGrant => ({ read: r.read, insert: r.insert, save: r.save, delete: r.delete, excel: r.excel });

async function readGrants(userId: string): Promise<Record<string, ProgramGrant>> {
  const rows = await getDb().select(GRANT_COLS).from(adminProgramGrants).where(eq(adminProgramGrants.userId, userId));
  return Object.fromEntries(rows.map((r) => [r.href, pickGrant(r)]));
}

const readGrantsCached = unstable_cache(readGrants, [DTO_CACHE_VERSION, "admin-grants"], { tags: [ADMIN_GRANTS_TAG], revalidate: ADMIN_GRANTS_REVALIDATE_SECONDS });

/** 메뉴, 툴바, 가드용. 읽지 못하면 null(판정하지 않음) */
export async function getGrantsOf(userId: string): Promise<ProgramGrants> {
  try {
    return await readGrantsCached(userId);
  } catch (e) {
    console.warn(`[admin-grants] 권한 읽기 실패, 판정하지 않음: ${String(e)}`);
    return null;
  }
}

/** 서버 액션 가드. 관리자이고 그 프로그램의 그 권한이 있어야 한다. 없으면 사유를 담아 던진다(액션의 actionError 가 상태줄로 옮긴다) */
export async function requireProgram(href: string, perm: ProgramPerm) {
  const admin = await requireAdmin();
  if (!canProgram(await getGrantsOf(admin.id), href, perm)) throw new Error(M.denied(M.permLabels[perm]));
  return admin;
}

/** 페이지 가드. 조회 권한이 없으면 금지 화면으로 보낸다 — 메뉴와 화면 안내(ProgramGate)가 먼저 막으니 주소를 직접 친 경우만 여기까지 온다 */
export async function requireProgramPage(href: string) {
  const admin = await requireRoleOrForbid("admin");
  if (!canProgram(await getGrantsOf(admin.id), href, "read")) redirect(ROUTES.forbidden);
  return admin;
}

export interface AdminAccountDto {
  id: string;
  name: string;
  email: string;
  /** 조회 권한이 켜진 프로그램 수 */
  readCount: number;
}

/** 권한관리 왼쪽 목록. 관리자 계정만, 이름 순 */
export async function listAdminAccounts(): Promise<AdminAccountDto[]> {
  const rows = await getDb()
    .select({
      id: users.id,
      name: users.displayName,
      email: users.email,
      readCount: sql<number>`(select count(*)::int from ${adminProgramGrants} g where g.user_id = ${users.id} and g.can_read)`,
    })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.displayName), asc(users.email));
  return rows.map((r) => ({ id: r.id, name: r.name ?? r.email, email: r.email, readCount: Number(r.readCount) }));
}

export interface GrantRowDto extends ProgramGrant {
  href: string;
  updatedByName: string | null;
  updatedAt: string | null;
}

/**
 * 관리자 계정마다 권한 줄(계정 id -> 줄). DB 에 있는 줄만 돌려준다 — 메뉴 칸 목록과 합치는 일은 화면이 한다(목록이 클라이언트 파일에 있다).
 * 관리자 계정은 몇 안 되고 계정마다 줄은 프로그램 수만큼이라 한 번에 읽는다 — 왼쪽에서 계정을 바꿀 때마다 서버를 다녀오지 않는다
 */
export async function listGrantRowsByUser(): Promise<Record<string, GrantRowDto[]>> {
  const editor = alias(users, "editor");
  const rows = await getDb()
    .select({ ...GRANT_COLS, userId: adminProgramGrants.userId, updatedAt: adminProgramGrants.updatedAt, name: editor.displayName, email: editor.email })
    .from(adminProgramGrants)
    .innerJoin(users, and(eq(users.id, adminProgramGrants.userId), eq(users.role, "admin")))
    .leftJoin(editor, eq(editor.id, adminProgramGrants.updatedBy));
  const out: Record<string, GrantRowDto[]> = {};
  for (const r of rows) (out[r.userId] ??= []).push({ ...pickGrant(r), href: r.href, updatedByName: r.name ?? r.email ?? null, updatedAt: r.updatedAt?.toISOString() ?? null });
  return out;
}

const same = (a: ProgramGrant, b: ProgramGrant) => a.read === b.read && a.insert === b.insert && a.save === b.save && a.delete === b.delete && a.excel === b.excel;
const isEmpty = (g: ProgramGrant) => !(g.read || g.insert || g.save || g.delete || g.excel);

/** 바뀐 줄만 쓴다(table-audit-columns). 쓴 줄 수를 돌려준다. 대상이 관리자가 아니면 아무것도 쓰지 않는다 */
export async function saveGrants(actorId: string, input: GrantsInput): Promise<number> {
  if (input.rows.length === 0) return 0;
  const db = getDb();
  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId));
  if (target?.role !== "admin") throw new Error(M.notAdmin);
  const existing = await db
    .select(GRANT_COLS)
    .from(adminProgramGrants)
    .where(and(eq(adminProgramGrants.userId, input.userId), inArray(adminProgramGrants.href, input.rows.map((r) => r.href))));
  const before = new Map(existing.map((r) => [r.href, pickGrant(r)]));
  const changed = input.rows
    .map((r) => ({ href: r.href, g: normalizeGrant(pickGrant(r)) }))
    .filter(({ href, g }) => {
      const old = before.get(href);
      // 줄이 없으면 전부 막힘이다 — 막힘 그대로면 쓸 일이 없다
      return old ? !same(old, g) : !isEmpty(g);
    });
  if (changed.length === 0) return 0;
  const writes = changed.map(({ href, g }) => {
    const set = { canRead: g.read, canInsert: g.insert, canSave: g.save, canDelete: g.delete, canExcel: g.excel };
    return db
      .insert(adminProgramGrants)
      .values({ userId: input.userId, href, ...set, ...createdBy("admin", actorId) })
      .onConflictDoUpdate({ target: [adminProgramGrants.userId, adminProgramGrants.href], set: { ...set, ...updatedBy("admin", actorId) } });
  });
  const [first, ...rest] = writes;
  await db.batch([first, ...rest]);
  return changed.length;
}
