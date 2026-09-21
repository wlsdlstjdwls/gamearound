// 위키데이터 파서 테스트 — 네트워크 없음. 실측 응답 모양을 그대로 케이스로 만든다.
import { describe, expect, it } from "vitest";
import { entityId, exactSearchMatches, groupCompanies, resolveSingleCompany, toIsoDate } from "./parse";

/** 2026-09-14 실측 응답을 줄인 것. OPTIONAL 때문에 한 회사가 여러 행으로 쪼개져 온다 */
const FROMSOFTWARE = {
  results: {
    bindings: [
      {
        company: { value: "http://www.wikidata.org/entity/Q2414469" },
        labelEn: { value: "FromSoftware" },
        labelKo: { value: "프롬소프트웨어" },
        countryLabel: { value: "일본" },
        countryCode: { value: "jp" },
        inception: { value: "1986-11-01T00:00:00Z" },
        hqLabel: { value: "도쿄도" },
        website: { value: "https://www.fromsoftware.jp/jp/" },
      },
      {
        company: { value: "http://www.wikidata.org/entity/Q2414469" },
        labelEn: { value: "FromSoftware" },
        labelKo: { value: "프롬소프트웨어" },
        countryLabel: { value: "일본" },
        inception: { value: "1986-11-01T00:00:00Z" },
      },
    ],
  },
};

describe("entityId", () => {
  it("엔티티 URI 에서 Q번호만 뽑는다", () => {
    expect(entityId("http://www.wikidata.org/entity/Q2414469")).toBe("Q2414469");
    expect(entityId("http://www.wikidata.org/entity/P31")).toBeNull();
    expect(entityId(null)).toBeNull();
  });
});

describe("toIsoDate", () => {
  it("xsd:dateTime 을 날짜로 자른다", () => {
    expect(toIsoDate("1986-11-01T00:00:00Z")).toBe("1986-11-01");
  });
  it("월, 일이 범위를 벗어나면 버린다", () => {
    expect(toIsoDate("1986-13-01T00:00:00Z")).toBeNull();
    expect(toIsoDate("깨진값")).toBeNull();
    expect(toIsoDate(null)).toBeNull();
  });
});

describe("groupCompanies", () => {
  it("OPTIONAL 로 쪼개진 여러 행을 회사 하나로 접는다", () => {
    const grouped = groupCompanies(FROMSOFTWARE);
    expect(grouped.size).toBe(1);
    const c = grouped.get("Q2414469")!;
    expect(c).toMatchObject({
      externalId: "Q2414469",
      nameEn: "FromSoftware",
      nameKo: "프롬소프트웨어",
      countryNameKo: "일본",
      countryCode: "JP", // 대문자로 정규화
      foundedAt: "1986-11-01",
      hqNameKo: "도쿄도",
    });
  });

  it("라벨이 없어 Q번호가 돌아온 값은 이름으로 쓰지 않는다", () => {
    const grouped = groupCompanies({
      results: { bindings: [{ company: { value: "http://www.wikidata.org/entity/Q1" }, countryLabel: { value: "Q999" } }] },
    });
    expect(grouped.get("Q1")?.countryNameKo).toBeNull();
  });

  it("결과가 아니면 빈 맵", () => {
    expect(groupCompanies(null).size).toBe(0);
    expect(groupCompanies({ results: {} }).size).toBe(0);
  });
});

describe("resolveSingleCompany", () => {
  it("후보가 정확히 1건일 때만 확정한다", () => {
    expect(resolveSingleCompany(FROMSOFTWARE)?.externalId).toBe("Q2414469");
  });

  it("2건 이상이면 확정하지 않는다 — 동명이인을 자동으로 붙이면 국가가 틀린 채로 박힌다", () => {
    const two = {
      results: {
        bindings: [
          { company: { value: "http://www.wikidata.org/entity/Q1" }, labelEn: { value: "Apex" } },
          { company: { value: "http://www.wikidata.org/entity/Q2" }, labelEn: { value: "Apex" } },
        ],
      },
    };
    expect(resolveSingleCompany(two)).toBeNull();
  });

  it("후보가 없으면 null", () => {
    expect(resolveSingleCompany({ results: { bindings: [] } })).toBeNull();
  });

  /*
   * 2026-09-21 실측: "Square Enix" 검색에 아이도스 인터랙티브가 딸려 온다.
   * 별칭("Square Enix Ltd")이 법인 접미어를 떼면 같은 키가 되기 때문이다.
   * 이름을 스스로 그렇게 부르는 회사가 하나뿐이면 그것으로 좁힌다.
   */
  const SQUARE_ENIX = {
    results: {
      bindings: [
        {
          company: { value: "http://www.wikidata.org/entity/Q207784" },
          labelEn: { value: "Square Enix" },
          labelKo: { value: "스퀘어 에닉스" },
          countryCode: { value: "jp" },
        },
        {
          company: { value: "http://www.wikidata.org/entity/Q679933" },
          labelEn: { value: "Eidos Interactive" },
          labelKo: { value: "아이도스 인터랙티브" },
          countryCode: { value: "gb" },
        },
      ],
    },
  };

  it("이름이 일치하는 회사가 하나뿐이면 그것으로 좁힌다", () => {
    expect(resolveSingleCompany(SQUARE_ENIX, "Square Enix")?.externalId).toBe("Q207784");
    // 법인 접미어가 붙은 원문으로 물어도 같은 답이어야 한다
    expect(resolveSingleCompany(SQUARE_ENIX, "SQUARE ENIX CO., LTD.")?.externalId).toBe("Q207784");
  });

  it("묻는 이름 없이는 좁히지 않는다 — 앞 동작을 그대로 지킨다", () => {
    expect(resolveSingleCompany(SQUARE_ENIX)).toBeNull();
  });

  it("이름이 진짜로 같은 둘은 여전히 null — 그 자리는 사람이 본다", () => {
    const homonyms = {
      results: {
        bindings: [
          { company: { value: "http://www.wikidata.org/entity/Q1" }, labelEn: { value: "Apex" } },
          { company: { value: "http://www.wikidata.org/entity/Q2" }, labelEn: { value: "Apex" } },
        ],
      },
    };
    expect(resolveSingleCompany(homonyms, "Apex")).toBeNull();
  });
});

describe("exactSearchMatches", () => {
  const hits = {
    search: [
      { id: "Q2414469", label: "FromSoftware", match: { text: "FromSoftware" } },
      { id: "Q999", label: "FromSoftware Studios", match: { text: "FromSoftware Studios" } },
    ],
  };

  it("이름이 정확히 일치하는 후보만 남긴다", () => {
    // 검색 API 는 접두사 일치도 돌려준다. 그대로 쓰면 후보가 부풀어 자동 확정이 영영 안 된다
    expect(exactSearchMatches(hits, "FromSoftware, Inc.")).toEqual(["Q2414469"]);
  });

  it("별칭(match.text)으로도 일치를 인정한다", () => {
    const aliasHit = { search: [{ id: "Q8093", label: "Nintendo", match: { text: "닌텐도" } }] };
    expect(exactSearchMatches(aliasHit, "닌텐도")).toEqual(["Q8093"]);
  });

  it("응답이 비었거나 형태가 다르면 빈 배열", () => {
    expect(exactSearchMatches({}, "Nintendo")).toEqual([]);
    expect(exactSearchMatches(hits, "   ")).toEqual([]);
  });
});
