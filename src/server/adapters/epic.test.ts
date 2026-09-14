// Epic 파서 테스트 — fixture 기반(store.epicgames.com GraphQL 실응답, country=KR), 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import {
  epicExternalId,
  epicReleaseDate,
  epicSaleName,
  epicStoreUrl,
  parseEpicExternalId,
  parseEpicOffer,
  parseEpicSearch,
  toEpicCandidate,
  toEpicSnapshot,
  type EpicOffer,
} from "./epic";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8"));

/** 최소 필드만 채운 오퍼 — 가격, 할인 규칙처럼 검증할 부분만 바꿔 쓴다 */
function offer(overrides: Partial<EpicOffer> = {}): EpicOffer {
  return {
    title: "Test Game",
    id: "offer1",
    namespace: "ns1",
    effectiveDate: "2024-03-01T15:00:00.000Z",
    offerType: "BASE_GAME",
    price: {
      totalPrice: { discountPrice: 30000, originalPrice: 60000, currencyCode: "KRW", currencyInfo: { decimals: 0 } },
      lineOffers: [{ appliedRules: [{ name: "[Seasonal Sale] Summer Sale", startDate: "2026-09-03T15:00:00.000Z", endDate: "2026-09-17T15:00:00.000Z" }] }],
    },
    ...overrides,
  } as EpicOffer;
}

describe("parseEpicOffer", () => {
  it("단건 응답에서 제목, 정가, 출시일, 상세 주소를 읽는다 (Skyrim)", () => {
    const snap = parseEpicOffer(fixture("epic-offer.json"), "c8738a4d1ead40368eab9688b3c7d737:2d837b8ee87b434a99a80fca0e4eb960");
    expect(snap.platform).toBe("epic");
    expect(snap.storeExternalId).toBe("c8738a4d1ead40368eab9688b3c7d737:2d837b8ee87b434a99a80fca0e4eb960");
    expect(snap.listPrice).toBe(44990);
    expect(snap.currentPrice).toBe(44990);
    expect(snap.discountPct).toBe(0);
    expect(snap.releaseDate).toBe("2022-10-06");
    expect(snap.storeUrl).toBe("https://store.epicgames.com/ko/p/skyrim");
    expect(snap.meta?.titleEn).toBe("The Elder Scrolls V: Skyrim Special Edition");
    expect(snap.meta?.developer).toBe("Bethesda Game Studios");
    expect(snap.meta?.portraitUrl).toContain("1200x1600");
    expect(snap.contentType).toBe("game");
  });

  it("오퍼가 없으면 재시도하지 않는 AdapterError", () => {
    const err = (() => {
      try {
        parseEpicOffer({ data: { Catalog: { catalogOffer: null } } }, "ns:missing");
        return null;
      } catch (e) {
        return e as AdapterError;
      }
    })();
    expect(err).toBeInstanceOf(AdapterError);
    expect(err?.retryable).toBe(false);
  });
});

describe("parseEpicSearch", () => {
  it("목록 응답을 후보로 바꾼다", () => {
    const offers = parseEpicSearch(fixture("epic-search.json"));
    expect(offers.length).toBe(3);
    const candidate = toEpicCandidate(offers[0]);
    expect(candidate.externalId).toBe("f36996438299421ea93580ec6c91449b:4a388c43e26746069b1eafc72bb14add");
    expect(candidate.title).toBe("Judas");
    expect(candidate.url).toBe("https://store.epicgames.com/ko/p/judas");
  });

  it("미발표작(2099 센티널)은 출시일을 비운다", () => {
    const snap = toEpicSnapshot(parseEpicSearch(fixture("epic-search.json"))[0]);
    expect(snap.releaseDate).toBeNull();
  });

  it("형식이 다르면 재시도하지 않는 AdapterError", () => {
    expect(() => parseEpicSearch({ data: {} })).toThrow(AdapterError);
  });
});

describe("toEpicSnapshot", () => {
  it("할인가에서 할인율과 행사 기간, 행사명을 읽는다", () => {
    const snap = toEpicSnapshot(offer());
    expect(snap.listPrice).toBe(60000);
    expect(snap.currentPrice).toBe(30000);
    expect(snap.discountPct).toBe(50);
    expect(snap.discountStartsAt).toBe("2026-09-03T15:00:00.000Z");
    expect(snap.discountEndsAt).toBe("2026-09-17T15:00:00.000Z");
    expect(snap.discountName).toBe("Summer Sale");
  });

  it("할인이 아니면 행사 정보를 달지 않는다", () => {
    const snap = toEpicSnapshot(
      offer({ price: { totalPrice: { discountPrice: 60000, originalPrice: 60000, currencyCode: "KRW", currencyInfo: { decimals: 0 } }, lineOffers: [] } }),
    );
    expect(snap.discountPct).toBe(0);
    expect(snap.discountEndsAt).toBeNull();
    expect(snap.discountName).toBeNull();
  });

  it("KRW 가 아니면 가격을 비운다 (지역 미판매)", () => {
    const snap = toEpicSnapshot(
      offer({ price: { totalPrice: { discountPrice: 1999, originalPrice: 1999, currencyCode: "USD", currencyInfo: { decimals: 2 } }, lineOffers: [] } }),
    );
    expect(snap.listPrice).toBeNull();
    expect(snap.currentPrice).toBeNull();
    expect(snap.discountPct).toBeNull();
  });

  it("통화 최소 단위(decimals)만큼 나눈다", () => {
    const snap = toEpicSnapshot(
      offer({ price: { totalPrice: { discountPrice: 1999, originalPrice: 2999, currencyCode: "KRW", currencyInfo: { decimals: 2 } }, lineOffers: [] } }),
    );
    expect(snap.listPrice).toBe(30);
    expect(snap.currentPrice).toBe(20);
  });

  it("DLC 오퍼는 contentType 이 dlc", () => {
    expect(toEpicSnapshot(offer({ offerType: "ADD_ON" })).contentType).toBe("dlc");
  });
});

describe("epicStoreUrl", () => {
  it("productHome 매핑을 우선 쓴다", () => {
    const url = epicStoreUrl(offer({ productSlug: "old-slug", catalogNs: { mappings: [{ pageSlug: "good-slug", pageType: "productHome" }, { pageSlug: "dlc-slug", pageType: "addon--cms-hybrid" }] } }));
    expect(url).toBe("https://store.epicgames.com/ko/p/good-slug");
  });

  it("productSlug 가 비면(\"{}\") 오퍼 ID 로 주소를 만든다", () => {
    expect(epicStoreUrl(offer({ productSlug: "{}" }))).toBe("https://store.epicgames.com/ko/p/offer1");
  });

  it("productSlug 끝의 /home 은 떼어낸다", () => {
    expect(epicStoreUrl(offer({ productSlug: "game/home" }))).toBe("https://store.epicgames.com/ko/p/game");
  });
});

describe("외부 ID", () => {
  it("namespace 와 offerId 를 한 문자열로 담고 되돌린다", () => {
    const id = epicExternalId("ns1", "offer1");
    expect(id).toBe("ns1:offer1");
    expect(parseEpicExternalId(id)).toEqual({ namespace: "ns1", offerId: "offer1" });
  });

  it("형식이 아니면 AdapterError", () => {
    expect(() => parseEpicExternalId("offer-only")).toThrow(AdapterError);
  });
});

describe("epicReleaseDate / epicSaleName", () => {
  it("ISO datetime 을 날짜로 자른다", () => {
    expect(epicReleaseDate("2022-10-06T14:00:00.000Z")).toBe("2022-10-06");
  });

  it("미발표 센티널과 빈 값은 null", () => {
    expect(epicReleaseDate("2099-12-31T16:00:00.000Z")).toBeNull();
    expect(epicReleaseDate(null)).toBeNull();
    expect(epicReleaseDate("모름")).toBeNull();
  });

  it("행사명 앞의 분류 꼬리표를 떼어낸다", () => {
    expect(epicSaleName("[Seasonal Sale] End of Summer Sale 2026")).toBe("End of Summer Sale 2026");
    expect(epicSaleName("[Only Tag]")).toBeNull();
    expect(epicSaleName(null)).toBeNull();
  });
});
