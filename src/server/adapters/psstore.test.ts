// PlayStation Store 파서 테스트 — fixture 기반(실응답, market=KR), 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import {
  parsePsstoreConcept,
  parsePsstoreGrid,
  parsePsstoreProduct,
  parsePsstoreSearch,
  psstoreCleanTitle,
  psstoreEpochToIso,
  psstorePlatform,
} from "./psstore";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8"));

describe("parsePsstoreGrid", () => {
  it("콘셉트(게임) 단위 후보를 만든다", () => {
    const list = parsePsstoreGrid(fixture("psstore-grid.json"));
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].externalId).toBe("10000730");
    expect(list[0].title).toBe("Grand Theft Auto VI");
    expect(list[0].url).toBe("https://store.playstation.com/ko-kr/concept/10000730");
  });

  it("제목이 없으면 건너뛴다", () => {
    expect(parsePsstoreGrid({ data: { categoryGridRetrieve: { concepts: [{ id: "1" }] } } })).toEqual([]);
  });

  it("형식이 다르면 AdapterError", () => {
    expect(() => parsePsstoreGrid({ data: {} })).toThrow(AdapterError);
  });
});

describe("parsePsstoreConcept", () => {
  it("할인 중인 콘셉트에서 가격, 할인율, 종료 시각, 출시일을 읽는다 (PRAGMATA)", () => {
    const snap = parsePsstoreConcept(fixture("psstore-concept.json"), "10002075");
    expect(snap.platform).toBe("ps5"); // 상품 id 가 PPSA = PS5 세대
    expect(snap.storeExternalId).toBe("10002075");
    expect(snap.listPrice).toBe(69800);
    expect(snap.currentPrice).toBe(55840);
    expect(snap.discountPct).toBe(20);
    expect(snap.discountEndsAt).not.toBeNull();
    expect(snap.releaseDate).toBe("2026-04-16");
    expect(snap.meta?.titleEn).toBe("PRAGMATA");
  });

  it("한국어 제목이 지원 언어 표기만 다르면 titleKo 를 비워 둔다", () => {
    expect(parsePsstoreConcept(fixture("psstore-concept.json"), "10002075").meta?.titleKo).toBeNull();
  });

  it("콘셉트가 없으면 AdapterError (재시도 대상 아님)", () => {
    expect(() => parsePsstoreConcept({ data: { conceptRetrieve: null } }, "1")).toThrow(AdapterError);
  });

  it("가격이 붙은 구매 버튼이 없으면 가격을 비워 둔다", () => {
    const snap = parsePsstoreConcept(
      { data: { conceptRetrieve: { id: "7", products: [], defaultProduct: { id: "X-CUSA1_00-A", webctas: [{ price: null }] } } } },
      "7",
    );
    expect(snap.listPrice).toBeNull();
    expect(snap.discountPct).toBeNull();
    expect(snap.platform).toBe("ps4");
  });
});

describe("psstoreCleanTitle", () => {
  it("지원 언어 표기를 걷어낸다", () => {
    expect(psstoreCleanTitle("PRAGMATA (중국어(간체자), 한국어, 영어)")).toBe("PRAGMATA");
    expect(psstoreCleanTitle("Threshold Warden (영어, 일본어)")).toBe("Threshold Warden");
  });

  it("게임 제목의 괄호는 건드리지 않는다", () => {
    expect(psstoreCleanTitle("Persona 3 Reload (Digital Deluxe)")).toBe("Persona 3 Reload (Digital Deluxe)");
  });

  it("빈 제목은 null", () => {
    expect(psstoreCleanTitle("   ")).toBeNull();
    expect(psstoreCleanTitle(null)).toBeNull();
  });
});

describe("psstorePlatform", () => {
  it("PS5 판이 있으면 ps5, 구세대만 있으면 ps4", () => {
    expect(psstorePlatform(["EP1004-PPSA01547_00-A", "EP1004-CUSA01547_00-A"])).toBe("ps5");
    expect(psstorePlatform(["EP1004-CUSA01547_00-A"])).toBe("ps4");
    expect(psstorePlatform([])).toBe("ps5");
  });
});

describe("psstoreEpochToIso", () => {
  it("epoch ms 문자열을 ISO 로 바꾸고, 값이 없으면 null", () => {
    expect(psstoreEpochToIso("1790175540000")).toBe(new Date(1790175540000).toISOString());
    expect(psstoreEpochToIso(null)).toBeNull();
    expect(psstoreEpochToIso("나쁜값")).toBeNull();
  });
});

describe("parsePsstoreSearch, parsePsstoreProduct", () => {
  it("검색은 상품 id 를 주고, 상품 상세가 콘셉트로 바꿔 준다", () => {
    const hits = parsePsstoreSearch({
      data: { universalSearch: { results: [{ id: "HP0700-PPSA04608_00-ELDENRING0000000", name: "ELDEN RING (한국어판)" }] } },
    });
    expect(hits).toEqual([{ productId: "HP0700-PPSA04608_00-ELDENRING0000000", title: "ELDEN RING" }]);

    const candidate = parsePsstoreProduct({
      data: { productRetrieve: { id: "HP0700-PPSA04608_00-ELDENRING0000000", invariantName: "ELDEN RING PS4 & PS5", concept: { id: "10000333" } } },
    });
    expect(candidate).toEqual({
      externalId: "10000333",
      title: "ELDEN RING PS4 & PS5",
      url: "https://store.playstation.com/ko-kr/concept/10000333",
    });
  });

  it("콘셉트가 없는 상품은 후보에서 뺀다", () => {
    expect(parsePsstoreProduct({ data: { productRetrieve: { id: "A", invariantName: "A" } } })).toBeNull();
  });
});
