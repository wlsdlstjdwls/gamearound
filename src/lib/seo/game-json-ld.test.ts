import { describe, expect, it } from "vitest";
import { buildGameJsonLd, serializeJsonLd, type GameJsonLdInput } from "./game-json-ld";

const base: GameJsonLdInput = {
  url: "https://example.test/games/a",
  title: "게임",
  description: null,
  image: null,
  releaseDate: "2026-03-01T00:00:00.000Z",
  genres: [],
  developer: null,
  publisher: null,
  platforms: [],
};

describe("buildGameJsonLd", () => {
  it("한국 원화 값만 모아 최저, 최고를 낸다", () => {
    const ld = buildGameJsonLd({
      ...base,
      platforms: [
        { platform: "steam", region: "KR", currentPrice: 30000, currency: "KRW" },
        { platform: "ps5", region: "KR", currentPrice: 45000, currency: "KRW" },
        { platform: "switch", region: "JP", currentPrice: 799, currency: "JPY" },
        { platform: "xbox", region: "KR", currentPrice: null, currency: "KRW" },
      ],
    });
    expect(ld.offers).toEqual({ "@type": "AggregateOffer", priceCurrency: "KRW", lowPrice: "30000", highPrice: "45000", offerCount: 2 });
    expect(ld.datePublished).toBe("2026-03-01");
  });

  it("값이 없으면 offers 를 빼고 빈 칸도 싣지 않는다", () => {
    const ld = buildGameJsonLd(base);
    expect(ld).not.toHaveProperty("offers");
    expect(ld).not.toHaveProperty("description");
    expect(ld).not.toHaveProperty("genre");
  });
});

describe("serializeJsonLd", () => {
  it("< 를 풀어 script 태그가 닫히지 않게 한다", () => {
    expect(serializeJsonLd({ name: "</script>" })).not.toContain("<");
  });
});
