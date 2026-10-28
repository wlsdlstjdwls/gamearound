import { describe, expect, it } from "vitest";
import { alertPayload, alertPreviewInput, ALERT_PREVIEW_SAMPLE_PCT } from "./payload";

const best = { platform: "steam", currentPrice: 30000, currency: "KRW" as const, discountPct: 0 };

describe("alertPayload", () => {
  it("할인이면 제목에 할인 중, 본문에 할인율을 적는다", () => {
    expect(alertPayload({ gameTitle: "하데스", platform: "steam", price: 15000, currency: "KRW", discountPct: 50 })).toEqual({ title: "하데스 할인 중", body: "Steam 15,000원 (50% 할인)" });
  });

  it("할인 없이 값만 내려가면 그렇게 말한다", () => {
    expect(alertPayload({ gameTitle: "하데스", platform: "steam", price: 15000, currency: "KRW", discountPct: 0 }).title).toBe("하데스 가격이 내려갔어요");
  });
});

describe("alertPreviewInput", () => {
  it("값을 모르면 미리보기를 세우지 않는다", () => {
    expect(alertPreviewInput("g", { minDiscountPct: 1, targetPrice: null }, null, false)).toBeNull();
  });

  it("조건에 맞으면 실제 값을 쓴다", () => {
    expect(alertPreviewInput("g", { minDiscountPct: 1, targetPrice: null }, { ...best, discountPct: 30 }, true)).toMatchObject({ price: 30000, discountPct: 30 });
  });

  it("목표가 알림은 목표가로 예시를 만든다", () => {
    expect(alertPreviewInput("g", { minDiscountPct: null, targetPrice: 20000 }, best, false)).toMatchObject({ price: 20000, discountPct: 0 });
  });

  it("할인율 알림은 예시 할인율과 조건 중 큰 쪽으로 깎는다", () => {
    expect(alertPreviewInput("g", { minDiscountPct: 1, targetPrice: null }, best, false)).toMatchObject({ price: 24000, discountPct: ALERT_PREVIEW_SAMPLE_PCT });
    expect(alertPreviewInput("g", { minDiscountPct: 50, targetPrice: null }, best, false)).toMatchObject({ price: 15000, discountPct: 50 });
  });
});
