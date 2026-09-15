import { describe, expect, it } from "vitest";
import { gamesHref, isGameSort, parseGamesQuery } from "./games-query";
import { pageWindow } from "./pagination";
import { ROUTES } from "./routes";

describe("parseGamesQuery", () => {
  it("빈 쿼리는 1페이지 기본 필터", () => {
    expect(parseGamesQuery({})).toEqual({
      q: undefined, platform: undefined, genre: undefined, onSale: false, minDiscount: undefined,
      company: undefined, subscription: false, sort: undefined, page: 1,
    });
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

  it("최소 할인율은 정해진 단만 받는다", () => {
    expect(parseGamesQuery({ off: "30" }).minDiscount).toBe(30);
    expect(parseGamesQuery({ off: "70" }).minDiscount).toBe(70);
    // 단에 없는 값, 숫자가 아닌 값은 조용히 버린다 — 캐시 키가 값마다 쪼개지지 않게
    expect(parseGamesQuery({ off: "33" }).minDiscount).toBeUndefined();
    expect(parseGamesQuery({ off: "drop; --" }).minDiscount).toBeUndefined();
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

  it("최소 할인율이 서면 sale 은 싣지 않는다 — 같은 축이라 둘 다 담으면 뜻이 겹친다", () => {
    expect(gamesHref({ onSale: true, minDiscount: 50 })).toBe("/games?off=50");
    expect(gamesHref({ onSale: true })).toBe("/games?sale=1");
    expect(gamesHref({ minDiscount: 30 }, { minDiscount: undefined })).toBe(ROUTES.game);
  });

  it("왕복: gamesHref 로 만든 주소를 parseGamesQuery 가 그대로 복원한다", () => {
    const filter = {
      q: "엘든 링", platform: "steam", genre: "RPG", onSale: true,
      company: "fromsoftware", subscription: true, sort: "title" as const, page: 4,
    };
    const sp = Object.fromEntries(new URLSearchParams(gamesHref(filter).split("?")[1]));
    expect(parseGamesQuery(sp)).toEqual(filter);

    const withOff = { ...filter, onSale: false, minDiscount: 70 as const };
    const sp2 = Object.fromEntries(new URLSearchParams(gamesHref(withOff).split("?")[1]));
    expect(parseGamesQuery(sp2)).toEqual(withOff);
  });

  it("회사, 구독 필터가 주소에 실린다", () => {
    expect(gamesHref({ company: "ubisoft" })).toBe("/games?company=ubisoft");
    expect(gamesHref({ subscription: true })).toBe("/games?sub=1");
    // 기본값(false)은 주소에 남기지 않는다 — 같은 화면이 두 개의 주소를 갖지 않게
    expect(gamesHref({ subscription: false })).toBe(ROUTES.game);
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
