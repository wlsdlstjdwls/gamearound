// 숨김 규칙이 화면 질의에서 실제로 한 곳만 타는지 확인한다. DB 는 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { HIDDEN_PLATFORMS } from "@/lib/platform";
import { keepVisiblePlatforms, visiblePlatformsOnly } from "./visibility";

describe("keepVisiblePlatforms", () => {
  it("숨긴 플랫폼 행을 뺀다", () => {
    const rows = [{ platform: "steam" }, { platform: "gog" }, { platform: "ps5" }];
    expect(keepVisiblePlatforms(rows).map((r) => r.platform)).toEqual(["steam", "ps5"]);
  });

  it("남은 행의 순서를 바꾸지 않는다 — 부르는 쪽이 따로 정렬한다", () => {
    const rows = [{ platform: "ps5" }, { platform: "steam" }];
    expect(keepVisiblePlatforms(rows).map((r) => r.platform)).toEqual(["ps5", "steam"]);
  });

  it("빈 목록도 그대로 돌려준다", () => {
    expect(keepVisiblePlatforms([])).toEqual([]);
  });
});

describe("visiblePlatformsOnly", () => {
  // 숨긴 것이 없으면 undefined 여야 and(...) 에 넣어도 질의가 달라지지 않는다
  it("숨긴 플랫폼이 있으면 조건을 돌려준다", () => {
    expect(HIDDEN_PLATFORMS.length > 0 ? visiblePlatformsOnly() : undefined).toBeDefined();
  });
});
