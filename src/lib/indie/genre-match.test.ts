import { describe, expect, it } from "vitest";
import { indieGenresOf } from "@/lib/indie/genre-match";

describe("indieGenresOf", () => {
  it("카탈로그 장르 이름을 인디 장르 키로 맞춘다", () => {
    expect(indieGenresOf(["액션", "RPG", "인디"])).toEqual(["action", "rpg"]);
  });
  it("기타는 맞추지 않는다", () => {
    expect(indieGenresOf(["기타"])).toEqual([]);
  });
});
