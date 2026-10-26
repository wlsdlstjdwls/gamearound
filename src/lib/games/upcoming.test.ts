import { describe, expect, it } from "vitest";
import { byYear, hasUpcomingFilter, pickUpcomingAddons, pickUpcomingMonth, readUpcomingFilter, upcomingAllHref, upcomingHref, upcomingMonthHref } from "./upcoming";

describe("byYear", () => {
  it("연도가 바뀌는 자리에서만 묶음을 새로 연다", () => {
    const out = byYear([
      { key: "2026-11", total: 21 },
      { key: "2026-12", total: 47 },
      { key: "2027-01", total: 9 },
    ]);
    expect(out).toEqual([
      {
        year: "2026",
        months: [
          { key: "2026-11", month: "11월", total: 21 },
          { key: "2026-12", month: "12월", total: 47 },
        ],
      },
      { year: "2027", months: [{ key: "2027-01", month: "1월", total: 9 }] },
    ]);
  });

  it("빈 목록은 빈 묶음", () => {
    expect(byYear([])).toEqual([]);
  });
});

describe("pickUpcomingMonth", () => {
  const keys = ["2026-10", "2026-11"];
  it("주소가 고른 달이 있으면 그 달", () => expect(pickUpcomingMonth(keys, "2026-11")).toBe("2026-11"));
  it("없거나 목록에 없는 달이면 첫 달", () => {
    expect(pickUpcomingMonth(keys, undefined)).toBe("2026-10");
    expect(pickUpcomingMonth(keys, "2030-01")).toBe("2026-10");
  });
  it("달이 하나도 없으면 undefined", () => expect(pickUpcomingMonth([], "2026-10")).toBeUndefined());
});

describe("upcomingMonthHref", () => {
  it("첫 달은 꼬리 없는 주소 — 같은 화면이 늘 같은 주소", () => expect(upcomingMonthHref("2026-10", "2026-10")).toBe("/upcoming"));
  it("다른 달은 ?month=", () => expect(upcomingMonthHref("2026-11", "2026-10")).toBe("/upcoming?month=2026-11"));
});

describe("pickUpcomingAddons", () => {
  const row = (title: string, releaseDate: string) => ({ title, releaseDate });

  it("사운드트랙, 아트북, 재화, 꾸미기는 거른다", () => {
    const picked = pickUpcomingAddons(
      [
        row("over the hill Soundtrack", "2026-10-14"),
        row("REUNITE! The Artbook", "2026-10-14"),
        row("붉은사막 Enhanced: 미지의 여정", "2026-10-15"),
        row("Fighter Costume Set", "2026-10-16"),
        row("DayZ Badlands", "2026-10-15"),
      ],
      10,
    );
    expect(picked.map((p) => p.title)).toEqual(["붉은사막 Enhanced: 미지의 여정", "DayZ Badlands"]);
  });

  it("인기순으로 상한만큼 고른 뒤 날짜순으로 세우고, 같은 날짜는 인기순을 지킨다", () => {
    const picked = pickUpcomingAddons(
      [row("A", "2026-11-20"), row("B", "2026-10-15"), row("C", "2026-10-15"), row("D", "2026-10-13")],
      3,
    );
    expect(picked.map((p) => p.title)).toEqual(["B", "C", "A"]);
  });
});

describe("readUpcomingFilter", () => {
  it("기본 정렬(출시일순)은 조건으로 치지 않는다", () => expect(readUpcomingFilter({ sort: "date" })).toEqual({ q: undefined, genre: undefined, platform: undefined, sort: undefined }));
  it("모르는 정렬은 버린다", () => expect(readUpcomingFilter({ sort: "price" }).sort).toBeUndefined());
  it("빈칸 검색어는 없는 것", () => expect(readUpcomingFilter({ q: "  " }).q).toBeUndefined());
  it("인기순과 장르를 읽는다", () => expect(readUpcomingFilter({ sort: "popular", genre: "인디" })).toMatchObject({ sort: "popular", genre: "인디" }));
});

describe("upcomingHref", () => {
  it("기본값만이면 꼬리가 없다", () => expect(upcomingHref({}, {})).toBe("/upcoming"));
  it("달을 옮겨도 조건이 따라간다", () => expect(upcomingMonthHref("2026-11", "2026-10", { genre: "RPG" })).toBe("/upcoming?month=2026-11&genre=RPG"));
  it("전체 보기 둘째 쪽", () => expect(upcomingAllHref(2, { sort: "popular" })).toBe("/upcoming?view=all&sort=popular&page=2"));
  it("조건이 있으면 기대작 줄을 걷는다", () => {
    expect(hasUpcomingFilter({})).toBe(false);
    expect(hasUpcomingFilter({ platform: "pc" })).toBe(true);
  });
});
