import { describe, expect, it } from "vitest";
import { isYm, kstYm, prevYm, ymLabel } from "@/lib/indie/fame";

describe("fame 달 도우미", () => {
  it("한국 달 경계로 센다", () => {
    expect(kstYm(new Date("2026-10-31T15:30:00Z"))).toBe("2026-11"); // KST 11-01 00:30
    expect(kstYm(new Date("2026-10-31T14:30:00Z"))).toBe("2026-10");
  });
  it("앞 달, 표기, 검사", () => {
    expect(prevYm("2026-01")).toBe("2025-12");
    expect(prevYm("2026-10")).toBe("2026-09");
    expect(ymLabel("2026-03")).toBe("2026년 3월");
    expect(isYm("2026-13")).toBe(false);
    expect(isYm("2026-09")).toBe(true);
  });
});
