import { describe, expect, it } from "vitest";
import { ADMIN_MOBILE, mobileCan, mobilePolicyOf } from "@/lib/admin/mobile";
import { adminGamePath, ROUTES } from "@/lib/routes";

describe("mobilePolicyOf", () => {
  it("대시보드는 정확히 일치할 때만 대시보드 몫이다", () => {
    expect(mobilePolicyOf(ROUTES.admin).access).toBe("full");
    // 표에 없는 하위 주소가 대시보드 몫으로 열리면 안 된다
    expect(mobilePolicyOf("/admin/unknown").access).toBe("off");
    expect(mobilePolicyOf(adminGamePath("abc"))).toBe(ADMIN_MOBILE[ROUTES.adminGames]);
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
    expect(mobilePolicyOf(ROUTES.shopsAdmin)).toBe(ADMIN_MOBILE[ROUTES.shopsAdmin]);
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
  it("메뉴 화면은 전부 휴대폰에서 열려 있고 엑셀만 막힌다(2026-11-02 사용자 \"모바일 대응 다\")", () => {
    for (const href of Object.keys(ADMIN_MOBILE)) {
      const policy = mobilePolicyOf(href);
      expect(policy.access, href).toBe("full");
      expect(mobileCan(true, policy, "edit"), href).toBe(true);
      expect(mobileCan(true, policy, "excel"), href).toBe(false);
    }
  });
});
