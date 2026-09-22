// 위키데이터 게임 어댑터의 순수 부분. 네트워크는 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { collectAliases, exactGameMatches, foldVerified, fulltextIds, sameTitled, spreadNames, usefulAliases } from "./game";

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
  it("이름을 한 집합으로 모으고 중복을 접는다", () => {
    const rows = [
      { name: { value: "젤다의 전설" } },
      { name: { value: "TOTK" } },
      { name: { value: "젤다의 전설" } },
      { name: { value: "해리 포터" } },
    ];
    expect(collectAliases(rows).sort()).toEqual(["TOTK", "젤다의 전설", "해리 포터"].sort());
  });

  it("항목 자신의 라벨도 별칭으로 받는다 — 한국 사람이 치는 말이 제목이 아니라 여기 있다", () => {
    // 2026-09-22 실측(Q28937399): 라벨이 "배틀그라운드", altLabel 이 "배그" 라
    // 라벨을 빼면 "배틀그라운드" 검색이 0건이 된다
    const rows = [{ name: { value: "배틀그라운드" } }, { name: { value: "배그" } }, { name: { value: "PUBG: Battlegrounds" } }];
    expect(collectAliases(rows)).toContain("배틀그라운드");
  });

  it("빈 값은 버린다", () => {
    expect(collectAliases([{ name: { value: "  " } }, {}])).toEqual([]);
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

describe("fulltextIds", () => {
  it("항목 Q번호만 남긴다", () => {
    const payload = { query: { search: [{ title: "Q17185964" }, { title: "P31" }, { title: "Q12393" }] } };
    expect(fulltextIds(payload)).toEqual(["Q17185964", "Q12393"]);
  });

  it("중복을 접고, 모양이 다르면 빈 배열", () => {
    expect(fulltextIds({ query: { search: [{ title: "Q1" }, { title: "Q1" }] } })).toEqual(["Q1"]);
    expect(fulltextIds({})).toEqual([]);
    expect(fulltextIds({ query: { search: "nope" } })).toEqual([]);
  });
});

describe("foldVerified", () => {
  // 별칭 하나가 한 행이라 같은 항목이 여러 줄로 온다
  const bindings = [
    {
      item: { value: "http://www.wikidata.org/entity/Q17185964" },
      labelKo: { value: "젤다의 전설: 브레스 오브 더 와일드" },
      labelEn: { value: "The Legend of Zelda: Breath of the Wild" },
      alt: { value: "젤다의 전설 야생의 숨결" },
    },
    {
      item: { value: "http://www.wikidata.org/entity/Q17185964" },
      labelKo: { value: "젤다의 전설: 브레스 오브 더 와일드" },
      labelEn: { value: "The Legend of Zelda: Breath of the Wild" },
      alt: { value: "야숨" },
    },
  ];

  it("같은 항목의 여러 행을 하나로 접고 이름을 모은다", () => {
    const [game] = foldVerified(bindings, "fallback");
    expect(game.id).toBe("Q17185964");
    expect(game.names.sort()).toEqual(
      ["The Legend of Zelda: Breath of the Wild", "야숨", "젤다의 전설 야생의 숨결", "젤다의 전설: 브레스 오브 더 와일드"].sort(),
    );
  });

  it("대표 이름은 한국어 라벨을 먼저 쓴다 — 매칭이 우리 제목과 견주는 값이다", () => {
    expect(foldVerified(bindings, "fallback")[0].title).toBe("젤다의 전설: 브레스 오브 더 와일드");
    const enOnly = [{ item: { value: ".../Q1" }, labelEn: { value: "Tekken 8" } }];
    expect(foldVerified(enOnly, "fallback")[0].title).toBe("Tekken 8");
  });

  it("라벨이 하나도 없으면 질의 제목으로 떨어진다", () => {
    expect(foldVerified([{ item: { value: ".../Q1" } }], "fallback")[0].title).toBe("fallback");
  });

  it("항목 자리가 비었으면 버린다", () => {
    expect(foldVerified([{ labelKo: { value: "이름만" } }], "fallback")).toEqual([]);
  });
});

describe("sameTitled", () => {
  const zelda = {
    id: "Q17185964",
    title: "젤다의 전설: 브레스 오브 더 와일드",
    names: ["젤다의 전설: 브레스 오브 더 와일드", "젤다의 전설 야생의 숨결"],
  };
  const series = { id: "Q12393", title: "젤다의 전설", names: ["젤다의 전설"] };

  it("콜론만 다른 라벨을 같은 제목으로 본다 — 스토어 제목에는 콜론이 없다", () => {
    expect(sameTitled([zelda, series], "젤다의 전설 브레스 오브 더 와일드").map((g) => g.id)).toEqual(["Q17185964"]);
  });

  it("통칭으로 찾아도 같은 항목에 닿는다", () => {
    expect(sameTitled([zelda], "젤다의 전설 야생의 숨결").map((g) => g.id)).toEqual(["Q17185964"]);
  });

  it("시리즈 문서처럼 이름이 다른 항목은 버린다 — 전문 검색은 낱말만 겹쳐도 준다", () => {
    expect(sameTitled([series], "젤다의 전설 브레스 오브 더 와일드")).toEqual([]);
  });

  it("질의가 비었으면 빈 배열", () => {
    expect(sameTitled([zelda], "   ")).toEqual([]);
  });
});

describe("spreadNames", () => {
  const zelda = {
    id: "Q17185964",
    title: "젤다의 전설: 브레스 오브 더 와일드",
    names: ["젤다의 전설: 브레스 오브 더 와일드", "The Legend of Zelda: Breath of the Wild", "야숨"],
  };

  it("이름마다 후보를 하나씩 낸다 — 매칭이 후보당 제목 하나만 보기 때문", () => {
    expect(spreadNames([zelda]).map((c) => c.title)).toEqual([
      "젤다의 전설: 브레스 오브 더 와일드",
      "The Legend of Zelda: Breath of the Wild",
      "야숨",
    ]);
  });

  it("Q번호와 주소는 모든 후보가 공유한다 — 어느 이름으로 붙어도 같은 항목이다", () => {
    const out = spreadNames([zelda]);
    expect(new Set(out.map((c) => c.externalId))).toEqual(new Set(["Q17185964"]));
    expect(new Set(out.map((c) => c.url))).toEqual(new Set(["https://www.wikidata.org/wiki/Q17185964"]));
  });

  it("대표 이름이 맨 앞 — 동점이면 그 값이 matched_title 에 남는다", () => {
    const enFirst = { id: "Q1", title: "Tekken 8", names: ["철권 8", "Tekken 8"] };
    expect(spreadNames([enFirst])[0].title).toBe("Tekken 8");
  });

  it("정규화가 같은 이름과 빈 이름은 접는다", () => {
    const dup = { id: "Q1", title: "Tekken 8", names: ["TEKKEN 8", "  ", "TK8"] };
    expect(spreadNames([dup]).map((c) => c.title)).toEqual(["Tekken 8", "TK8"]);
  });
});
