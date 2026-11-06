// 구조 규칙 판정 — 2026-11-03 옛 DB 병합 뒤 손으로 고친 사례들을 픽스처로 남긴다
import { describe, expect, it } from "vitest";
import { duplicateTitlePairs, findDuplicateTitles, findGamesWithParent, variantTypeOf } from "./rules-structure";
import type { QualityGame } from "./rules";

const g = (id: string, titleEn: string, parentGameId: string | null = null, slug = id): QualityGame => ({ id, slug, titleEn, contentType: "game", parentGameId });

describe("variantTypeOf", () => {
  it("제목으로 갈래를 정한다", () => {
    expect(variantTypeOf("Black Myth: Wukong Deluxe Edition Upgrade")).toBe("dlc");
    expect(variantTypeOf("Farming Simulator 25: Year 1 Bundle")).toBe("bundle");
    expect(variantTypeOf("Monster Hunter Rise + Sunbreak")).toBe("bundle");
    expect(variantTypeOf("Dead Space Digital Deluxe Edition")).toBe("edition");
  });
});

describe("findGamesWithParent", () => {
  it("부모 제목으로 시작하면 갈래만 바꾼다(auto)", () => {
    const [f] = findGamesWithParent([g("p", "Dead Space"), g("c", "Dead Space Digital Deluxe Edition", "p")], new Set());
    expect(f.verdict).toBe("auto");
    expect(f.fix).toEqual({ kind: "set_content_type", gameId: "c", from: "game", to: "edition" });
  });

  it("제목이 딴판이면 부모를 떼자고 묻는다", () => {
    const [f] = findGamesWithParent([g("p", "EA SPORTS FC 27"), g("c", "Bus Simulator 27", "p")], new Set());
    expect(f.verdict).toBe("candidate");
    expect(f.fix).toEqual({ kind: "promote_game", gameId: "c", from: "p" });
  });

  it("사람이 잠근 부모는 묻기만 한다", () => {
    const [f] = findGamesWithParent([g("p", "Dead Space"), g("c", "Dead Space Digital Deluxe Edition", "p")], new Set(["c"]));
    expect(f.verdict).toBe("candidate");
  });

  it("제목이 같으면 중복 규칙 몫이라 내지 않는다", () => {
    expect(findGamesWithParent([g("p", "Abathor"), g("c", "Abathor", "p")], new Set())).toEqual([]);
  });
});

describe("duplicateTitlePairs", () => {
  it("부모 없는 본편 두 줄만 묶는다(읽기가 이 게임들의 연결만 묻는다)", () => {
    const pairs = duplicateTitlePairs([
      g("a", "Watch Dogs2"),
      g("b", "Watch_Dogs 2"),
      g("c", "Hades"),
      g("d", "Doom"),
      g("e", "DOOM"),
      g("f", "Doom", null, "doom-3"),
      g("x", "Hades", "c"),
    ]);
    expect(pairs.map(([a, b]) => [a.id, b.id])).toEqual([["a", "b"]]);
  });
});

describe("findDuplicateTitles", () => {
  const ids = (m: Record<string, Record<string, string>>) => ({ get: (id: string) => m[id] });

  it("같은 제목 본편 둘을 알리고 꼬리 없는 주소를 남기자고 한다", () => {
    const [f] = findDuplicateTitles([g("a", "Squad", null, "squad-1b308841"), g("b", "Squad", null, "squad")], ids({ a: { steam: "393380" }, b: { xbox: "9P9MGXL5T9QN" } }));
    expect(f.verdict).toBe("notify");
    expect(f.gameId).toBe("b");
    expect(f.reason).toContain("squad-1b308841:squad");
  });

  it("띄어쓰기만 다른 제목도 같은 본편으로 본다(2026-11-04 Watch Dogs2 대 Watch_Dogs 2)", () => {
    const [f] = findDuplicateTitles([g("a", "Watch Dogs2"), g("b", "Watch_Dogs 2")], ids({ a: { xbox: "BSXLFN5QQZSC" }, b: { steam: "447040" } }));
    expect(f?.verdict).toBe("notify");
  });

  it("같은 스토어 번호가 갈리면 다른 상품이라 올리지 않는다", () => {
    // 일본 닌텐도가 같은 이름을 두 번호로 판다(2026-11-03 실측: 夜勤事件)
    const games = [g("a", "夜勤事件", null, "x-7067059f"), g("b", "夜勤事件", null, "x")];
    expect(findDuplicateTitles(games, ids({ a: { nintendo_jp: "70010000128475" }, b: { nintendo_jp: "70010000136605" } }))).toEqual([]);
  });

  it("셋 이상 겹친 제목은 사람이 볼 몫이라 내지 않는다", () => {
    expect(findDuplicateTitles([g("a", "Arise"), g("b", "Arise"), g("c", "Arise")], ids({}))).toEqual([]);
  });
});
