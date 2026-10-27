import { describe, expect, it } from "vitest";
import { isUpcomingRow, orderCards, type PlatformPriceItem } from "./order";

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

describe("isUpcomingRow", () => {
  const today = "2026-10-27";
  const at = (releaseDate: string | null, currentPrice: number | null = null) => ({ ...row("ps5", currentPrice), releaseDate }) as PlatformPriceItem;
  it("값이 없고 그 행 출시일이 미래면 출시 예정", () => {
    expect(isUpcomingRow(at("2026-11-20"), null, today)).toBe(true);
  });
  it("값이 붙었으면 예약 판매라 출시 예정 카드가 아니다", () => {
    expect(isUpcomingRow(at("2026-11-20", 79_800), null, today)).toBe(false);
  });
  it("행 출시일이 없으면 게임 출시일을 본다, 둘 다 없으면 아니다", () => {
    expect(isUpcomingRow(at(null), "2026-12-01", today)).toBe(true);
    expect(isUpcomingRow(at(null), null, today)).toBe(false);
  });
  it("오늘 나온 행은 출시 예정이 아니다", () => {
    expect(isUpcomingRow(at("2026-10-27T00:00:00.000Z"), null, today)).toBe(false);
  });
});
