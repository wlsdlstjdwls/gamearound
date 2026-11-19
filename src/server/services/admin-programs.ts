// 관리자 프로그램 노출, 사용 여부 읽기, 쓰기(schema-admin 의 adminPrograms 주석).
//
// 레이아웃이 관리자 화면마다 읽으므로 캐시한다(태그 ADMIN_PROGRAMS_TAG). 저장 액션이 태그를 밀어 바로 반영된다.
// 레이아웃은 이 값을 기다린다(배지, 즐겨찾기처럼 약속째로 넘기지 않는다) — 메뉴가 먼저 섰다가 칸이 빠지거나,
// 막힌 화면이 한 번 그려졌다 안내로 바뀌면 고장처럼 보인다. 캐시가 맞으면 왕복이 없다.
// 프로그램관리 화면의 목록(listProgramSettingRows)은 캐시하지 않는다 — 고친 직후 그대로 보여야 한다.
//
// 쓰기는 실제로 달라진 줄만 쓴다(table-audit-columns: 안 바뀐 줄까지 쓰면 수정자, 수정일시가 이번 저장으로 덮인다).
import "server-only";
import { unstable_cache } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { adminPrograms, users } from "@/server/db/schema";
import { createdBy, updatedBy } from "@/server/db/audit";
import { DTO_CACHE_VERSION } from "@/lib/cache";
import type { ProgramSettingInput, ProgramSettings } from "@/lib/admin/programs";

/** 프로그램 설정 캐시 태그. 프로그램관리 저장 액션이 민다 */
export const ADMIN_PROGRAMS_TAG = "admin-programs";
/** 캐시 수명(초). 저장이 태그를 밀어 바로 바뀌므로 이 값은 태그가 빠졌을 때의 안전판이다(공통코드와 같은 값) */
const ADMIN_PROGRAMS_REVALIDATE_SECONDS = 3600;

async function readSettings(): Promise<ProgramSettings> {
  const rows = await getDb().select({ href: adminPrograms.href, visible: adminPrograms.visible, active: adminPrograms.active }).from(adminPrograms);
  return Object.fromEntries(rows.map((r) => [r.href, { visible: r.visible, active: r.active }]));
}

const readSettingsCached = unstable_cache(readSettings, [DTO_CACHE_VERSION, "admin-programs"], { tags: [ADMIN_PROGRAMS_TAG], revalidate: ADMIN_PROGRAMS_REVALIDATE_SECONDS });

/** 메뉴, 진입 막기용. 읽지 못하면 전부 켜짐으로 선다 — 이 표 때문에 관리자 화면이 깨지면 끈 것을 다시 켤 길도 없다 */
export async function getProgramSettings(): Promise<ProgramSettings> {
  try {
    return await readSettingsCached();
  } catch (e) {
    console.warn(`[admin-programs] 설정 읽기 실패, 전부 켜짐: ${String(e)}`);
    return {};
  }
}

export interface ProgramSettingRowDto {
  href: string;
  visible: boolean;
  active: boolean;
  /** 마지막으로 고친 관리자 이름. 고친 적 없으면 null */
  updatedByName: string | null;
  updatedAt: string | null;
}

/** 프로그램관리 화면 목록. DB 에 있는 줄만 돌려준다 — 메뉴 칸 목록과 합치는 일은 화면이 한다(목록이 클라이언트 파일에 있다) */
export async function listProgramSettingRows(): Promise<ProgramSettingRowDto[]> {
  const rows = await getDb()
    .select({ href: adminPrograms.href, visible: adminPrograms.visible, active: adminPrograms.active, updatedAt: adminPrograms.updatedAt, name: users.displayName, email: users.email })
    .from(adminPrograms)
    .leftJoin(users, eq(users.id, adminPrograms.updatedBy));
  return rows.map((r) => ({ href: r.href, visible: r.visible, active: r.active, updatedByName: r.name ?? r.email ?? null, updatedAt: r.updatedAt?.toISOString() ?? null }));
}

/** 바뀐 줄만 쓴다. 쓴 줄 수를 돌려준다 */
export async function saveProgramSettings(adminUserId: string, input: ProgramSettingInput[]): Promise<number> {
  if (input.length === 0) return 0;
  const db = getDb();
  const existing = await db
    .select({ href: adminPrograms.href, visible: adminPrograms.visible, active: adminPrograms.active })
    .from(adminPrograms)
    .where(inArray(adminPrograms.href, input.map((r) => r.href)));
  const before = new Map(existing.map((r) => [r.href, r]));
  const changed = input.filter((r) => {
    const old = before.get(r.href);
    // 줄이 없으면 둘 다 켜짐이다 — 켜짐 그대로면 쓸 일이 없다
    return old ? old.visible !== r.visible || old.active !== r.active : !(r.visible && r.active);
  });
  if (changed.length === 0) return 0;
  const writes = changed.map((r) =>
    db
      .insert(adminPrograms)
      .values({ href: r.href, visible: r.visible, active: r.active, ...createdBy("admin", adminUserId) })
      .onConflictDoUpdate({ target: adminPrograms.href, set: { visible: r.visible, active: r.active, ...updatedBy("admin", adminUserId) } }),
  );
  const [first, ...rest] = writes;
  await db.batch([first, ...rest]);
  return changed.length;
}
