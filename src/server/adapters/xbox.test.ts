// Xbox 파서 테스트 — fixture 기반(Display Catalog 실응답, market=KR), 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import { parseXboxAddOnIds, parseXboxAutosuggest, parseXboxBrowse, parseXboxProduct, xboxImageUrl, xboxPeriodDate, xboxStoreUrl } from "./xbox";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8"));

describe("parseXboxProduct", () => {
  it("KRW 구매 가용성에서 정가/현재가/출시일을 읽는다 (ELDEN RING)", () => {
    const snap = parseXboxProduct(fixture("xbox-product.json"), "9P3J32CTXLRZ");
    expect(snap.platform).toBe("xbox");
    expect(snap.storeExternalId).toBe("9P3J32CTXLRZ");
    expect(snap.listPrice).toBe(64800);
    expect(snap.currentPrice).toBe(64800);
    expect(snap.discountPct).toBe(0);
    expect(snap.releaseDate).toBe("2022-02-25");
    expect(snap.storeUrl).toBe("https://www.xbox.com/ko-KR/games/store/elden-ring/9P3J32CTXLRZ");
    // Xbox 는 추가 콘텐츠의 유무만 준다. 목록을 주는 공개 경로는 없다(어댑터 주석 참고)
    expect(snap.hasAddOns).toBe(true);
  });

  // 2026-09-15 회귀: 같은 배치에 섞인 상품 하나가 나머지를 죽이고 있었다.
  // 응답 전체를 한 번에 검증하던 탓인데, 호출부(sync/store-fetch)는 그 사유를 몰라
  // "비공개, 미판매, 삭제 추정" 으로 기록했다 — 한 실행에서 200건 중 100건이 이렇게 날아갔다.
  it("같은 응답의 다른 상품이 깨져 있어도 요청한 상품은 읽는다", () => {
    const raw = {
      Products: [
        // 스토어가 "값 없음" 을 null 로 준다. 이 한 건이 예전에는 배치 20건을 통째로 죽였다
        { ProductId: "BAD", LocalizedProperties: [{ ProductTitle: null, ShortDescription: null }] },
        {
          ProductId: "X2",
          LocalizedProperties: [{ ProductTitle: "Good Game" }],
          DisplaySkuAvailabilities: [
            { Availabilities: [{ Actions: ["Purchase"], OrderManagementData: { Price: { CurrencyCode: "KRW", ListPrice: 10000, MSRP: 10000 } } }] },
          ],
        },
      ],
    };
    const snap = parseXboxProduct(raw, "X2");
    expect(snap.storeExternalId).toBe("X2");
    expect(snap.currentPrice).toBe(10000);
  });

  it("유저 점수는 전체 기간 별점만 쓴다 — 7일치는 표본이 작아 출렁인다", () => {
    const raw = {
      Products: [
        {
          ProductId: "X4",
          LocalizedProperties: [{ ProductTitle: "Rated" }],
          MarketProperties: [
            {
              OriginalReleaseDate: null,
              UsageData: [
                { AggregateTimeSpan: "7Days", AverageRating: 4.4, RatingCount: 73 },
                { AggregateTimeSpan: "AllTime", AverageRating: 3.9, RatingCount: 57919 },
              ],
            },
          ],
        },
      ],
    };
    // 3.9 * 20 = 78. 척도는 star_average 라 화면이 "3.9" 로 되돌려 적는다
    expect(parseXboxProduct(raw, "X4").userScore).toEqual({ value: 78, kind: "star_average", count: 57919 });
  });

  it("아무도 별점을 안 매겼으면 값을 주지 않는다 — 0점이 아니다", () => {
    const raw = {
      Products: [
        {
          ProductId: "X5",
          LocalizedProperties: [{ ProductTitle: "Unrated" }],
          MarketProperties: [{ OriginalReleaseDate: null, UsageData: [{ AggregateTimeSpan: "AllTime", AverageRating: 0, RatingCount: 0 }] }],
        },
      ],
    };
    expect(parseXboxProduct(raw, "X5").userScore).toBeNull();
  });

  it("텍스트 필드가 null 로 와도 그 상품 자체를 읽는다", () => {
    const raw = {
      Products: [
        {
          ProductId: "X3",
          ProductKind: null,
          LocalizedProperties: [{ ProductTitle: "Null Fields", ShortDescription: null, DeveloperName: null, PublisherName: null }],
          MarketProperties: [{ OriginalReleaseDate: null }],
        },
      ],
    };
    const snap = parseXboxProduct(raw, "X3", raw);
    expect(snap.storeExternalId).toBe("X3");
    expect(snap.releaseDate).toBeNull();
    expect(snap.contentType).toBe("game");
    expect(snap.meta?.description).toBeNull();
  });

  it("MSRP 보다 ListPrice 가 낮으면 할인율 계산", () => {
    const raw = {
      Products: [
        {
          ProductId: "X1",
          LocalizedProperties: [{ ProductTitle: "Sale Game" }],
          MarketProperties: [{ OriginalReleaseDate: "2024-03-01T15:00:00.0000000Z" }],
          DisplaySkuAvailabilities: [
            { Availabilities: [{ Actions: ["License", "Details"], OrderManagementData: { Price: { CurrencyCode: "USD", ListPrice: 0, MSRP: 0 } } }] },
            { Availabilities: [{ Actions: ["Purchase"], OrderManagementData: { Price: { CurrencyCode: "KRW", ListPrice: 30000, MSRP: 60000 } } }] },
          ],
        },
      ],
    };
    const snap = parseXboxProduct(raw, "X1");
    expect(snap.listPrice).toBe(60000);
    expect(snap.currentPrice).toBe(30000);
    expect(snap.discountPct).toBe(50);
    expect(snap.releaseDate).toBe("2024-03-01");
  });

  it("KRW 구매 가용성이 없으면 가격 null", () => {
    const raw = { Products: [{ ProductId: "X2", LocalizedProperties: [{ ProductTitle: "Pass Only" }], DisplaySkuAvailabilities: [] }] };
    const snap = parseXboxProduct(raw, "X2");
    expect(snap.listPrice).toBeNull();
    expect(snap.currentPrice).toBeNull();
    expect(snap.discountPct).toBeNull();
  });

  it("Products 가 비면 게임 없음(재시도 없음)", () => {
    expect(() => parseXboxProduct({ Products: [] }, "NOPE")).toThrowError(AdapterError);
    try {
      parseXboxProduct({ Products: [] }, "NOPE");
    } catch (e) {
      expect((e as AdapterError).retryable).toBe(false);
    }
  });

  it("형식 오류는 AdapterError", () => {
    expect(() => parseXboxProduct({ nope: true }, "X")).toThrowError(AdapterError);
  });

  it("소문자 ID 로도 제 상품을 찾는다 — 스토어는 ProductId 를 대문자로 돌려준다", () => {
    const raw = {
      Products: [
        { ProductId: "AAAA1111AAAA", LocalizedProperties: [{ ProductTitle: "First" }] },
        { ProductId: "BBBB2222BBBB", LocalizedProperties: [{ ProductTitle: "Second" }], ProductKind: "Durable" },
      ],
    };
    const snap = parseXboxProduct(raw, "bbbb2222bbbb");
    expect(snap.storeExternalId).toBe("BBBB2222BBBB");
    expect(snap.contentType).toBe("dlc");
  });

  it("추가 콘텐츠는 addOnParent 로 본편 ID 를 싣는다 — 다른 관계는 무시한다", () => {
    const raw = {
      Products: [{
        ProductId: "CHILD0000001",
        ProductKind: "Durable",
        LocalizedProperties: [{ ProductTitle: "Skin Pack" }],
        MarketProperties: [{
          RelatedProducts: [
            { RelatedProductId: "BUNDLE000001", RelationshipType: "Bundle" },
            { RelatedProductId: "PARENT000001", RelationshipType: "addOnParent" },
          ],
        }],
      }],
    };
    const snap = parseXboxProduct(raw, "CHILD0000001");
    expect(snap.contentType).toBe("dlc");
    expect(snap.parentExternalId).toBe("PARENT000001");
  });

  it("스토어가 체험판이라고 하면 contentType 을 demo 로 싣는다", () => {
    const raw = {
      Products: [{
        ProductId: "DEMO00000001",
        ProductKind: "Game",
        Properties: { IsDemo: true, Categories: ["Action & adventure"], HasAddOns: false },
        LocalizedProperties: [{ ProductTitle: "Clea 2 Demo" }],
      }],
    };
    expect(parseXboxProduct(raw, "DEMO00000001").contentType).toBe("demo");
  });

  it("본편에는 부모를 달지 않는다 — 그 자리는 늘 비어 있다", () => {
    const raw = {
      Products: [{
        ProductId: "MAIN00000001",
        LocalizedProperties: [{ ProductTitle: "Main" }],
        MarketProperties: [{ RelatedProducts: [{ RelatedProductId: "X", RelationshipType: "addOnParent" }] }],
      }],
    };
    expect(parseXboxProduct(raw, "MAIN00000001").parentExternalId).toBeNull();
  });

  it("응답에 없는 ID 는 첫 상품으로 때우지 않고 없음으로 본다", () => {
    // 예전에는 products[0] 으로 떨어졌다. 배치 조회에서 요청한 전원이 첫 상품의 제목, 커버,
    // ProductKind 를 받아 가는 사고가 났다(2026-09-16). 남의 상품을 주느니 없다고 해야 한다.
    const raw = {
      Products: [{ ProductId: "AAAA1111AAAA", LocalizedProperties: [{ ProductTitle: "First" }], ProductKind: "Durable" }],
    };
    expect(() => parseXboxProduct(raw, "ZZZZ9999ZZZZ")).toThrowError(AdapterError);
  });
});

describe("parseXboxAutosuggest", () => {
  it("Type=Game 후보만, ProductId 기준 중복 제거", () => {
    const list = parseXboxAutosuggest(fixture("xbox-autosuggest.json"));
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list[0]).toEqual({ externalId: "9P3J32CTXLRZ", title: "ELDEN RING", url: xboxStoreUrl("9P3J32CTXLRZ", "ELDEN RING") });
    expect(new Set(list.map((c) => c.externalId)).size).toBe(list.length);
  });
  it("빈 응답 → 빈 배열", () => {
    expect(parseXboxAutosuggest({ Results: [] })).toEqual([]);
  });
});

describe("xboxPeriodDate (할인 기간)", () => {
  it("정상 날짜는 ISO", () => expect(xboxPeriodDate("2026-09-16T23:59:59.0000000Z")).toBe("2026-09-16T23:59:59.000Z"));
  it("상시 판매 센티널(9998년), 빈 값은 null", () => {
    expect(xboxPeriodDate("9998-12-30T00:00:00.0000000Z")).toBeNull();
    expect(xboxPeriodDate(undefined)).toBeNull();
    expect(xboxPeriodDate("not-a-date")).toBeNull();
  });
});

describe("parseXboxBrowse (카탈로그 발견)", () => {
  it("게임만 중복 없이 후보로 만든다", () => {
    const list = parseXboxBrowse(fixture("xbox-browse.json"));
    expect(list.map((c) => c.externalId)).toEqual(["9PK3G146XXVF", "9NWWNS0C3007", "9NSN56SL5HC0"]);
    expect(list[0].url).toContain("/9PK3G146XXVF");
  });

  it("추가 콘텐츠(Durable)는 후보에서 뺀다", () => {
    expect(parseXboxBrowse(fixture("xbox-browse.json")).some((c) => c.externalId === "9NDURABLE001")).toBe(false);
  });

  it("제목이 없으면 건너뛴다 (제목 역매칭을 못 해 중복 등록이 된다)", () => {
    expect(parseXboxBrowse({ productSummaries: [{ productId: "9NOTITLE0001" }] })).toEqual([]);
  });

  it("형식이 다르면 AdapterError", () => {
    expect(() => parseXboxBrowse({ productSummaries: "nope" })).toThrow(AdapterError);
  });
});

describe("게임 마스터 정보(meta)", () => {
  const en = {
    Products: [{ ProductId: "9P3J32CTXLRZ", LocalizedProperties: [{ ProductTitle: "ELDEN RING" }], MarketProperties: [], DisplaySkuAvailabilities: [] }],
  };

  it("영문 응답이 있어야 meta 를 만든다 (한국어 slug 로 게임을 만들지 않는다)", () => {
    expect(parseXboxProduct(fixture("xbox-product.json"), "9P3J32CTXLRZ").meta).toBeUndefined();
    const meta = parseXboxProduct(fixture("xbox-product.json"), "9P3J32CTXLRZ", en).meta;
    expect(meta?.titleEn).toBe("ELDEN RING");
    expect(meta?.developer).toBe("FromSoftware, Inc.");
    expect(meta?.coverUrl).toMatch(/^https:\/\/store-images/);
    expect(meta?.portraitUrl).toMatch(/^https:\/\/store-images/);
  });

  it("한국어 제목이 영문과 같으면 titleKo 를 비워 둔다", () => {
    expect(parseXboxProduct(fixture("xbox-product.json"), "9P3J32CTXLRZ", en).meta?.titleKo).toBeNull();
  });

  it("영문 응답 형식이 깨져도 가격 수집은 계속된다", () => {
    const snap = parseXboxProduct(fixture("xbox-product.json"), "9P3J32CTXLRZ", { Products: "nope" });
    expect(snap.meta).toBeUndefined();
    expect(snap.listPrice).toBe(64800);
  });
});

describe("xboxImageUrl", () => {
  it("목적 순서대로 고르고 스킴 없는 주소에 https 를 붙인다", () => {
    const images = [{ ImagePurpose: "SuperHeroArt", Uri: "//img/hero" }, { ImagePurpose: "Poster", Uri: "https://img/poster" }];
    expect(xboxImageUrl(images, ["TitledHeroArt", "SuperHeroArt"])).toBe("https://img/hero");
    expect(xboxImageUrl(images, ["Poster"])).toBe("https://img/poster");
    expect(xboxImageUrl(images, ["BoxArt"])).toBeNull();
  });
});

describe("parseXboxAddOnIds (스토어 페이지 HTML)", () => {
  // 실응답(철권 8, 9PPSM14VKCLW)의 모양을 줄인 것. 한 줄짜리 상태값에
  // 다른 상품 묶음(비슷한 게임)이 먼저 오고, 같은 키가 목록 블록과 제목 블록으로 두 번 나온다.
  const html = [
    '{"SEEDEDPRODUCTS_9PPSM14VKCLW":{"data":{"products":[{"productId":"BXXXOTHER01"},{"productId":"BXXXOTHER02"}],"totalItems":390}},',
    '"PRODUCTADDONS_9PPSM14VKCLW":{"data":{"products":[{"productId":"9N11QCQ52HMS"},{"productId":"9PL437799WSZ"}],"totalItems":30}},',
    '"PRODUCTADDONS_9PPSM14VKCLW":{"data":{"channelName":"이 게임의 추가 콘텐츠"}}}',
  ].join("");

  it("그 게임의 추가 콘텐츠 블록에서만 ID 를 꺼낸다", () => {
    expect(parseXboxAddOnIds(html, "9PPSM14VKCLW")).toEqual(["9N11QCQ52HMS", "9PL437799WSZ"]);
  });

  it("다른 상품 묶음(비슷한 게임)은 섞이지 않는다", () => {
    expect(parseXboxAddOnIds(html, "9PPSM14VKCLW")).not.toContain("BXXXOTHER01");
  });

  it("본편 자신은 자기 DLC 가 될 수 없다", () => {
    const withSelf = '"PRODUCTADDONS_ABC":{"data":{"products":[{"productId":"ABC"},{"productId":"DEF"}]}}';
    expect(parseXboxAddOnIds(withSelf, "ABC")).toEqual(["DEF"]);
  });

  it("추가 콘텐츠가 없는 게임은 빈 배열", () => {
    expect(parseXboxAddOnIds('{"OTHER":{"data":{}}}', "9PPSM14VKCLW")).toEqual([]);
    expect(parseXboxAddOnIds("", "9PPSM14VKCLW")).toEqual([]);
  });
});

describe("ProductKind (본편/추가 콘텐츠)", () => {
  const raw = (kind: string | undefined, hasAddOns: boolean) => ({
    Products: [{ ProductId: "X1", ProductKind: kind, Properties: { HasAddOns: hasAddOns }, LocalizedProperties: [{ ProductTitle: "제목" }], MarketProperties: [], DisplaySkuAvailabilities: [] }],
  });

  it("Durable 은 추가 콘텐츠로 읽는다", () => {
    const snap = parseXboxProduct(raw("Durable", false), "X1");
    expect(snap.contentType).toBe("dlc");
  });

  it("Game 과 값 없음은 본편으로 읽는다", () => {
    expect(parseXboxProduct(raw("Game", true), "X1").contentType).toBe("game");
    expect(parseXboxProduct(raw(undefined, true), "X1").contentType).toBe("game");
  });

  it("DLC 의 추가 콘텐츠 유무는 null — 모른다는 뜻이라 본편 값을 덮지 않는다", () => {
    expect(parseXboxProduct(raw("Durable", true), "X1").hasAddOns).toBeNull();
    expect(parseXboxProduct(raw("Game", true), "X1").hasAddOns).toBe(true);
  });
});
