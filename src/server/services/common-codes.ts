// 공통코드 읽기, 쓰기(schema-system). 공통코드관리 화면이 쓰고, 알림 발송(services/notify)이 받는 곳과 분류를 읽는다.
//
// 저장은 그룹 하나 단위로 한 번에 보낸다(db.batch) — 그룹 칸만 바뀌고 코드 줄은 실패하면 화면과 DB 가 어긋난다.
// 실제로 달라진 줄만 쓴다. 화면은 그룹의 코드를 통째로 보내지만, 안 바뀐 줄까지 쓰면 수정자, 수정일시가 전부 이번 저장으로 덮여
// "누가 이 코드를 바꿨나" 에 답하지 못한다(table-audit-columns).
// 화면 이름표용 코드북(getCodeBook)은 캐시한다(태그 CODES_TAG) — 모든 화면이 읽으므로 요청마다 DB 를 가면 안 된다.
// 저장 액션이 태그를 밀어 바로 반영된다. 관리자 화면 목록(listCodeGroups)은 캐시하지 않는다(고친 직후 그대로 보여야 한다).
//
// 등록 그룹(lib/codes/registry): 코드 기본값이 코드에 있고 코드값이 잠긴 그룹. DB 에 줄이 없어도 목록에 기본값으로 서고,
// 처음 저장할 때 DB 에 생긴다. 기본값과 같은 코드 줄은 쓰지 않는다 — DB 에는 운영자가 고친 것만 남는다.
import "server-only";
import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { commonCodeGroups, commonCodes } from "@/server/db/schema";
import { createdBy, updatedBy } from "@/server/db/audit";
import type { CommonCodeGroupInput, CommonCodeInput } from "@/lib/codes/schemas";
import { buildCodeBook, defaultEntries, type CodeBook } from "@/lib/codes/book";
import { CODE_REGISTRY, isRegistryGroup } from "@/lib/codes/registry";

/** 코드북 캐시 태그. 공통코드 저장 액션이 민다 */
export const CODES_TAG = "common-codes";
/** 캐시 수명(초). 저장이 태그를 밀어 바로 바뀌므로 이 값은 태그가 빠졌을 때의 안전판이다(사이트 설정과 같은 값) */
const CODES_REVALIDATE_SECONDS = 3600;

async function readOverrides() {
  const rows = await getDb()
    .select({ groupCode: commonCodes.groupCode, groupActive: commonCodeGroups.active, code: commonCodes.code, name: commonCodes.name, sortOrder: commonCodes.sortOrder, active: commonCodes.active })
    .from(commonCodes)
    .innerJoin(commonCodeGroups, eq(commonCodeGroups.groupCode, commonCodes.groupCode));
  return rows;
}

const readOverridesCached = unstable_cache(readOverrides, ["common-code-overrides"], { tags: [CODES_TAG], revalidate: CODES_REVALIDATE_SECONDS });

/** 화면 이름표용 코드북. 읽지 못하면 코드 기본값으로 선다 — 공통코드 표 때문에 화면이 깨지면 안 된다 */
export async function getCodeBook(): Promise<CodeBook> {
  try {
    return buildCodeBook(await readOverridesCached());
  } catch (e) {
    console.warn(`[codes] 코드북 읽기 실패, 기본값: ${String(e)}`);
    return buildCodeBook([]);
  }
}

export interface CommonCodeDto {
  code: string;
  name: string;
  attr1: string | null;
  attr2: string | null;
  sortOrder: number;
  active: boolean;
  memo: string | null;
  updatedAt: string | null;
}

export interface CommonCodeGroupDto {
  groupCode: string;
  name: string;
  description: string | null;
  attr1Label: string | null;
  attr2Label: string | null;
  sortOrder: number;
  active: boolean;
  updatedAt: string | null;
  /** 등록 그룹(코드값이 코드에 잠김). 화면이 코드 추가, 코드값 입력을 막는다 */
  locked: boolean;
  /** DB 에 아직 줄이 없는 등록 그룹(기본값으로 서 있음) */
  stored: boolean;
  codes: CommonCodeDto[];
}

/** 공통코드관리 화면 전체. 그룹 수십, 코드 수백이라 한 번에 읽는다 */
export async function listCodeGroups(): Promise<CommonCodeGroupDto[]> {
  const db = getDb();
  const [groups, codes] = await db.batch([
    db.select().from(commonCodeGroups).orderBy(asc(commonCodeGroups.sortOrder), asc(commonCodeGroups.groupCode)),
    db.select().from(commonCodes).orderBy(asc(commonCodes.sortOrder), asc(commonCodes.code)),
  ]);
  const byGroup = new Map<string, CommonCodeDto[]>();
  for (const c of codes) {
    const list = byGroup.get(c.groupCode) ?? [];
    list.push({ code: c.code, name: c.name, attr1: c.attr1, attr2: c.attr2, sortOrder: c.sortOrder, active: c.active, memo: c.memo, updatedAt: c.updatedAt.toISOString() });
    byGroup.set(c.groupCode, list);
  }
  const stored: CommonCodeGroupDto[] = groups.map((g) => ({
    groupCode: g.groupCode,
    name: g.name,
    description: g.description,
    attr1Label: g.attr1Label,
    attr2Label: g.attr2Label,
    sortOrder: g.sortOrder,
    active: g.active,
    updatedAt: g.updatedAt.toISOString(),
    locked: isRegistryGroup(g.groupCode),
    stored: true,
    codes: isRegistryGroup(g.groupCode) ? withDefaults(g.groupCode, byGroup.get(g.groupCode) ?? []) : (byGroup.get(g.groupCode) ?? []),
  }));
  // 등록 그룹 중 DB 에 아직 없는 것 — 기본값으로 세운다. 정렬은 DB 그룹 뒤
  const last = stored.reduce((n, g) => Math.max(n, g.sortOrder), 0);
  const virtual = (Object.keys(CODE_REGISTRY) as Array<keyof typeof CODE_REGISTRY>)
    .filter((k) => !stored.some((g) => g.groupCode === k))
    .map((k, i): CommonCodeGroupDto => ({
      groupCode: k,
      name: CODE_REGISTRY[k].name,
      description: CODE_REGISTRY[k].description,
      attr1Label: null,
      attr2Label: null,
      sortOrder: last + (i + 1) * 10,
      active: true,
      updatedAt: null,
      locked: true,
      stored: false,
      codes: withDefaults(k, []),
    }));
  return [...stored, ...virtual];
}

/** 등록 그룹의 코드 = 기본값 줄에 DB 줄을 덮은 것(기본값에 없는 DB 줄은 버린다 — enum 이 받지 못한다) */
function withDefaults(group: keyof typeof CODE_REGISTRY, saved: CommonCodeDto[]): CommonCodeDto[] {
  return defaultEntries(group)
    .map((d) => saved.find((c) => c.code === d.code) ?? { code: d.code, name: d.name, attr1: null, attr2: null, sortOrder: d.sortOrder, active: true, memo: null, updatedAt: null })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** 고르기 칸에 쓸 코드 목록. 그룹이 미사용이면 비어 있다 */
export async function getActiveCodes(groupCode: string): Promise<CommonCodeDto[]> {
  const rows = await getDb()
    .select({ code: commonCodes, groupActive: commonCodeGroups.active })
    .from(commonCodes)
    .innerJoin(commonCodeGroups, eq(commonCodeGroups.groupCode, commonCodes.groupCode))
    .where(eq(commonCodes.groupCode, groupCode))
    .orderBy(asc(commonCodes.sortOrder), asc(commonCodes.code));
  return rows
    .filter((r) => r.groupActive && r.code.active)
    .map(({ code: c }) => ({ code: c.code, name: c.name, attr1: c.attr1, attr2: c.attr2, sortOrder: c.sortOrder, active: c.active, memo: c.memo, updatedAt: c.updatedAt.toISOString() }));
}

export type SaveCodeGroupResult = { ok: true } | { ok: false; reason: "group_exists" | "not_found" };

const sameCode = (a: CommonCodeInput, b: typeof commonCodes.$inferSelect) =>
  a.name === b.name && a.attr1 === b.attr1 && a.attr2 === b.attr2 && a.sortOrder === b.sortOrder && a.active === b.active && a.memo === b.memo;

/**
 * 그룹 하나 저장. isNew 면 새 그룹이다 — 같은 코드가 이미 있으면 덮지 않고 알린다(남의 그룹을 모르고 덮어쓰지 않게).
 * 코드는 지우지 않는다. 화면에서 빠진 코드가 있어도 그대로 둔다(화면은 코드를 빼는 길이 없고, 끄는 것은 active 다).
 */
export async function saveCodeGroup(adminUserId: string, input: CommonCodeGroupInput, isNew: boolean): Promise<SaveCodeGroupResult> {
  const db = getDb();
  const [existing] = await db.select().from(commonCodeGroups).where(eq(commonCodeGroups.groupCode, input.groupCode)).limit(1);
  const locked = isRegistryGroup(input.groupCode);
  if (isNew && existing) return { ok: false, reason: "group_exists" };
  // 등록 그룹은 처음 저장할 때 DB 에 생긴다(그전에는 기본값으로 서 있었다)
  if (!isNew && !existing && !locked) return { ok: false, reason: "not_found" };
  const oldCodes = isNew ? [] : await db.select().from(commonCodes).where(eq(commonCodes.groupCode, input.groupCode));
  const oldByCode = new Map(oldCodes.map((c) => [c.code, c]));

  const group = { name: input.name, description: input.description, attr1Label: input.attr1Label, attr2Label: input.attr2Label, sortOrder: input.sortOrder, active: input.active };
  const groupChanged =
    !existing ||
    existing.name !== group.name ||
    existing.description !== group.description ||
    existing.attr1Label !== group.attr1Label ||
    existing.attr2Label !== group.attr2Label ||
    existing.sortOrder !== group.sortOrder ||
    existing.active !== group.active;

  const writes = [];
  if (!existing) writes.push(db.insert(commonCodeGroups).values({ groupCode: input.groupCode, ...group, ...createdBy("admin", adminUserId) }));
  else if (groupChanged) writes.push(db.update(commonCodeGroups).set({ ...group, ...updatedBy("admin", adminUserId) }).where(eq(commonCodeGroups.groupCode, input.groupCode)));

  const defaults = locked ? new Map(defaultEntries(input.groupCode as keyof typeof CODE_REGISTRY).map((d) => [d.code, d])) : null;
  for (const c of input.codes) {
    const old = oldByCode.get(c.code);
    if (old && sameCode(c, old)) continue;
    if (defaults) {
      const d = defaults.get(c.code);
      // 잠긴 그룹에 없는 코드는 받지 않는다. DB 에 없고 기본값과 같은 줄은 쓰지 않는다
      if (!d) continue;
      if (!old && c.name === d.name && c.sortOrder === d.sortOrder && c.active && !c.memo && !c.attr1 && !c.attr2) continue;
    }
    const row = { name: c.name, attr1: c.attr1, attr2: c.attr2, sortOrder: c.sortOrder, active: c.active, memo: c.memo };
    writes.push(
      db
        .insert(commonCodes)
        .values({ groupCode: input.groupCode, code: c.code, ...row, ...createdBy("admin", adminUserId) })
        .onConflictDoUpdate({ target: [commonCodes.groupCode, commonCodes.code], set: { ...row, ...updatedBy("admin", adminUserId) } }),
    );
  }
  const [first, ...rest] = writes;
  if (first) await db.batch([first, ...rest]);
  return { ok: true };
}
