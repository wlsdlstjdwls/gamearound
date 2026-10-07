import { describe, expect, it } from "vitest";
import { gamesHref } from "@/lib/games-query";
import { ROUTES } from "@/lib/routes";
import { hasExplicitListFilter, personalQuery } from "./query";

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

describe("hasExplicitListFilter", () => {
  it("정렬, 쪽 번호만 있으면 조건이 아니다 — 취향이 걸린다", () => {
    expect(hasExplicitListFilter({ sort: "price", page: 2 })).toBe(false);
    expect(hasExplicitListFilter({ onSale: false, subscription: false, hideFree: false, all: false })).toBe(false);
  });

  it("조건을 하나라도 걸었거나 전체 보기를 골랐으면 취향을 얹지 않는다", () => {
    expect(hasExplicitListFilter({ genre: "RPG" })).toBe(true);
    expect(hasExplicitListFilter({ maxPrice: 0 })).toBe(true);
    expect(hasExplicitListFilter({ all: true })).toBe(true);
  });

  it("전체 보기 표식은 링크를 따라 다닌다 — 걸린 조건을 다 지워도 취향으로 되돌아가지 않는다", () => {
    expect(gamesHref({ all: true, platform: "ps5" }, { platform: undefined })).toBe(`${ROUTES.game}?all=1`);
  });
});
