import { describe, expect, it } from "vitest";
import { readMenuView } from "@/lib/admin/rail";

describe("readMenuView", () => {
  it("favorites 만 즐겨찾기로 읽는다", () => {
    expect(readMenuView("favorites")).toBe("favorites");
  });
  it("없거나 모르는 값은 전체 메뉴다", () => {
    expect(readMenuView(undefined)).toBe("all");
    expect(readMenuView("")).toBe("all");
    expect(readMenuView("FAVORITES")).toBe("all");
  });
});
