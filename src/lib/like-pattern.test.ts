// LIKE 무늬 테스트 — 순수 함수만(AGENTS §8).
import { describe, expect, it } from "vitest";
import { containsPattern, escapeLike } from "./like-pattern";

describe("LIKE 무늬", () => {
  it("% _ \\ 를 글자로 바꾼다", () => {
    expect(escapeLike("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });
  it("앞뒤를 다듬고 % 로 감싼다", () => {
    expect(containsPattern("  숲  ")).toBe("%숲%");
  });
});
