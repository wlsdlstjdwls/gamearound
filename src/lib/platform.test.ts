import { describe, expect, it } from "vitest";
import { platformEnum } from "@/server/db/schema";
import {
  ALL_PLATFORM_ORDER,
  expandPlatformValues,
  familyOf,
  FAMILY_PLATFORMS,
  HIDDEN_PLATFORMS,
  isPlatformFamily,
  isPlatformValue,
  PLATFORM_ORDER,
  platformsOf,
} from "./platform";

describe("플랫폼 갈래", () => {
  // 새 스토어를 enum 에만 넣고 갈래에 안 넣으면 필터에서 사라지고 배지 정렬도 앞으로 튄다 —
  // 그 실수를 여기서 잡는다
  it("enum 의 모든 플랫폼이 갈래 하나에 정확히 한 번 들어간다", () => {
    expect([...ALL_PLATFORM_ORDER].sort()).toEqual([...platformEnum.enumValues].sort());
    expect(new Set(ALL_PLATFORM_ORDER).size).toBe(ALL_PLATFORM_ORDER.length);
  });

  it("숨긴 플랫폼은 화면 순서와 필터 값에서 빠진다 — 갈래 표에는 남아 있다", () => {
    for (const hidden of HIDDEN_PLATFORMS) {
      expect(ALL_PLATFORM_ORDER).toContain(hidden);
      expect(PLATFORM_ORDER).not.toContain(hidden);
      // 주소에 숨긴 플랫폼 값이 실려 와도 아무 일도 없어야 한다
      expect(isPlatformValue(hidden)).toBe(false);
      expect(expandPlatformValues([hidden])).toEqual([]);
      expect(familyOf(hidden)).toBeUndefined();
    }
  });

  it("Epic, Steam 은 PC 다", () => {
    expect(familyOf("epic")).toBe("pc");
    expect(familyOf("steam")).toBe("pc");
  });

  it("스위치, 플레이스테이션, Xbox 는 콘솔이다", () => {
    expect(familyOf("switch2")).toBe("console");
    expect(familyOf("ps4")).toBe("console");
    expect(familyOf("xbox")).toBe("console");
  });

  it("모르는 값은 갈래가 없다", () => {
    expect(familyOf("mobile")).toBeUndefined();
    expect(familyOf(undefined)).toBeUndefined();
    expect(isPlatformFamily("steam")).toBe(false);
  });

  it("갈래를 고르면 그 갈래 전부, 스토어를 고르면 그 하나만 걸린다", () => {
    expect(platformsOf("pc")).toEqual(FAMILY_PLATFORMS.pc);
    expect(platformsOf("switch")).toEqual(["switch"]);
  });
});

describe("여러 값 펼치기", () => {
  it("고른 값들의 합집합을 화면 순서대로 돌려준다", () => {
    expect(expandPlatformValues(["switch", "ps5"])).toEqual(["ps5", "switch"]);
  });

  it("갈래와 그 안의 스토어를 같이 골라도 중복되지 않는다", () => {
    expect(expandPlatformValues(["pc", "steam"])).toEqual(FAMILY_PLATFORMS.pc);
  });

  it("모르는 값은 조용히 버린다 — 주소에는 아무 문자열이나 실릴 수 있다", () => {
    expect(expandPlatformValues(["mobile", "ps5"])).toEqual(["ps5"]);
    expect(expandPlatformValues([])).toEqual([]);
    expect(isPlatformValue("mobile")).toBe(false);
    expect(isPlatformValue("console")).toBe(true);
    expect(isPlatformValue("steam")).toBe(true);
  });
});
