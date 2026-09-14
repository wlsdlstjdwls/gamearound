import { describe, expect, it } from "vitest";
import { gamesHref, isGameSort, parseGamesQuery } from "./games-query";
import { pageWindow } from "./pagination";
import { ROUTES } from "./routes";

describe("parseGamesQuery", () => {
  it("빈 쿼리는 1페이지 기본 필터", () => {
    expect(parseGamesQuery({})).toEqual({ q: undefined, platform: undefined, genre: undefined, onSale: false, sort: undefined, page: 1 });
  });

  it("다중 값은 첫 값만 쓴다", () => {
    expect(parseGamesQuery({ q: ["철권", "무시됨"] }).q).toBe("철권");
  });

  it.each([
    ["0", 1],
    ["-3", 1],
    ["abc", 1],
    ["2.7", 2],
    ["5", 5],
  ])("page=%s → %s", (raw, expected) => {
    expect(parseGamesQuery({ page: raw }).page).toBe(expected);
  });

  it("모르는 정렬 키는 버린다", () => {
    expect(parseGamesQuery({ sort: "drop; --" }).sort).toBeUndefined();
    expect(parseGamesQuery({ sort: "price" }).sort).toBe("price");
  });

  it("sale 은 정확히 '1' 일 때만 켜진다", () => {
    expect(parseGamesQuery({ sale: "1" }).onSale).toBe(true);
    expect(parseGamesQuery({ sale: "true" }).onSale).toBe(false);
  });

  it("공백뿐인 값은 없는 것으로 접는다", () => {
    expect(parseGamesQuery({ genre: "   " }).genre).toBeUndefined();
  });
});

describe("isGameSort", () => {
  it.each([["discount", true], ["price", true], ["release", true], ["title", true], ["", false], ["rating", false], [undefined, false]])(
    "%s → %s",
    (v, expected) => {
      expect(isGameSort(v as string | undefined)).toBe(expected);
    },
  );
});

describe("gamesHref", () => {
  it("기본값만 있으면 쿼리스트링 없이 /games", () => {
    expect(gamesHref({ sort: "discount", page: 1, onSale: false })).toBe(ROUTES.game);
  });

  it("비기본값만 주소에 싣는다", () => {
    expect(gamesHref({ platform: "steam", sort: "price", page: 3, onSale: true })).toBe(
      "/games?platform=steam&sale=1&sort=price&page=3",
    );
  });

  it("patch 가 현재 필터를 덮어쓴다", () => {
    expect(gamesHref({ platform: "steam", page: 5 }, { platform: "xbox", page: 1 })).toBe("/games?platform=xbox");
  });

  it("patch 로 undefined 를 주면 그 필터가 빠진다", () => {
    expect(gamesHref({ platform: "steam", genre: "RPG" }, { platform: undefined })).toBe("/games?genre=RPG");
  });

  it("한글 장르는 인코딩된다", () => {
    expect(gamesHref({ genre: "액션" })).toBe(`/games?genre=${encodeURIComponent("액션")}`);
  });

  it("왕복: gamesHref 로 만든 주소를 parseGamesQuery 가 그대로 복원한다", () => {
    const filter = { q: "엘든 링", platform: "steam", genre: "RPG", onSale: true, sort: "title" as const, page: 4 };
    const sp = Object.fromEntries(new URLSearchParams(gamesHref(filter).split("?")[1]));
    expect(parseGamesQuery(sp)).toEqual(filter);
  });
});

describe("pageWindow", () => {
  it("1페이지뿐이면 [1]", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 0)).toEqual([1]);
  });

  it("페이지가 적으면 생략 없이 전부", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("가운데에서는 양쪽이 생략된다", () => {
    expect(pageWindow(10, 20)).toEqual([1, null, 8, 9, 10, 11, 12, null, 20]);
  });

  it("첫, 끝 페이지는 항상 남는다", () => {
    const w = pageWindow(20, 20);
    expect(w[0]).toBe(1);
    expect(w[w.length - 1]).toBe(20);
  });

  it("창과 끝이 붙으면 생략 기호를 넣지 않는다", () => {
    expect(pageWindow(3, 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
