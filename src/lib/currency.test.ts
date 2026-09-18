// 통화 표시, 비교 규칙 — 순수 함수 테스트
import { describe, expect, it } from "vitest";
import { cheapestOf, DISPLAY_CURRENCY, formatPrice, sameCurrency } from "./currency";

describe("formatPrice", () => {
  it("KRW 는 소수 없이 원 기호", () => {
    expect(formatPrice(44990)).toBe("₩44,990");
    expect(formatPrice(44990, "KRW")).toBe("₩44,990");
  });

  it("USD 는 센트를 소수 두 자리로 되돌린다", () => {
    expect(formatPrice(699, "USD")).toBe("$6.99");
    expect(formatPrice(1000, "USD")).toBe("$10.00");
  });

  it("값이 없으면 -, 0 은 무료", () => {
    expect(formatPrice(null)).toBe("-");
    expect(formatPrice(undefined, "USD")).toBe("-");
    expect(formatPrice(0, "USD")).toBe("무료");
  });
});

describe("sameCurrency", () => {
  it("기준 통화가 있으면 그것만 남기고 나머지를 떨궈 준다", () => {
    const list = [
      { platform: "steam", currency: "KRW" as const },
      { platform: "epic", currency: "USD" as const },
      { platform: "xbox", currency: "KRW" as const },
    ];
    const { kept, dropped, currency } = sameCurrency(list);
    expect(currency).toBe(DISPLAY_CURRENCY);
    expect(kept.map((k) => k.platform)).toEqual(["steam", "xbox"]);
    expect(dropped.map((d) => d.platform)).toEqual(["epic"]);
  });

  it("기준 통화가 하나도 없으면 첫 항목의 통화로 맞춘다", () => {
    const { kept, currency } = sameCurrency([{ currency: "USD" as const }, { currency: "USD" as const }]);
    expect(currency).toBe("USD");
    expect(kept).toHaveLength(2);
  });

  it("빈 목록이어도 기준 통화를 돌려준다", () => {
    expect(sameCurrency([]).currency).toBe(DISPLAY_CURRENCY);
  });
});

describe("cheapestOf", () => {
  it("가격이 없는 항목은 후보에서 뺀다", () => {
    const best = cheapestOf([
      { id: "a", currentPrice: null, currency: "KRW" as const },
      { id: "b", currentPrice: 30000, currency: "KRW" as const },
    ]);
    expect(best?.id).toBe("b");
  });

  it("통화가 섞이면 숫자만 보고 고르지 않는다 — $6.99 는 ₩30,000 보다 싸지만 비교하지 않는다", () => {
    const best = cheapestOf([
      { id: "steam", currentPrice: 30000, currency: "KRW" as const },
      { id: "usd", currentPrice: 699, currency: "USD" as const },
    ]);
    expect(best?.id).toBe("steam");
  });

  it("기준 통화가 하나도 없으면 남은 통화 안에서 고른다", () => {
    const best = cheapestOf([
      { id: "usd", currentPrice: 699, currency: "USD" as const },
      { id: "usd-sale", currentPrice: 199, currency: "USD" as const },
    ]);
    expect(best?.id).toBe("usd-sale");
  });

  it("가격이 하나도 없으면 null", () => {
    expect(cheapestOf([{ currentPrice: null, currency: "KRW" as const }])).toBeNull();
  });
});
