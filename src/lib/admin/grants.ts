// 관리자 계정별 프로그램 권한 판정(2026-11-19, 사용자 "사용자별프로그램권한 관리할 수 있는 화면"). 표는 schema-admin 의 adminProgramGrants.
// 메뉴(program-policy), 화면 툴바(screen/head), 페이지, 서버 액션 가드(services/admin-grants), 권한관리 화면이 같이 쓴다. 순수 함수만 둔다.
//
// 권한은 백오피스(SBO) 툴바 단추 다섯과 같은 갈래다: 조회, 입력, 저장, 삭제, 엑셀. 줄이 없으면 전부 막힘이다(사용자 결정).
// 대시보드는 늘 조회할 수 있다 — 막힌 화면의 안내가 돌아갈 자리이고, 막힌 계정이 들어와 설 첫 화면이다.
//
// 권한 표 전체가 null 이면 "판정하지 않음"이다(표를 읽지 못했을 때). 그때 막아 버리면 모든 관리자가 한꺼번에 잠기고
// 권한관리 화면조차 못 연다. 프로그램관리(lib/admin/programs)가 읽기 실패를 켜짐으로 받는 것과 같은 판단이다.
import { z } from "zod";
import { ROUTES } from "@/lib/routes";

export const PROGRAM_PERMS = ["read", "insert", "save", "delete", "excel"] as const;
export type ProgramPerm = (typeof PROGRAM_PERMS)[number];
export type ProgramGrant = Record<ProgramPerm, boolean>;
/** 주소 -> 권한. 줄이 없는 주소는 전부 막힘. null 은 판정하지 않음(머리 주석) */
export type ProgramGrants = Readonly<Record<string, ProgramGrant>> | null;

export const NO_GRANT: ProgramGrant = { read: false, insert: false, save: false, delete: false, excel: false };
export const FULL_GRANT: ProgramGrant = { read: true, insert: true, save: true, delete: true, excel: true };

/** 권한과 상관없이 조회할 수 있는 프로그램 */
export const ALWAYS_READ: readonly string[] = [ROUTES.admin];

/**
 * 자기 자신에게서 뺄 수 없는 권한. 권한관리 화면의 조회, 저장을 스스로 끄면 그 계정은 되돌릴 길이 없고,
 * 관리자가 한 명뿐이면 아무도 권한을 못 고친다. 남의 것은 끌 수 있다
 */
export const SELF_LOCKED: { href: string; perms: readonly ProgramPerm[] } = { href: ROUTES.adminGrants, perms: ["read", "save"] };

export function grantOf(grants: ProgramGrants, href: string): ProgramGrant {
  if (grants === null) return FULL_GRANT;
  const g = grants[href] ?? NO_GRANT;
  return ALWAYS_READ.includes(href) ? { ...g, read: true } : g;
}

export function canProgram(grants: ProgramGrants, href: string, perm: ProgramPerm): boolean {
  return grantOf(grants, href)[perm];
}

/** 주소가 이 메뉴 주소(또는 그 아래)인가. 대시보드만 정확히 일치로 본다(admin-nav-items 의 isActive 와 같은 규칙) */
function under(pathname: string, href: string): boolean {
  return href === ROUTES.admin ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** 이 주소가 속한 프로그램 주소. 가장 긴 메뉴 주소가 이긴다. 메뉴 밖 화면(게임 고치기 등)은 null */
export function programOfPath(pathname: string, hrefs: readonly string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) if (under(pathname, href) && (best === null || href.length > best.length)) best = href;
  return best;
}

/** 조회가 꺼지면 나머지도 끈다 — 열리지 않는 화면의 저장 권한은 뜻이 없고, 남겨 두면 표만 보고 "저장은 된다" 고 잘못 읽는다 */
export function normalizeGrant(g: ProgramGrant): ProgramGrant {
  return g.read ? g : NO_GRANT;
}

const flag = z.boolean();

/** 저장 입력(한 계정의 바뀐 줄들). 화면과 액션이 같은 스키마를 쓴다(AGENTS §2) */
export const grantsInputSchema = z.object({
  userId: z.string().uuid(),
  rows: z
    .array(z.object({ href: z.string().startsWith("/").max(200), read: flag, insert: flag, save: flag, delete: flag, excel: flag }))
    .max(200)
    .refine((rows) => new Set(rows.map((r) => r.href)).size === rows.length, { message: "duplicate" }),
});

export type GrantsInput = z.infer<typeof grantsInputSchema>;
export type GrantRowInput = GrantsInput["rows"][number];

/** 이 저장이 자기 권한관리 조회, 저장을 끄나 */
export function dropsSelfLock(actorId: string, input: GrantsInput): boolean {
  if (input.userId !== actorId) return false;
  const row = input.rows.find((r) => r.href === SELF_LOCKED.href);
  if (!row) return false;
  const g = normalizeGrant(row);
  return SELF_LOCKED.perms.some((p) => !g[p]);
}
