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
