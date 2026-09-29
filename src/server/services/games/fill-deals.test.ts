import { describe, expect, it } from "vitest";
import type { GameSummary } from "./dto";
import { fillDeals } from "./fill-deals";

const g = (slug: string) => ({ slug }) as GameSummary;
const slugs = (list: GameSummary[]) => list.map((x) => x.slug);

describe("fillDeals", () => {
  it("취향 칸을 앞에 세우고 모자란 칸을 공통 줄로 채운다", () => {
    expect(slugs(fillDeals([g("a"), g("b")], [g("x"), g("y"), g("z")], 4))).toEqual(["a", "b", "x", "y"]);
  });

  it("공통 줄과 겹친 게임은 한 번만 선다", () => {
    expect(slugs(fillDeals([g("x"), g("a")], [g("x"), g("y"), g("z")], 4))).toEqual(["x", "a", "y", "z"]);
  });

  it("취향 칸이 넘치면 공통 줄을 쓰지 않는다", () => {
    expect(slugs(fillDeals([g("a"), g("b"), g("c")], [g("x")], 2))).toEqual(["a", "b"]);
  });

  it("취향 칸이 없으면 공통 줄 그대로다", () => {
    expect(slugs(fillDeals([], [g("x"), g("y")], 12))).toEqual(["x", "y"]);
  });
});
