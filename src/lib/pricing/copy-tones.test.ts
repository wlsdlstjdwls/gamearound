import { describe, expect, it } from "vitest";
import { BADGE_TONES, isHexColor, readableOn, toneSchema } from "@/lib/pricing/copy-tones";

describe("copy-tones", () => {
  it("토큰 이름과 소문자 #rrggbb 만 받는다", () => {
    const s = toneSchema(BADGE_TONES);
    expect(s.safeParse("plum").success).toBe(true);
    expect(s.safeParse("#2563eb").success).toBe(true);
    expect(s.safeParse("#2563EB").success).toBe(false);
    expect(s.safeParse("red").success).toBe(false);
    expect(isHexColor("#abcdef")).toBe(true);
    expect(isHexColor("plum")).toBe(false);
  });
  it("어두운 바탕엔 흰 글자, 밝은 바탕엔 진한 글자", () => {
    expect(readableOn("#2563eb")).toBe("light");
    expect(readableOn("#111111")).toBe("light");
    expect(readableOn("#fde68a")).toBe("dark");
    expect(readableOn("#ffffff")).toBe("dark");
  });
});
