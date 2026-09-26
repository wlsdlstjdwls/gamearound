import { describe, expect, it } from "vitest";
import { liftToRoot } from "@/server/sync/parent-root";

describe("liftToRoot", () => {
  it("부모 없는 본편은 그대로다", () => {
    expect(liftToRoot("gears-5", new Map([["gears-5", null]]))).toBe("gears-5");
  });

  it("에디션 행을 본편으로 올린다 (기어스 5 Xbox 에디션 실측)", () => {
    const parentOf = new Map<string, string | null>([["gears-5-edition", "gears-5"], ["gears-5", null]]);
    expect(liftToRoot("gears-5-edition", parentOf)).toBe("gears-5");
  });

  it("여러 칸이어도 맨 위까지 간다", () => {
    const parentOf = new Map<string, string | null>([["c", "b"], ["b", "a"], ["a", null]]);
    expect(liftToRoot("c", parentOf)).toBe("a");
  });

  it("고리가 있어도 멈춘다", () => {
    const parentOf = new Map<string, string | null>([["a", "b"], ["b", "a"]]);
    expect(["a", "b"]).toContain(liftToRoot("a", parentOf));
  });
});
