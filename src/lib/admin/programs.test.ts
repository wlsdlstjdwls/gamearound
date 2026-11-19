import { describe, expect, it } from "vitest";
import { blockedProgramOf, isProgramShown, programSettingsInputSchema, settingOf } from "@/lib/admin/programs";
import { ROUTES } from "@/lib/routes";

const HREFS = [ROUTES.admin, ROUTES.adminSync, ROUTES.adminSyncLogs, ROUTES.adminTasks, ROUTES.adminPrograms];

describe("프로그램 노출, 사용 판정", () => {
  it("줄이 없으면 둘 다 켜짐", () => {
    expect(settingOf({}, ROUTES.adminSync)).toEqual({ visible: true, active: true });
    expect(isProgramShown({}, ROUTES.adminSync)).toBe(true);
  });

  it("노출 안 함이나 사용 안 함이면 메뉴에서 뺀다", () => {
    expect(isProgramShown({ [ROUTES.adminSync]: { visible: false, active: true } }, ROUTES.adminSync)).toBe(false);
    expect(isProgramShown({ [ROUTES.adminSync]: { visible: true, active: false } }, ROUTES.adminSync)).toBe(false);
  });

  it("대시보드와 프로그램관리는 DB 값이 꺼져 있어도 켜짐으로 읽는다", () => {
    const off = { visible: false, active: false };
    expect(isProgramShown({ [ROUTES.admin]: off, [ROUTES.adminPrograms]: off }, ROUTES.admin)).toBe(true);
    expect(blockedProgramOf(ROUTES.adminPrograms, HREFS, { [ROUTES.adminPrograms]: off })).toBeNull();
  });

  it("사용 안 함인 프로그램과 그 하위 주소를 막는다", () => {
    const s = { [ROUTES.adminTasks]: { visible: true, active: false } };
    expect(blockedProgramOf(ROUTES.adminTasks, HREFS, s)).toBe(ROUTES.adminTasks);
    expect(blockedProgramOf(`${ROUTES.adminTasks}/archive`, HREFS, s)).toBe(ROUTES.adminTasks);
    expect(blockedProgramOf(ROUTES.admin, HREFS, s)).toBeNull();
  });

  it("노출만 끈 프로그램은 주소로 열린다", () => {
    expect(blockedProgramOf(ROUTES.adminTasks, HREFS, { [ROUTES.adminTasks]: { visible: false, active: true } })).toBeNull();
  });

  it("마디 경계로 자른다 — 수집현황을 꺼도 수집이력조회는 열린다", () => {
    const s = { [ROUTES.adminSync]: { visible: true, active: false } };
    expect(blockedProgramOf(ROUTES.adminSyncLogs, HREFS, s)).toBeNull();
  });

  it("저장 입력은 끌 수 없는 프로그램과 겹친 주소를 거른다", () => {
    expect(programSettingsInputSchema.safeParse([{ href: ROUTES.adminSync, visible: false, active: true }]).success).toBe(true);
    expect(programSettingsInputSchema.safeParse([{ href: ROUTES.adminPrograms, visible: false, active: true }]).success).toBe(false);
    const row = { href: ROUTES.adminSync, visible: true, active: true };
    expect(programSettingsInputSchema.safeParse([row, row]).success).toBe(false);
  });
});
