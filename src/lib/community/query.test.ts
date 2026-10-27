import { describe, expect, it } from "vitest";
import { boardHref, parseBoardQuery } from "@/lib/community/query";

describe("parseBoardQuery", () => {
  it("빈 주소는 전체글, 최근 7일, 전체 범위, 1쪽", () => {
    expect(parseBoardQuery({})).toEqual({ q: "", scope: "all", tab: "all", period: 7, page: 1, type: null, game: null });
  });

  it("게임 거름은 slug 그대로, 너무 긴 값은 버린다", () => {
    expect(parseBoardQuery({ game: "call-of-duty" }).game).toBe("call-of-duty");
    expect(parseBoardQuery({ game: "x".repeat(201) }).game).toBeNull();
  });

  it("모르는 값은 기본값으로 떨어진다", () => {
    const q = parseBoardQuery({ scope: "nope", period: "9", page: "-3", type: "x", tab: "hot" });
    expect(q).toMatchObject({ scope: "all", period: 7, page: 1, type: null, tab: "all" });
  });

  it("전체 기간(0)은 값으로 읽힌다", () => {
    expect(parseBoardQuery({ tab: "popular", period: "0" }).period).toBe(0);
  });
});

describe("boardHref", () => {
  const base = parseBoardQuery({});
  it("기본값은 주소에서 빠진다", () => {
    expect(boardHref("/board/reviews", base)).toBe("/board/reviews");
  });
  it("조건을 바꾸면 쪽은 1로 돌아간다", () => {
    expect(boardHref("/b", { ...base, page: 3 }, { tab: "popular" })).toBe("/b?tab=popular");
    expect(boardHref("/b", base, { page: 2 })).toBe("/b?page=2");
  });
  it("게임 거름은 조건을 바꿔도 따라간다", () => {
    expect(boardHref("/b", { ...base, game: "elden-ring" }, { tab: "popular" })).toBe("/b?game=elden-ring&tab=popular");
    expect(boardHref("/b", { ...base, game: "elden-ring" }, { game: null })).toBe("/b");
  });
  it("검색 범위는 검색어가 있을 때만 싣는다", () => {
    expect(boardHref("/b", base, { scope: "title" })).toBe("/b");
    expect(boardHref("/b", base, { q: "엘든", scope: "author" })).toBe("/b?q=%EC%97%98%EB%93%A0&scope=author");
  });
});
