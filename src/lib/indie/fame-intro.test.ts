import { describe, expect, it } from "vitest";
import { FAME_INTRO_DEFAULTS, FAME_INTRO_HOLD_MAX_MS, FAME_INTRO_HOLD_MIN_MS, parseFameIntroSettings } from "./fame-intro";

describe("parseFameIntroSettings", () => {
  it("맞는 값은 그대로 읽는다", () => {
    expect(parseFameIntroSettings({ mode: "always", holdMs: 3200 })).toEqual({ mode: "always", holdMs: 3200 });
  });

  it("없거나 모양이 틀리면 기본값", () => {
    expect(parseFameIntroSettings(null)).toEqual(FAME_INTRO_DEFAULTS);
    expect(parseFameIntroSettings({ mode: "sometimes", holdMs: 3200 })).toEqual(FAME_INTRO_DEFAULTS);
    expect(parseFameIntroSettings({ mode: "once" })).toEqual(FAME_INTRO_DEFAULTS);
  });

  it("유지 시간 범위 밖은 기본값", () => {
    expect(parseFameIntroSettings({ mode: "once", holdMs: FAME_INTRO_HOLD_MIN_MS - 1 })).toEqual(FAME_INTRO_DEFAULTS);
    expect(parseFameIntroSettings({ mode: "once", holdMs: FAME_INTRO_HOLD_MAX_MS + 1 })).toEqual(FAME_INTRO_DEFAULTS);
    expect(parseFameIntroSettings({ mode: "off", holdMs: FAME_INTRO_HOLD_MAX_MS })).toEqual({ mode: "off", holdMs: FAME_INTRO_HOLD_MAX_MS });
  });
});
