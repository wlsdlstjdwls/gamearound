import { describe, expect, it } from "vitest";
import { adminNextPath, adminSignInPath, isAdminAreaPath, signInPathFor } from "./sign-in-path";
import { ROUTES } from "@/lib/routes";

describe("isAdminAreaPath", () => {
  it.each([
    ["/admin", true],
    ["/admin/sync?x=1", true],
    ["/shops/admin", true],
    ["/administrator", false],
    ["/admin/sign-in", false],
    ["/admin/sign-in?next=/admin/sync", false],
    ["/wishlist", false],
    [null, false],
  ])("%s 는 %s", (input, expected) => expect(isAdminAreaPath(input)).toBe(expected));
});

describe("adminNextPath", () => {
  it("관리자 영역은 그대로", () => expect(adminNextPath("/admin/tasks?tab=1")).toBe("/admin/tasks?tab=1"));
  it("관리자 영역 밖은 관리자 첫 화면", () => expect(adminNextPath("/wishlist")).toBe(ROUTES.admin));
  it("바깥 오리진은 관리자 첫 화면", () => expect(adminNextPath("//evil.com/admin")).toBe(ROUTES.admin));
  it("로그인 화면 자신은 받지 않는다", () => expect(adminNextPath("/admin/sign-in")).toBe(ROUTES.admin));
});

describe("adminSignInPath", () => {
  it("관리자 첫 화면이면 next 를 붙이지 않는다", () => expect(adminSignInPath("/admin")).toBe(ROUTES.adminSignIn));
  it("다른 관리자 화면이면 붙인다", () => expect(adminSignInPath("/admin/sync")).toBe("/admin/sign-in?next=%2Fadmin%2Fsync"));
});

describe("signInPathFor", () => {
  it("관리자 영역은 관리자 로그인으로", () => expect(signInPathFor("/shops/admin")).toBe("/admin/sign-in?next=%2Fshops%2Fadmin"));
  it("회원 영역은 회원 로그인으로", () => expect(signInPathFor("/wishlist")).toBe("/sign-in?next=%2Fwishlist"));
});
