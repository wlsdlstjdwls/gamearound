import { describe, expect, it } from "vitest";
import { orderCards, type PlatformPriceItem } from "./order";

/** 카드 순서만 보는 시험이라 순서에 쓰는 칸만 채운다 */
const row = (platform: string, currentPrice: number | null = 10_000) => ({ platform, region: "KR", currentPrice, currency: "KRW" }) as unknown as PlatformPriceItem;
const shape = (cards: ReturnType<typeof orderCards>) => cards.map((c) => (c.kind === "row" ? c.row.platform : `-${c.brand.key}`));

describe("orderCards", () => {
  it("PC 스토어 하나라도 팔면 다른 PC 스토어 빈 칸은 안 세운다 — 목업처럼 네 칸", () => {
    expect(shape(orderCards([row("steam")]))).toEqual(["steam", "-playstation", "-xbox", "-nintendo"]);
  });
  it("PC 에서 안 팔면 PC 빈 칸 하나", () => {
    expect(shape(orderCards([row("ps5")]))).toEqual(["-pc", "ps5", "-xbox", "-nintendo"]);
  });
  it("파는 PC 스토어는 다 선다", () => {
    expect(shape(orderCards([row("epic", 9_000), row("steam", 10_000), row("xbox")]))).toEqual(["epic", "steam", "xbox", "-playstation", "-nintendo"]);
  });
});
