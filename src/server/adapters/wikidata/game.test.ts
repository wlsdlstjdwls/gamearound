// 위키데이터 게임 어댑터의 순수 부분. 네트워크는 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { collectAliases, exactGameMatches, usefulAliases } from "./game";

describe("exactGameMatches", () => {
  const payload = {
    search: [
      { id: "Q1", label: "Tekken 8" },
      { id: "Q2", label: "Tekken 7" },
      { id: "Q3", label: "무언가", aliases: ["TEKKEN 8"] },
    ],
  };

  it("제목이 정확히 같은 것만 남긴다", () => {
    expect(exactGameMatches(payload, "Tekken 8")).toEqual(["Q1", "Q3"]);
  });

  it("같은 시리즈의 다른 작품은 버린다 — 유사도로 넓히면 별칭이 통째로 틀린다", () => {
    expect(exactGameMatches(payload, "Tekken 8")).not.toContain("Q2");
  });

  it("에디션 접미사는 떼고 비교한다", () => {
    const p = { search: [{ id: "Q9", label: "Diablo II: Resurrected" }] };
    expect(exactGameMatches(p, "Diablo II: Resurrected - Infernal Edition")).toEqual(["Q9"]);
  });

  it("응답이 비었거나 모양이 다르면 빈 배열", () => {
    expect(exactGameMatches({}, "Tekken 8")).toEqual([]);
    expect(exactGameMatches({ search: "nope" }, "Tekken 8")).toEqual([]);
    expect(exactGameMatches(payload, "   ")).toEqual([]);
  });
});

describe("collectAliases", () => {
  it("시리즈, 원작, 별칭을 한 집합으로 모으고 중복을 접는다", () => {
    const rows = [
      { series: { value: "젤다의 전설" }, alt: { value: "TOTK" } },
      { series: { value: "젤다의 전설" }, alt: { value: "Tears of the Kingdom" } },
      { based: { value: "해리 포터" } },
    ];
    expect(collectAliases(rows).sort()).toEqual(["TOTK", "Tears of the Kingdom", "젤다의 전설", "해리 포터"].sort());
  });

  it("빈 값은 버린다", () => {
    expect(collectAliases([{ series: { value: "  " } }, {}])).toEqual([]);
  });
});

describe("usefulAliases", () => {
  it("제목과 같은 값은 버린다 — 넣어도 검색 결과가 안 달라진다", () => {
    expect(usefulAliases(["Tekken 8", "TEKKEN  8", "TK8"], "Tekken 8")).toEqual(["TK8"]);
  });

  it("에디션만 다른 제목도 같은 것으로 본다", () => {
    expect(usefulAliases(["Diablo II: Resurrected"], "Diablo II: Resurrected - Infernal Edition")).toEqual([]);
  });

  it("정규화 결과가 빈 값은 버린다", () => {
    expect(usefulAliases(["!!!", "디아블로"], "Tekken 8")).toEqual(["디아블로"]);
  });
});
