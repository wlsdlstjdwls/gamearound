import { describe, expect, it } from "vitest";
import { POPULAR_GENRE_MIN_VIEWS, rankGenresByViews } from "./popular-genres";

const rows = [
  { slug: "a", genre: "RPG" },
  { slug: "a", genre: "액션" },
  { slug: "b", genre: "퍼즐" },
  { slug: "c", genre: "레이싱" },
];

describe("rankGenresByViews", () => {
  it("조회 합이 큰 장르부터 세운다", () => {
    const counts = new Map([["a", 30], ["b", 50]]);
    expect(rankGenresByViews(rows, counts, ["액션", "RPG", "퍼즐", "레이싱"], 3)).toEqual(["퍼즐", "액션", "RPG"]);
  });

  it("문턱 아래 장르는 빼고 빈자리를 게임 수 순서로 채운다", () => {
    const counts = new Map([["b", POPULAR_GENRE_MIN_VIEWS], ["c", POPULAR_GENRE_MIN_VIEWS - 1]]);
    expect(rankGenresByViews(rows, counts, ["액션", "RPG", "퍼즐", "레이싱"], 3)).toEqual(["퍼즐", "액션", "RPG"]);
  });

  it("조회가 없으면 게임 수 순서 그대로다", () => {
    expect(rankGenresByViews(rows, new Map(), ["액션", "RPG"], 4)).toEqual(["액션", "RPG"]);
  });

  it("범위(할인 목록 등)에 없는 장르는 세지 않는다", () => {
    const counts = new Map([["c", 100]]);
    expect(rankGenresByViews(rows, counts, ["액션", "RPG"], 2)).toEqual(["액션", "RPG"]);
  });
});
