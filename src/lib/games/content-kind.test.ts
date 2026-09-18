// 예약 관련 상품 판정 테스트 — 실제로 본 제목만 넣는다(2026-09-18 카탈로그 실측).
import { describe, expect, it } from "vitest";
import { isPreOrderExtraTitle } from "./content-kind";

describe("isPreOrderExtraTitle", () => {
  it("예약 특전, 예약 팩은 본편이 아니다", () => {
    expect(isPreOrderExtraTitle("TCG Card Shop Simulator Pre-Order Bonus")).toBe(true);
    expect(isPreOrderExtraTitle("Aniimo Pre-Order Pack: Advanced Edition")).toBe(true);
    expect(isPreOrderExtraTitle("Age Of Wonders 4: Pre-Order Content Pack")).toBe(true);
    expect(isPreOrderExtraTitle("ONE PIECE: PIRATE WARRIORS 4 Pre-Order DLC Pack")).toBe(true);
    expect(isPreOrderExtraTitle("Dustborn Preorder Bonus")).toBe(true);
  });

  it("예약 중인 본편은 건드리지 않는다 — 값이 본편 값인 상품들이다", () => {
    expect(isPreOrderExtraTitle("Gears of War: E-Day Pre-Order")).toBe(false);
    expect(isPreOrderExtraTitle("Gears of War: E-Day Premium Edition Pre-Order")).toBe(false);
    expect(isPreOrderExtraTitle("The Relic: First Guardian Pre-order")).toBe(false);
  });

  it("예약과 상관없는 제목은 걸리지 않는다", () => {
    expect(isPreOrderExtraTitle("Starter Pack")).toBe(false);
    expect(isPreOrderExtraTitle("ELDEN RING")).toBe(false);
    expect(isPreOrderExtraTitle(null)).toBe(false);
    expect(isPreOrderExtraTitle("")).toBe(false);
  });
});
