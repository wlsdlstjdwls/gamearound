// 공통코드관리 화면 상태 모양과 변환(2026-10-30). 화면(index)과 폼(forms)이 같이 쓴다.
// 줄 열쇠(key)를 코드값과 따로 둔다(lib/admin/row-key 머리 주석). 저장하면 열쇠가 서버 값(코드값)으로 바뀐다.
import type { CommonCodeGroupDto } from "@/server/services/common-codes";
import type { CommonCodeGroupInput, CommonCodeInput } from "@/lib/codes/schemas";
import { commonCodeGroupSchema } from "@/lib/codes/schemas";
import { CODES_MESSAGES as M } from "@/lib/admin/messages";
import { newRowKey } from "@/lib/admin/row-key";
import { fieldErrors, VALIDATION_MESSAGES, type FieldErrors } from "@/lib/admin/validation";

/** 새 줄 정렬순서의 간격. 10 씩 띄워 두면 사이에 끼워 넣을 자리가 남는다 */
export const SORT_STEP = 10;

export type CodeDraft = CommonCodeInput & { key: string; isNew: boolean };
export type GroupDraft = Omit<CommonCodeGroupInput, "codes"> & { key: string; isNew: boolean; codes: CodeDraft[] };

export function draftsOf(groups: CommonCodeGroupDto[]): GroupDraft[] {
  return groups.map((g) => ({
    key: g.groupCode,
    isNew: false,
    groupCode: g.groupCode,
    name: g.name,
    description: g.description,
    attr1Label: g.attr1Label,
    attr2Label: g.attr2Label,
    sortOrder: g.sortOrder,
    active: g.active,
    codes: g.codes.map((c) => ({ key: c.code, isNew: false, code: c.code, name: c.name, attr1: c.attr1, attr2: c.attr2, sortOrder: c.sortOrder, active: c.active, memo: c.memo })),
  }));
}

export function inputOf(g: GroupDraft): CommonCodeGroupInput {
  return {
    groupCode: g.groupCode,
    name: g.name,
    description: g.description,
    attr1Label: g.attr1Label,
    attr2Label: g.attr2Label,
    sortOrder: g.sortOrder,
    active: g.active,
    codes: g.codes.map((c) => ({ code: c.code, name: c.name, attr1: c.attr1, attr2: c.attr2, sortOrder: c.sortOrder, active: c.active, memo: c.memo })),
  };
}

export function newGroup(sortOrder: number): GroupDraft {
  return { key: newRowKey("group"), isNew: true, groupCode: "", name: M.newGroupName, description: null, attr1Label: null, attr2Label: null, sortOrder, active: true, codes: [] };
}

export function newCode(g: GroupDraft): CodeDraft {
  const last = g.codes.reduce((n, c) => Math.max(n, c.sortOrder), 0);
  return { key: newRowKey("code"), isNew: true, code: "", name: M.newCodeName, attr1: null, attr2: null, sortOrder: last + SORT_STEP, active: true, memo: null };
}

/**
 * 그룹 하나의 칸별 오류. 스키마 공통 문구(형식이 맞지 않아요) 대신 이 칸의 규칙을 말한다 — 무엇이 틀렸는지 알아야 고친다.
 * 경로는 열쇠 기반이 아니라 순번(codes.3.code)이다. 화면은 순번을 열쇠로 되짚는다(codeErrorPath)
 */
export function groupErrors(g: GroupDraft, taken: ReadonlySet<string>): FieldErrors {
  const errs = fieldErrors(commonCodeGroupSchema.safeParse(inputOf(g)));
  for (const [path, msg] of Object.entries(errs)) {
    if (msg === "duplicate") errs[path] = M.duplicate;
    else if (msg === VALIDATION_MESSAGES.format) errs[path] = path === "groupCode" ? M.groupPattern : M.codePattern;
  }
  // 새 그룹의 코드가 이미 있는 그룹과 겹치면 저장이 거절된다 — 누르기 전에 칸에서 말한다
  if (g.isNew && !errs.groupCode && taken.has(g.groupCode.trim())) errs.groupCode = M.groupExists;
  return errs;
}

export const codeErrorPath = (g: GroupDraft, c: CodeDraft, field: string) => `codes.${g.codes.indexOf(c)}.${field}`;

/** 저장된 값과 다른가. 열쇠(key)는 견주지 않는다 */
export const sameGroup = (a: GroupDraft | undefined, b: GroupDraft | undefined) => JSON.stringify(a && inputOf(a)) === JSON.stringify(b && inputOf(b));
