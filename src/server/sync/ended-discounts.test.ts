import { describe, expect, it } from "vitest";
import { pickResettable } from "./ended-discounts";

describe("pickResettable", () => {
  const rows = [
    { id: "a", slug: "a", listPrice: 64800 },
    { id: "b", slug: "b", listPrice: null },
    { id: "c", slug: "c", listPrice: 0 },
    { id: "d", slug: "d", listPrice: 30000 },
  ];
  it("정가를 모르는 행은 되돌리지 않는다", () => {
    expect(pickResettable(rows, () => false).map((r) => r.id)).toEqual(["a", "d"]);
  });
  it("관련 칸이 하나라도 잠겨 있으면 건드리지 않는다", () => {
    const locked = (id: string, field: string) => id === "d" && field === "discountEndsAt";
    expect(pickResettable(rows, locked).map((r) => r.id)).toEqual(["a"]);
  });
});
