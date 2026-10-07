import { describe, expect, it } from "vitest";
import { afterAuthPath, afterSignUpPath, nextFromPathWithSearch, ROUTES, safeNextPath, signInPath } from "./routes";

describe("safeNextPath (오픈 리다이렉트 방지)", () => {
  it.each([
    ["/wishlist", "/wishlist"],
    ["/games/elden-ring?tab=prices", "/games/elden-ring?tab=prices"],
    ["/some-path_with.dots", "/some-path_with.dots"],
    ["//evil.com", ROUTES.home],
    ["/\\evil.com", ROUTES.home],
    ["/@evil.com", ROUTES.home],
    ["https://evil.com", ROUTES.home],
    ["/a b", ROUTES.home],
    ["/sign-in?next=/x", ROUTES.home],
    ["/sign-up", ROUTES.home],
    ["/forgot-password", ROUTES.home],
    ["/reset-password?token=x", ROUTES.home],
    ["", ROUTES.home],
    [null, ROUTES.home],
    [undefined, ROUTES.home],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe("signInPath", () => {
  it("next 없으면 순수 경로", () => expect(signInPath()).toBe(ROUTES.signIn));
  it("next 있으면 인코딩해 붙인다", () => expect(signInPath("/games/a?x=1")).toBe("/sign-in?next=%2Fgames%2Fa%3Fx%3D1"));
  it("홈이면 붙이지 않는다", () => expect(signInPath("/")).toBe(ROUTES.signIn));
});

describe("nextFromPathWithSearch (layout에서 next 해석)", () => {
  it.each([
    ["/sign-in?next=%2Fadmin", "/admin"],
    ["/sign-in?next=%2Fgames%2Fa%3Fx%3D1", "/games/a?x=1"],
    ["/sign-in", ROUTES.home],
    ["/sign-in?next=%2F%2Fevil.com", ROUTES.home],
    ["/sign-in?next=%2Fsign-up", ROUTES.home],
    [null, ROUTES.home],
    [undefined, ROUTES.home],
  ])("%s → %s", (input, expected) => {
    expect(nextFromPathWithSearch(input)).toBe(expected);
  });
});


describe("afterSignUpPath / afterAuthPath (가입 직후 갈 곳)", () => {
  it("그냥 가입하면 온보딩으로", () => expect(afterSignUpPath(ROUTES.home)).toBe(ROUTES.welcome));
  it("가려던 곳이 있으면 그곳이 우선", () => expect(afterSignUpPath("/games/a")).toBe("/games/a"));

  /*
   * 레이아웃과 액션이 같은 답을 내는지 — 이게 어긋나서 가입한 사람이 홈으로 떨어졌다(2026-09-22).
   * 둘이 동시에 움직이므로 "어느 쪽이 이기든 같은 곳" 이어야 한다.
   */
  it.each([
    ["/sign-up", ROUTES.welcome],
    ["/sign-up?next=%2Fwishlist", "/wishlist"],
    ["/sign-in", ROUTES.home],
    ["/sign-in?next=%2Fadmin", "/admin"],
    [null, ROUTES.home],
  ])("%s → %s", (input, expected) => {
    expect(afterAuthPath(input)).toBe(expected);
  });

  it("가입 화면에서는 레이아웃과 액션의 답이 같다", () => {
    expect(afterAuthPath("/sign-up")).toBe(afterSignUpPath(ROUTES.home));
  });

  // 온보딩을 안 보는 계정(관리자)은 가입 화면에서도 홈으로. 가려던 곳이 있으면 그건 그대로 존중한다
  it("온보딩 대상이 아니면 가입 화면도 홈으로", () => {
    expect(afterAuthPath("/sign-up", false)).toBe(ROUTES.home);
    expect(afterAuthPath("/sign-up?next=%2Fadmin", false)).toBe("/admin");
  });
});
