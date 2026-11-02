// 기기 대조 판정 — DB 없이 행 픽스처로 돈다. 사례는 2026-10-29 손으로 고친 pragmata 일본 행(Switch 로 붙은 Switch 2 판)
import { describe, expect, it } from "vitest";
import { planPlatformFixes, type PlatformRowOfRef } from "./platform-fix";

const ALLOWED = ["switch", "switch2"] as const;
const row = (externalId: string, platform: PlatformRowOfRef["platform"], rowId = `r-${externalId}-${platform}`): PlatformRowOfRef => ({
  rowId,
  gameId: `g-${externalId}`,
  slug: `game-${externalId}`,
  externalId,
  platform,
});

describe("planPlatformFixes", () => {
  it("카탈로그가 Switch 2 라는데 행이 Switch 면 고친다", () => {
    const fixes = planPlatformFixes([{ externalId: "70010000101667", platform: "switch2" }], [row("70010000101667", "switch")], [...ALLOWED]);
    expect(fixes).toEqual([{ rowId: "r-70010000101667-switch", slug: "game-70010000101667", externalId: "70010000101667", from: "switch", to: "switch2" }]);
  });

  it("같으면 건드리지 않는다", () => {
    expect(planPlatformFixes([{ externalId: "1", platform: "switch" }], [row("1", "switch")], [...ALLOWED])).toEqual([]);
  });

  it("그 게임에 이 나라 행이 둘이면 어느 행인지 모르니 사람 몫으로 둔다", () => {
    expect(planPlatformFixes([{ externalId: "1", platform: "switch2" }], [row("1", "switch"), row("1", "switch2")], [...ALLOWED])).toEqual([]);
  });

  it("기기를 모르는 후보, 이 소스가 팔지 않는 기기는 넘긴다", () => {
    expect(planPlatformFixes([{ externalId: "1" }], [row("1", "switch")], [...ALLOWED])).toEqual([]);
    expect(planPlatformFixes([{ externalId: "1", platform: "ps5" }], [row("1", "switch")], [...ALLOWED])).toEqual([]);
  });

  it("행이 없는 ref 는 넘긴다(그 나라에 없는 상품)", () => {
    expect(planPlatformFixes([{ externalId: "1", platform: "switch2" }], [], [...ALLOWED])).toEqual([]);
  });
});
