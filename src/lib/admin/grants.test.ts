import { describe, expect, it } from "vitest";
import { canProgram, dropsSelfLock, FULL_GRANT, grantOf, NO_GRANT, normalizeGrant, programOfPath } from "@/lib/admin/grants";
import { ROUTES } from "@/lib/routes";

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("프로그램 권한 판정", () => {
  it("줄이 없으면 전부 막힘", () => {
    expect(grantOf({}, ROUTES.adminSync)).toEqual(NO_GRANT);
    expect(canProgram({}, ROUTES.adminSync, "read")).toBe(false);
  });

  it("대시보드는 줄이 없어도 조회할 수 있다", () => {
    expect(canProgram({}, ROUTES.admin, "read")).toBe(true);
    expect(canProgram({}, ROUTES.admin, "save")).toBe(false);
  });

  it("표를 못 읽었으면(null) 막지 않는다", () => {
    expect(grantOf(null, ROUTES.adminSync)).toEqual(FULL_GRANT);
  });

  it("줄 값대로 판정한다", () => {
    const g = { [ROUTES.adminTasks]: { ...NO_GRANT, read: true, excel: true } };
    expect(canProgram(g, ROUTES.adminTasks, "read")).toBe(true);
    expect(canProgram(g, ROUTES.adminTasks, "excel")).toBe(true);
    expect(canProgram(g, ROUTES.adminTasks, "save")).toBe(false);
  });

  it("조회가 꺼지면 나머지도 끈다", () => {
    expect(normalizeGrant({ ...FULL_GRANT, read: false })).toEqual(NO_GRANT);
    expect(normalizeGrant({ ...NO_GRANT, read: true, save: true })).toEqual({ ...NO_GRANT, read: true, save: true });
  });
});

describe("주소의 프로그램", () => {
  const hrefs = [ROUTES.admin, ROUTES.adminSync, ROUTES.adminSyncLogs, ROUTES.adminTasks];
  it("가장 긴 메뉴 주소가 이긴다, 마디 경계로 자른다", () => {
    expect(programOfPath("/admin/sync-logs", hrefs)).toBe(ROUTES.adminSyncLogs);
    expect(programOfPath("/admin/tasks/archive", hrefs)).toBe(ROUTES.adminTasks);
    expect(programOfPath("/admin", hrefs)).toBe(ROUTES.admin);
  });
  it("메뉴 밖 화면은 null", () => {
    expect(programOfPath("/admin/games/abc", hrefs)).toBeNull();
  });
});

describe("자기 잠금 막기", () => {
  const row = (read: boolean, save: boolean) => ({ href: ROUTES.adminGrants, read, insert: false, save, delete: false, excel: false });
  it("자기 권한관리 조회나 저장을 끄면 막는다", () => {
    expect(dropsSelfLock(ME, { userId: ME, rows: [row(true, false)] })).toBe(true);
    expect(dropsSelfLock(ME, { userId: ME, rows: [row(false, true)] })).toBe(true);
  });
  it("둘 다 켜져 있거나 남의 계정이면 통과", () => {
    expect(dropsSelfLock(ME, { userId: ME, rows: [row(true, true)] })).toBe(false);
    expect(dropsSelfLock(ME, { userId: OTHER, rows: [row(false, false)] })).toBe(false);
  });
});
