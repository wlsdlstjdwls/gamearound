import { describe, expect, it } from "vitest";
import { SAVING_MIN_AMOUNT, storeSaving } from "./saving";

describe("storeSaving", () => {
  it("같은 기기 묶음 안에서 가장 큰 차이를 고른다", () => {
    expect(storeSaving([
      { platform: "steam", price: 60000, currency: "KRW" },
      { platform: "epic", price: 9000, currency: "KRW" },
    ])).toEqual({ cheaper: "epic", than: "steam", amount: 51000, currency: "KRW" });
  });

  it("기기가 다른 스토어끼리는 견주지 않는다", () => {
    expect(storeSaving([
      { platform: "steam", price: 60000, currency: "KRW" },
      { platform: "ps5", price: 20000, currency: "KRW" },
    ])).toBeNull();
  });

  it("문턱보다 작은 차이와 다른 통화는 판정하지 않는다", () => {
    expect(storeSaving([
      { platform: "ps5", price: 30000, currency: "KRW" },
      { platform: "ps4", price: 30000 - SAVING_MIN_AMOUNT + 1, currency: "KRW" },
    ])).toBeNull();
    expect(storeSaving([
      { platform: "steam", price: 6000, currency: "USD" },
      { platform: "epic", price: 900, currency: "USD" },
    ])).toBeNull();
  });

  it("0원과 값을 모르는 행은 견주지 않는다(Minecraft PS5 0원 행 실측)", () => {
    expect(storeSaving([
      { platform: "ps4", price: 22100, currency: "KRW" },
      { platform: "ps5", price: 0, currency: "KRW" },
      { platform: "steam", price: null, currency: "KRW" },
    ])).toBeNull();
  });

  it("묶음이 여럿이면 차이가 큰 쪽", () => {
    expect(storeSaving([
      { platform: "steam", price: 30000, currency: "KRW" },
      { platform: "epic", price: 24000, currency: "KRW" },
      { platform: "ps5", price: 70000, currency: "KRW" },
      { platform: "ps4", price: 40000, currency: "KRW" },
    ])?.cheaper).toBe("ps4");
  });
});
