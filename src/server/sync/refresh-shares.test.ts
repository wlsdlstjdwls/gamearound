// 갱신 자리 나누기 테스트 — Xbox 크론 한 회차(800건, 인기 0.4) 기준.
import { describe, expect, it } from "vitest";
import { refreshShares } from "./refresh-shares";

describe("refreshShares", () => {
  it("Xbox 크론 한 회차: 본편 560 중 인기 320", () => {
    expect(refreshShares(800, 0.4)).toEqual({ viewed: 0, popular: 320, main: 560 });
  });

  it("인기 몫이 없는 소스는 지금처럼 본편 몫만", () => {
    expect(refreshShares(300)).toEqual({ viewed: 0, popular: 0, main: 210 });
  });

  it("인기 몫은 본편 몫을 넘지 않는다", () => {
    expect(refreshShares(100, 0.9)).toEqual({ viewed: 0, popular: 70, main: 70 });
  });

  it("작은 limit 에서도 몫이 0 으로 사라지지 않는다", () => {
    expect(refreshShares(1, 0.4)).toEqual({ viewed: 0, popular: 1, main: 1 });
  });

  it("limit 0 이면 아무것도 안 고른다", () => {
    expect(refreshShares(0, 0.4)).toEqual({ viewed: 0, popular: 0, main: 0 });
  });
});

// 최근 조회된 게임 몫(REFRESH_VIEWED_SHARE 0.2) — 본편 몫 안에서 먼저 뗀다
describe("refreshShares 조회 몫", () => {
  it("Xbox 크론 한 회차: 조회 160 이 먼저고 인기 320 은 그대로 남는다", () => {
    expect(refreshShares(800, 0.4, 0.2)).toEqual({ viewed: 160, popular: 320, main: 560 });
  });

  it("인기 몫이 없는 소스도 조회 몫을 받는다", () => {
    expect(refreshShares(300, 0, 0.2)).toEqual({ viewed: 60, popular: 0, main: 210 });
  });

  it("조회 몫과 인기 몫을 합쳐도 본편 몫을 넘지 않는다", () => {
    expect(refreshShares(100, 0.6, 0.2)).toEqual({ viewed: 20, popular: 50, main: 70 });
  });

  it("작은 limit 에서는 조회 몫이 먼저 자리를 갖는다", () => {
    expect(refreshShares(1, 0.4, 0.2)).toEqual({ viewed: 1, popular: 0, main: 1 });
  });
});
