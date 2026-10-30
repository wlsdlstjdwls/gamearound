import { describe, expect, it } from "vitest";
import { ADMIN_MOBILE, mobileCan, mobilePolicyOf } from "@/lib/admin/mobile";
import { ROUTES } from "@/lib/routes";

describe("mobilePolicyOf", () => {
  it("대시보드는 정확히 일치할 때만 대시보드 몫이다", () => {
    expect(mobilePolicyOf(ROUTES.admin).access).toBe("full");
    // 표에 없는 하위 주소(게임 고치기)가 대시보드 몫으로 열리면 안 된다
    expect(mobilePolicyOf("/admin/games/abc").access).toBe("off");
  });

  it("하위 주소는 가장 긴 메뉴 주소를 따른다", () => {
    expect(mobilePolicyOf(ROUTES.adminTasksArchive)).toBe(ADMIN_MOBILE[ROUTES.adminTasks]);
    expect(mobilePolicyOf(`${ROUTES.adminIndie}`).access).toBe("full");
  });

  it("마디 경계로 자른다", () => {
    // /admin/sync 정책이 /admin/sync-logs 에 새면 안 된다
    expect(mobilePolicyOf(ROUTES.adminSyncLogs)).toBe(ADMIN_MOBILE[ROUTES.adminSyncLogs]);
  });

  it("관리자 바깥 입점 승인 화면도 표를 읽는다", () => {
    expect(mobilePolicyOf(ROUTES.shopsAdmin).access).toBe("view");
  });
});

describe("mobileCan", () => {
  const full = { access: "full" as const, deny: ["taskDelete" as const] };
  const view = { access: "view" as const, allow: ["approval" as const] };

  it("넓은 기기는 막지 않는다", () => {
    expect(mobileCan(false, { access: "off" }, "edit")).toBe(true);
    expect(mobileCan(false, full, "excel")).toBe(true);
  });

  it("엑셀은 휴대폰 어디서나 막는다", () => {
    expect(mobileCan(true, { access: "full" }, "excel")).toBe(false);
  });

  it("연 화면은 deny 만 막는다", () => {
    expect(mobileCan(true, full, "edit")).toBe(true);
    expect(mobileCan(true, full, "taskDelete")).toBe(false);
  });

  it("보기만 화면은 allow 만 연다", () => {
    expect(mobileCan(true, view, "approval")).toBe(true);
    expect(mobileCan(true, view, "edit")).toBe(false);
  });
});
