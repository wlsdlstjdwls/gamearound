// 갱신 자리 나누기 테스트 — Xbox 크론 한 회차(800건, 인기 0.4) 기준.
import { describe, expect, it } from "vitest";
import { refreshShares } from "./refresh-shares";

describe("refreshShares", () => {
  it("Xbox 크론 한 회차: 본편 560 중 인기 320", () => {
    expect(refreshShares(800, 0.4)).toEqual({ popular: 320, main: 560 });
  });

  it("인기 몫이 없는 소스는 지금처럼 본편 몫만", () => {
    expect(refreshShares(300)).toEqual({ popular: 0, main: 210 });
  });

  it("인기 몫은 본편 몫을 넘지 않는다", () => {
    expect(refreshShares(100, 0.9)).toEqual({ popular: 70, main: 70 });
  });

  it("작은 limit 에서도 몫이 0 으로 사라지지 않는다", () => {
    expect(refreshShares(1, 0.4)).toEqual({ popular: 1, main: 1 });
  });

  it("limit 0 이면 아무것도 안 고른다", () => {
    expect(refreshShares(0, 0.4)).toEqual({ popular: 0, main: 0 });
  });
});
