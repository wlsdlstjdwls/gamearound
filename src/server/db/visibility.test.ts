// 숨김 규칙이 화면 질의에서 실제로 한 곳만 타는지 확인한다. DB 는 건드리지 않는다.
//
// 특정 스토어 이름을 박아 두지 않는다(2026-09-18). 전에는 "gog 를 뺀다" 로 적어 뒀는데,
// 그 스토어를 코드에서 걷어내자 규칙이 멀쩡한데도 테스트가 깨졌다.
// 무엇이 숨겨져 있는지는 HIDDEN_PLATFORMS 가 정하고, 여기서는 **그 목록대로 동작하는지**만 본다 —
// 목록이 비어 있는 지금도 의미가 있는 확인이다.
import { describe, expect, it } from "vitest";
import { HIDDEN_PLATFORMS, HIDDEN_REGIONS } from "@/lib/platform";
import { keepVisiblePlatforms, visiblePlatformsOnly } from "./visibility";

describe("keepVisiblePlatforms", () => {
  it("숨긴 플랫폼 행을 뺀다", () => {
    const rows = [{ platform: "steam" }, ...HIDDEN_PLATFORMS.map((platform) => ({ platform })), { platform: "ps5" }];
    expect(keepVisiblePlatforms(rows).map((r) => r.platform)).toEqual(["steam", "ps5"]);
  });

  it("남은 행의 순서를 바꾸지 않는다 — 부르는 쪽이 따로 정렬한다", () => {
    const rows = [{ platform: "ps5" }, { platform: "steam" }];
    expect(keepVisiblePlatforms(rows).map((r) => r.platform)).toEqual(["ps5", "steam"]);
  });

  it("빈 목록도 그대로 돌려준다", () => {
    expect(keepVisiblePlatforms([])).toEqual([]);
  });

  it("숨긴 지역 행을 뺀다", () => {
    const rows = [{ platform: "switch", region: "KR" }, ...HIDDEN_REGIONS.map((region) => ({ platform: "switch", region }))];
    expect(keepVisiblePlatforms(rows)).toEqual([{ platform: "switch", region: "KR" }]);
  });

  it("지역을 안 읽어 온 행은 지역으로 거르지 않는다", () => {
    expect(keepVisiblePlatforms([{ platform: "steam" }])).toEqual([{ platform: "steam" }]);
  });

  // 링크 없는 행은 psprices 병합분이고 크론이 다시 찾아가지 않는다(visibility 의 linkedOnly 주석)
  it("스토어 링크가 없는 행을 뺀다", () => {
    const rows = [
      { platform: "steam", storeUrl: "https://store.steampowered.com/app/1" },
      { platform: "switch2", storeUrl: null },
    ];
    expect(keepVisiblePlatforms(rows).map((r) => r.platform)).toEqual(["steam"]);
  });

  it("링크를 안 읽어 온 행은 링크로 거르지 않는다", () => {
    expect(keepVisiblePlatforms([{ platform: "ps5" }])).toEqual([{ platform: "ps5" }]);
  });
});

describe("visiblePlatformsOnly", () => {
  /**
   * 숨긴 것이 없으면 undefined 여야 and(...) 에 넣어도 질의가 달라지지 않는다.
   * 있으면 조건이 나와야 한다 — 둘 중 어느 상태든 이 한 줄이 맞아야 화면 질의가 안전하다.
   */
  it("숨긴 목록에 맞는 조건을 돌려준다", () => {
    const condition = visiblePlatformsOnly();
    if (HIDDEN_PLATFORMS.length === 0 && HIDDEN_REGIONS.length === 0) expect(condition).toBeUndefined();
    else expect(condition).toBeDefined();
  });
});
