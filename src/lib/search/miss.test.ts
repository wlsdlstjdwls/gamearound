import { describe, expect, it } from "vitest";
import { normalizeMissQuery } from "./miss";

describe("normalizeMissQuery", () => {
  it("대소문자와 띄어쓰기만 접는다", () => {
    expect(normalizeMissQuery("  Hollow   KNIGHT ")).toBe("hollow knight");
    expect(normalizeMissQuery("할로우 나이트")).toBe("할로우 나이트");
  });
  it("너무 짧거나 긴 말은 세지 않는다", () => {
    expect(normalizeMissQuery("a")).toBeNull();
    expect(normalizeMissQuery("가".repeat(61))).toBeNull();
  });
});
