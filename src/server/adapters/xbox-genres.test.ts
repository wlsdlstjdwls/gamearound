// Xbox 갈래 → 장르 옮기기
import { describe, expect, it } from "vitest";
import { xboxGenres } from "./xbox-genres";

describe("xboxGenres", () => {
  it("갈래를 우리 어휘로 옮기고 겹치면 하나만 둔다", () => {
    expect(xboxGenres(["Action & adventure", "Role playing", "Platformer"])).toEqual(["액션", "어드벤처", "RPG"]);
  });
  it("모르는 갈래, 빈 값은 버린다", () => {
    expect(xboxGenres(["Multi-Player Online Battle Arena"])).toEqual([]);
    expect(xboxGenres(null)).toEqual([]);
  });
});
