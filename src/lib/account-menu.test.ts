import { describe, expect, it } from "vitest";
import { ACCOUNT_PRIMARY_COUNT, accountLinksFor, guestLinks } from "@/lib/account-menu";
import { ROUTES } from "@/lib/routes";

describe("accountLinksFor", () => {
  it("기획서 순서 셋이 앞에 서고 관리자 항목은 관리자에게만", () => {
    const user = accountLinksFor("user").map((l) => l.label);
    expect(user.slice(0, ACCOUNT_PRIMARY_COUNT)).toEqual(["내 활동", "찜 목록", "가격 알림"]);
    expect(user).not.toContain("관리자");
    expect(accountLinksFor("admin").map((l) => l.label)).toContain("관리자");
  });
});

describe("guestLinks", () => {
  it("로그인, 계정 등록, 가격 알림 순서이고 가격 알림은 로그인을 거쳐 알림 화면으로 돌아온다", () => {
    const links = guestLinks("/games");
    expect(links.map((l) => l.label)).toEqual(["로그인", "계정 등록", "가격 알림"]);
    expect(links[0].href).toBe(`${ROUTES.signIn}?next=${encodeURIComponent("/games")}`);
    expect(links[1].href).toBe(ROUTES.signUp);
    expect(links[2].href).toBe(`${ROUTES.signIn}?next=${encodeURIComponent(ROUTES.alerts)}`);
  });
  it("인증 화면에서는 로그인 항목이 돌아올 주소를 달지 않는다", () => {
    expect(guestLinks(ROUTES.signUp)[0].href).toBe(ROUTES.signIn);
  });
});
