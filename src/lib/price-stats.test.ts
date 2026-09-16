// 최대 할인 추출 테스트 — 순수 함수만. 네트워크도 DB 도 쓰지 않는다.
import { describe, expect, it } from "vitest";
import { bestDiscountOf, isAtBestDiscount, type DiscountPoint } from "./price-stats";

const p = (t: string, price: number, discountPct: number): DiscountPoint => ({
  t,
  price,
  discountPct,
  discountName: null,
});

describe("bestDiscountOf", () => {
  it("할인이 없으면 null", () => {
    expect(bestDiscountOf([])).toBeNull();
    expect(bestDiscountOf([p("2026-01-01", 50000, 0)])).toBeNull();
  });

  it("가장 큰 할인율을 고른다", () => {
    const best = bestDiscountOf([
      p("2026-01-01", 40000, 20),
      p("2026-06-01", 12500, 75),
      p("2026-09-01", 25000, 50),
    ]);
    expect(best?.discountPct).toBe(75);
    expect(best?.t).toBe("2026-06-01");
  });

  it("할인율이 같으면 더 싼 값을 고른다", () => {
    // 정가가 내려간 뒤의 같은 할인율이 실제로 더 좋은 거래다
    const best = bestDiscountOf([p("2026-01-01", 30000, 50), p("2026-06-01", 25000, 50)]);
    expect(best?.price).toBe(25000);
  });

  it("할인율도 값도 같으면 더 최근 것을 고른다", () => {
    const best = bestDiscountOf([p("2026-01-01", 25000, 50), p("2026-06-01", 25000, 50)]);
    expect(best?.t).toBe("2026-06-01");
  });

  it("값이 0 인 점도 그대로 본다 - 거르는 일은 sync 가 한다", () => {
    // 오독 차단은 platform-writer 의 priceMisread 로 옮겼다. 여기까지 온 0 은 진짜 0원이라는 뜻이다
    expect(bestDiscountOf([p("2026-09-14", 0, 100)])?.discountPct).toBe(100);
  });

  it("정가 기록이 섞여 있어도 할인 점만 본다", () => {
    const best = bestDiscountOf([p("2026-01-01", 50000, 0), p("2026-02-01", 45000, 10)]);
    expect(best?.discountPct).toBe(10);
  });
});

describe("isAtBestDiscount", () => {
  const best = p("2026-06-01", 12500, 75);

  it("지금 할인율이 최대치와 같으면 참", () => {
    expect(isAtBestDiscount(75, best)).toBe(true);
  });

  it("최대치를 넘으면 참 — 기록을 새로 쓴 경우다", () => {
    expect(isAtBestDiscount(80, best)).toBe(true);
  });

  it("못 미치면 거짓", () => {
    expect(isAtBestDiscount(50, best)).toBe(false);
  });

  it("할인 기록이 없거나 지금 할인이 없으면 거짓", () => {
    expect(isAtBestDiscount(75, null)).toBe(false);
    expect(isAtBestDiscount(null, best)).toBe(false);
  });
});
