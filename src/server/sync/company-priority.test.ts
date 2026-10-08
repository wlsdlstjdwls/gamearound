import { describe, expect, it } from "vitest";
import { prioritizeCompanyTargets } from "@/server/sync/company-priority";

const target = (name: string, links: Array<{ slug?: string; upcoming?: boolean }>) => ({ name, links });

describe("prioritizeCompanyTargets", () => {
  it("출시예정 게임을 가진 이름이 게임 수 많은 이름보다 앞선다", () => {
    const big = target("Square Enix", [{ slug: "a" }, { slug: "b" }, { slug: "c" }]);
    const indie = target("Tiny Studio", [{ slug: "new-game", upcoming: true }]);
    expect(prioritizeCompanyTargets([big, indie], new Set()).map((t) => t.name)).toEqual(["Tiny Studio", "Square Enix"]);
  });

  it("최근 조회된 게임의 이름은 출시예정 다음, 나머지 앞이다", () => {
    const rest = target("Rest", [{ slug: "x" }, { slug: "y" }]);
    const viewed = target("Viewed", [{ slug: "seen" }]);
    const upcoming = target("Upcoming", [{ slug: "soon", upcoming: true }]);
    const out = prioritizeCompanyTargets([rest, viewed, upcoming], new Set(["seen"]));
    expect(out.map((t) => t.name)).toEqual(["Upcoming", "Viewed", "Rest"]);
  });

  it("같은 갈래 안에서는 들어온 순서(게임 수 순)를 지킨다", () => {
    const a = target("A", [{ slug: "1", upcoming: true }, { slug: "2" }]);
    const b = target("B", [{ slug: "3", upcoming: true }]);
    const c = target("C", [{ slug: "4" }, { slug: "5" }]);
    const d = target("D", [{ slug: "6" }]);
    expect(prioritizeCompanyTargets([a, b, c, d], new Set()).map((t) => t.name)).toEqual(["A", "B", "C", "D"]);
  });

  it("slug 없는 링크(재조회 대상)는 조회 기록과 엇갈리지 않는다", () => {
    const stale = target("Stale", []);
    const viewed = target("Viewed", [{ slug: "seen" }]);
    expect(prioritizeCompanyTargets([stale, viewed], new Set(["seen"])).map((t) => t.name)).toEqual(["Viewed", "Stale"]);
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const input = [target("A", []), target("B", [{ upcoming: true }])];
    prioritizeCompanyTargets(input, new Set());
    expect(input.map((t) => t.name)).toEqual(["A", "B"]);
  });
});
