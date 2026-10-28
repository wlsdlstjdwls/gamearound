import { describe, expect, it } from "vitest";
import { bestRank, rankPosition, topPercent } from "./stats-rank";

const r = (views: number | null, likes: number | null) => ({ ranks: { views, plays: null, likes, comments: null } });

describe("bestRank", () => {
  it("내 게임 중 가장 작은 순위", () => {
    expect(bestRank([r(5, null), r(2, 7), r(null, 3)], "views")).toBe(2);
    expect(bestRank([r(5, null), r(2, 7), r(null, 3)], "likes")).toBe(3);
  });
  it("순위가 하나도 없으면 null", () => {
    expect(bestRank([r(null, null)], "views")).toBeNull();
    expect(bestRank([], "views")).toBeNull();
  });
});

describe("topPercent", () => {
  it("올림해서 1~100 사이", () => {
    expect(topPercent(3, 11)).toBe(28);
    expect(topPercent(1, 1000)).toBe(1);
    expect(topPercent(11, 11)).toBe(100);
  });
  it("모집단이 없으면 null", () => {
    expect(topPercent(1, 0)).toBeNull();
  });
});

describe("rankPosition", () => {
  it("1위는 맨 앞, 꼴찌는 맨 끝", () => {
    expect(rankPosition(1, 11)).toBe(0);
    expect(rankPosition(11, 11)).toBe(1);
    expect(rankPosition(6, 11)).toBe(0.5);
  });
  it("모집단이 하나면 맨 앞", () => {
    expect(rankPosition(1, 1)).toBe(0);
  });
});
