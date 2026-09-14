import { describe, expect, it } from "vitest";
import { nextFromPathWithSearch, ROUTES, safeNextPath, signInPath } from "./routes";

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
