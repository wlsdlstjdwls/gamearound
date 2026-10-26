import { describe, expect, it } from "vitest";
import { indieDetailHref, parseIndieFrom, parseIndieSearchScope } from "@/lib/indie/query";

describe("parseIndieFrom", () => {
  it("아는 값만 받는다", () => {
    expect(parseIndieFrom("hof")).toBe("hof");
    expect(parseIndieFrom("rookies")).toBe("rookies");
    expect(parseIndieFrom("mine")).toBe("mine");
  });
  it("없거나 모르는 값은 기본(null)", () => {
    expect(parseIndieFrom(undefined)).toBeNull();
    expect(parseIndieFrom("")).toBeNull();
    expect(parseIndieFrom("HOF")).toBeNull();
  });
});

describe("indieDetailHref", () => {
  it("출처가 없으면 맨 상세 주소", () => expect(indieDetailHref("my-game")).toBe("/indie/my-game"));
  it("출처를 from 으로 싣는다", () => expect(indieDetailHref("my-game", "hof")).toBe("/indie/my-game?from=hof"));
  it("슬러그는 주소에 맞게 감싼다", () => expect(indieDetailHref("한글 게임", "mine")).toBe(`/indie/${encodeURIComponent("한글 게임")}?from=mine`));
});

describe("parseIndieSearchScope", () => {
  it("아는 범위는 그대로, 나머지는 전체", () => {
    expect(parseIndieSearchScope("developer")).toBe("developer");
    expect(parseIndieSearchScope("author")).toBe("all");
    expect(parseIndieSearchScope(undefined)).toBe("all");
  });
});
