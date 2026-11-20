import { describe, expect, it } from "vitest";
import { initialPickBrand, isUpcomingRow, orderCards, primaryBuyRow, type PlatformPriceItem } from "./order";

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
  // Epic 은 2026-11-16 숨겼다(lib/platform 의 HIDDEN_PLATFORMS) — 화면 질의가 행을 먼저 걸러 이 함수까지 오지 않는다
  it("파는 PC 스토어가 선다", () => {
    expect(shape(orderCards([row("steam", 10_000), row("xbox")]))).toEqual(["steam", "xbox", "-playstation", "-nintendo"]);
  });
});

describe("initialPickBrand", () => {
  it("값 없는 맨 앞 카드는 건너뛰고 값 붙은 카드를 고른다", () => {
    expect(initialPickBrand([row("steam", null), row("ps5", 88_900), row("xbox", null)])).toBe("playstation");
  });
  it("값 붙은 카드끼리는 줄 맨 앞(PC 갈래)", () => {
    expect(initialPickBrand([row("ps5", 9_000), row("steam", 10_000)])).toBe("steam");
  });
  it("값이 하나도 없으면 맨 앞 카드, 카드가 없으면 null", () => {
    expect(initialPickBrand([row("xbox", null), row("steam", null)])).toBe("steam");
    expect(initialPickBrand([])).toBeNull();
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

describe("primaryBuyRow", () => {
  const buy = (platform: string, currentPrice: number | null, storeUrl: string | null = "https://store.example", region = "KR") =>
    ({ platform, region, currentPrice, currency: "KRW", storeUrl }) as unknown as PlatformPriceItem;
  it("값과 링크가 다 있는 행 가운데 가장 싼 것", () => {
    expect(primaryBuyRow([buy("ps5", 50_000), buy("steam", 40_000), buy("xbox", 30_000, null)])?.platform).toBe("steam");
  });
  it("값 붙은 행이 하나뿐이어도 고른다, 하나도 없으면 null", () => {
    expect(primaryBuyRow([buy("ps5", 50_000), buy("steam", null)])?.platform).toBe("ps5");
    expect(primaryBuyRow([buy("ps5", null)])).toBeNull();
  });
  it("한국 행을 먼저 본다", () => {
    expect(primaryBuyRow([buy("switch", 1_000, "https://jp.example", "JP"), buy("ps5", 50_000)])?.platform).toBe("ps5");
  });
});
