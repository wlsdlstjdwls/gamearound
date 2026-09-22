import { describe, expect, it } from "vitest";
import { gamesHref } from "@/lib/games-query";
import { ROUTES } from "@/lib/routes";
import { personalQuery } from "./query";

describe("personalQuery", () => {
  it("고른 것이 없으면 아무것도 거르지 않는다", () => {
    expect(personalQuery({})).toEqual({ platform: undefined, genre: undefined });
    expect(gamesHref(personalQuery({ platforms: [], genreNames: [] }))).toBe(ROUTES.game);
  });

  it("플랫폼 여럿은 목록이 읽는 쉼표 형식으로 잇는다", () => {
    expect(personalQuery({ platforms: ["steam", "ps5"] }).platform).toBe("steam,ps5");
  });

  it("장르는 첫 번째 하나만 싣는다 — 목록의 genre 칸이 값 하나만 받는다", () => {
    expect(personalQuery({ genreNames: ["액션", "RPG"] }).genre).toBe("액션");
  });

  it("세는 질의와 링크가 같은 값에서 나온다", () => {
    const q = personalQuery({ platforms: ["switch"], genreNames: ["퍼즐"] });
    expect(gamesHref(q)).toBe(`${ROUTES.game}?platform=switch&genre=${encodeURIComponent("퍼즐")}`);
  });
});
