// GOG 파서 테스트 — fixture 기반(api.gog.com, catalog.gog.com 실응답, countryCode=KR), 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import {
  gogDlcIds,
  gogImageUrl,
  gogReleaseDate,
  gogStoreUrl,
  parseGogCatalog,
  parseGogMoney,
  parseGogPrices,
  parseGogProducts,
  toGogSnapshot,
  type GogProduct,
} from "./gog";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8"));

const product = (overrides: Partial<GogProduct> = {}): GogProduct =>
  ({ id: 1, title: "Test Game", slug: "test_game", game_type: "game", is_secret: false, ...overrides }) as GogProduct;

describe("toGogSnapshot", () => {
  it("상품 + 가격을 달러 스냅샷으로 묶는다 (Deus Ex)", () => {
    const products = parseGogProducts(fixture("gog-products.json"));
    const prices = parseGogPrices(fixture("gog-prices.json"));
    const deusEx = products.find((p) => p.id === 1207658995)!;
    const snap = toGogSnapshot(deusEx, prices.get("1207658995") ?? null);

    expect(snap.platform).toBe("gog");
    expect(snap.storeExternalId).toBe("1207658995");
    expect(snap.storeUrl).toBe("https://www.gog.com/game/deus_ex");
    // 최소 단위 정수 그대로 담는다 — $6.99 는 699 센트다
    expect(snap.listPrice).toBe(699);
    expect(snap.currentPrice).toBe(69);
    expect(snap.currency).toBe("USD");
    expect(snap.discountPct).toBe(90);
    expect(snap.releaseDate).toBe("2012-01-26");
    expect(snap.meta?.titleEn).toBe("Deus Ex™ GOTY Edition");
    expect(snap.meta?.coverUrl).toMatch(/^https:\/\/images-\d\.gog-statics\.com\//);
  });

  it("가격을 못 받으면 가격만 비우고 상품은 살린다", () => {
    const snap = toGogSnapshot(product(), null);
    expect(snap.listPrice).toBeNull();
    expect(snap.currentPrice).toBeNull();
    expect(snap.discountPct).toBeNull();
    expect(snap.meta?.titleEn).toBe("Test Game");
  });

  it("할인이 없으면 할인율 0", () => {
    const snap = toGogSnapshot(product(), { basePrice: "1999 USD", finalPrice: "1999 USD", currencyCode: "USD" });
    expect(snap.discountPct).toBe(0);
  });

  it("모르는 통화면 원화인 척하지 않고 실패한다", () => {
    let caught: AdapterError | null = null;
    try {
      toGogSnapshot(product(), { basePrice: "1999 EUR", finalPrice: "1999 EUR", currencyCode: "EUR" });
    } catch (e) {
      caught = e as AdapterError;
    }
    expect(caught).toBeInstanceOf(AdapterError);
    expect(caught?.retryable).toBe(false);
  });
});

describe("parseGogProducts", () => {
  it("배치 응답을 상품 목록으로 읽는다", () => {
    expect(parseGogProducts(fixture("gog-products.json")).map((p) => p.id)).toEqual([1207658995, 1207666073]);
  });

  it("비공개 상품만 뺀다 — DLC 는 남긴다(콕 집어 물었을 때 빈손이면 등록이 안 된다)", () => {
    const raw = [
      { id: 1, title: "정상", game_type: "game", is_secret: false },
      { id: 2, title: "비공개", game_type: "game", is_secret: true },
      { id: 3, title: "DLC", game_type: "dlc", is_secret: false },
    ];
    expect(parseGogProducts(raw).map((p) => p.id)).toEqual([1, 3]);
  });

  it("형식이 다르면 재시도하지 않는 AdapterError", () => {
    expect(() => parseGogProducts({ nope: true })).toThrow(AdapterError);
  });
});

describe("gogDlcIds", () => {
  // dlcs 는 없을 때 [], 있을 때 { products } 로 오는 두 모양이다(2026-09-14 실측)
  it("DLC 가 없으면 빈 배열로 온다", () => {
    expect(gogDlcIds({ id: 1, title: "x", dlcs: [] } as unknown as GogProduct)).toEqual([]);
    expect(gogDlcIds({ id: 1, title: "x" } as unknown as GogProduct)).toEqual([]);
  });

  it("DLC 가 있으면 객체 안 products 에서 id 를 꺼낸다", () => {
    const product = { id: 1423049311, title: "Cyberpunk 2077", dlcs: { products: [{ id: 1256837418 }, { id: 1597316373 }] } };
    expect(gogDlcIds(product as unknown as GogProduct)).toEqual(["1256837418", "1597316373"]);
  });
});

describe("parseGogPrices", () => {
  it("상품 ID 별 가격 맵을 만든다", () => {
    const prices = parseGogPrices(fixture("gog-prices.json"));
    expect(prices.get("1207658995")).toEqual({ basePrice: "699 USD", finalPrice: "69 USD", currencyCode: "USD" });
  });

  it("가격이 비어 있는 상품은 맵에 담지 않는다", () => {
    const raw = { _embedded: { items: [{ _embedded: { product: { id: 7 }, prices: [] } }] } };
    expect(parseGogPrices(raw).size).toBe(0);
  });
});

describe("parseGogCatalog", () => {
  it("카탈로그를 후보로 바꾼다", () => {
    const found = parseGogCatalog(fixture("gog-catalog.json"));
    expect(found).toHaveLength(3);
    expect(found[0]).toEqual({
      externalId: "1207658995",
      title: "Deus Ex™ GOTY Edition",
      url: "https://www.gog.com/game/deus_ex",
    });
  });
});

describe("작은 파서들", () => {
  it("\"699 USD\" 를 최소 단위 정수와 통화로 가른다", () => {
    expect(parseGogMoney("699 USD")).toEqual({ amount: 699, currency: "USD" });
    expect(parseGogMoney("0 USD")).toEqual({ amount: 0, currency: "USD" });
    expect(parseGogMoney("무료")).toBeNull();
    expect(parseGogMoney(null)).toBeNull();
  });

  it("출시일을 날짜로 자른다", () => {
    expect(gogReleaseDate("2012-01-26T05:57:00+0100")).toBe("2012-01-26");
    expect(gogReleaseDate("모름")).toBeNull();
  });

  it("프로토콜 없는 이미지 주소에 https 를 붙인다", () => {
    expect(gogImageUrl("//images-1.gog-statics.com/a.jpg")).toBe("https://images-1.gog-statics.com/a.jpg");
    expect(gogImageUrl("https://x/a.jpg")).toBe("https://x/a.jpg");
    expect(gogImageUrl(null)).toBeNull();
  });

  it("상세 주소가 없으면 slug 로 만든다", () => {
    expect(gogStoreUrl(product({ links: null }))).toBe("https://www.gog.com/game/test_game");
    expect(gogStoreUrl(product({ links: { product_card: "https://www.gog.com/game/x" } }))).toBe("https://www.gog.com/game/x");
  });
});
