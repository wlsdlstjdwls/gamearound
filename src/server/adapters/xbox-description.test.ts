// Xbox 소개글 고르기 — 짧은 소개 우선, 없으면 긴 소개 첫 문단
import { describe, expect, it } from "vitest";
import { XBOX_DESC_MAX_CHARS, xboxDescription } from "./xbox-description";

describe("xboxDescription", () => {
  it("짧은 소개가 있으면 그대로 쓴다", () => {
    expect(xboxDescription(" 짧은 글 ", "긴 글")).toBe("짧은 글");
  });
  it("짧은 소개가 비면 긴 소개의 첫 문단만 쓴다(Akinakes 꼴)", () => {
    expect(xboxDescription("", "Akinakes is a fast-paced shoot 'em up.\r\n\r\nFeatures:\r\n- 10 stages")).toBe("Akinakes is a fast-paced shoot 'em up.");
  });
  it("첫 문단 앞의 목록 기호를 뗀다", () => {
    expect(xboxDescription(null, "・자극으로 가득한 드넓은 세계\r\n다채로운 시추에이션")).toBe("자극으로 가득한 드넓은 세계");
  });
  it("길면 상한 안의 마지막 문장 끝에서 자른다", () => {
    const sentence = "This is a sentence. ";
    const out = xboxDescription(null, sentence.repeat(40));
    expect(out!.length).toBeLessThanOrEqual(XBOX_DESC_MAX_CHARS);
    expect(out!.endsWith(".")).toBe(true);
  });
  it("둘 다 없으면 null", () => {
    expect(xboxDescription(null, null)).toBeNull();
    expect(xboxDescription("", "  ")).toBeNull();
  });
});
