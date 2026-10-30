// 공통코드 읽기, 쓰기(schema-system). 공통코드관리 화면이 쓰고, 알림 발송(services/notify)이 받는 곳과 분류를 읽는다.
//
// 저장은 그룹 하나 단위로 한 번에 보낸다(db.batch) — 그룹 칸만 바뀌고 코드 줄은 실패하면 화면과 DB 가 어긋난다.
// 실제로 달라진 줄만 쓴다. 화면은 그룹의 코드를 통째로 보내지만, 안 바뀐 줄까지 쓰면 수정자, 수정일시가 전부 이번 저장으로 덮여
// "누가 이 코드를 바꿨나" 에 답하지 못한다(table-audit-columns).
// 캐시하지 않는다. 읽는 곳이 관리자 화면과 알림 발송(응답 뒤 after)뿐이라 요청마다 왕복 한 번이면 된다.
import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { commonCodeGroups, commonCodes } from "@/server/db/schema";
import { createdBy, updatedBy } from "@/server/db/audit";
import type { CommonCodeGroupInput, CommonCodeInput } from "@/lib/codes/schemas";

export interface CommonCodeDto {
  code: string;
  name: string;
  attr1: string | null;
  attr2: string | null;
  sortOrder: number;
  active: boolean;
  memo: string | null;
  updatedAt: string;
}

export interface CommonCodeGroupDto {
  groupCode: string;
  name: string;
  description: string | null;
  attr1Label: string | null;
  attr2Label: string | null;
  sortOrder: number;
  active: boolean;
  updatedAt: string;
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
  return groups.map((g) => ({
    groupCode: g.groupCode,
    name: g.name,
    description: g.description,
    attr1Label: g.attr1Label,
    attr2Label: g.attr2Label,
    sortOrder: g.sortOrder,
    active: g.active,
    updatedAt: g.updatedAt.toISOString(),
    codes: byGroup.get(g.groupCode) ?? [],
  }));
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
  if (isNew && existing) return { ok: false, reason: "group_exists" };
  if (!isNew && !existing) return { ok: false, reason: "not_found" };
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

  for (const c of input.codes) {
    const old = oldByCode.get(c.code);
    if (old && sameCode(c, old)) continue;
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
