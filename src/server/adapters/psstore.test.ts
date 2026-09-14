// PlayStation Store 파서 테스트 — fixture 기반(실응답, market=KR), 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import {
  parsePsstoreConcept,
  parsePsstoreGrid,
  psstoreImageUrl,
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

  // 커버는 목록에만 있고 콘셉트 상세에는 없다 — 여기서 안 들고 가면 PS 단독 게임은 커버가 빈다
  it("커버, 세로 아트를 폭 지정 주소로 들고 온다", () => {
    const list = parsePsstoreGrid(fixture("psstore-grid.json"));
    expect(list[0].coverUrl).toBe(
      "https://image.api.playstation.com/vulcan/ap/rnd/202606/1818/1c8e3e304f0bad2d99ffed828ad460ebe5949608cb82a5dd.png?w=640",
    );
    expect(list[0].portraitUrl).toBe(
      "https://image.api.playstation.com/vulcan/ap/rnd/202606/1818/2ebe6fa868c682fcd3d7c5bc866bc95697c02aa4c8f16dc2.jpg?w=600",
    );
  });

  it("세로 아트가 없는 게임(24건 중 5건꼴)은 null 이고 커버만 온다", () => {
    const list = parsePsstoreGrid(fixture("psstore-grid.json"));
    expect(list[1].coverUrl).toContain("?w=640");
    expect(list[1].portraitUrl).toBeNull();
  });

  it("영상은 커버로 쓰지 않는다", () => {
    const media = [{ role: "GAMEHUB_COVER_ART", type: "VIDEO", url: "https://x/a.mp4" }];
    expect(psstoreImageUrl(media, "GAMEHUB_COVER_ART", 640)).toBeNull();
  });

  it("제목이 없으면 건너뛴다", () => {
    expect(parsePsstoreGrid({ data: { categoryGridRetrieve: { concepts: [{ id: "1" }] } } })).toEqual([]);
  });

  it("이미지가 아예 없어도 후보는 만든다", () => {
    const list = parsePsstoreGrid({ data: { categoryGridRetrieve: { concepts: [{ id: "9", name: "제목만" }] } } });
    expect(list[0].coverUrl).toBeNull();
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

// PlayStation Plus 스페셜 카탈로그에 든 게임은 "포함"(0원) 버튼이 구매 버튼보다 먼저 온다.
// 첫 가격을 쓰면 정가짜리 게임이 전부 100% 할인으로 찍힌다(2026-09-14 실측: 사이버펑크 2077 외 다수).
describe("parsePsstoreConcept — 구독 가입가 걸러내기", () => {
  const concept = (webctas: unknown[]) => ({
    data: { conceptRetrieve: { id: "234567", products: [], defaultProduct: { id: "EP4497-PPSA04029_00-A", invariantName: "Cyberpunk 2077", webctas } } },
  });
  const upsell = { type: "UPSELL_PS_PLUS_GAME_CATALOG", price: { applicability: "UPSELL", basePriceValue: 54800, discountedValue: 0 } };
  const buy = { type: "ADD_TO_CART", price: { applicability: "APPLICABLE", basePriceValue: 54800, discountedValue: 21920 } };

  it("구독 가입가가 먼저 와도 구매가를 쓴다", () => {
    const snap = parsePsstoreConcept(concept([upsell, buy]), "234567");
    expect(snap.currentPrice).toBe(21920);
    expect(snap.listPrice).toBe(54800);
    expect(snap.discountPct).toBe(60);
  });

  it("구매 버튼이 없으면 0 이 아니라 모름이다", () => {
    const snap = parsePsstoreConcept(concept([upsell]), "234567");
    expect(snap.currentPrice).toBeNull();
    expect(snap.discountPct).toBeNull();
  });

  it("할인 없는 구매가는 그대로 정가다", () => {
    const snap = parsePsstoreConcept(concept([upsell, { type: "ADD_TO_CART", price: { applicability: "APPLICABLE", basePriceValue: 58800, discountedValue: 58800 } }]), "234567");
    expect(snap.currentPrice).toBe(58800);
    expect(snap.discountPct).toBe(0);
  });
});
