// 평가 수를 순번 자리로 바꾸는 규칙 테스트. 숫자는 전부 2026-09-21 카탈로그 실측값이다.
import { describe, expect, it } from "vitest";
import { pseudoRankFromReviews, REVIEW_RANK_STEPS } from "./popularity";

describe("pseudoRankFromReviews", () => {
  it("평가 수가 많을수록 앞자리를 받는다", () => {
    // Halo: Master Chief 컬렉션 239,603 | Gears Of War 4 107,087 | Celeste 132,072
    expect(pseudoRankFromReviews(239603, true)).toBe(100);
    expect(pseudoRankFromReviews(132072, true)).toBe(200);
    expect(pseudoRankFromReviews(107087, true)).toBe(200);
    expect(pseudoRankFromReviews(20000, true)).toBe(500);
  });

  it("자리는 단조다 — 평가가 많은 쪽이 뒷자리를 받는 일은 없다", () => {
    const samples = [1273176, 239603, 107087, 46879, 12393, 2231, 384];
    const ranks = samples.map((r) => pseudoRankFromReviews(r, true));
    for (const r of ranks) expect(r).not.toBeNull();
    for (let i = 1; i < ranks.length; i++) expect(ranks[i]!).toBeGreaterThanOrEqual(ranks[i - 1]!);
  });

  /**
   * 무료 게임에는 자리를 주지 않는다. Xbox 전용 무료 상위가 Candy Crush Saga(127만),
   * Microsoft Mahjong(38만), Microsoft Sudoku(15만)이고 Forza Horizon 4 가 일곱 번째다.
   * 값으로 캐주얼을 가르려 해도 안 된다 — Crossout, Vigor, Trove 는 진짜 무료 게임이다.
   */
  it("무료 게임에는 자리를 주지 않는다", () => {
    expect(pseudoRankFromReviews(1273176, false)).toBeNull();
    expect(pseudoRankFromReviews(383877, false)).toBeNull();
  });

  /** 1,300 아래는 경계가 평가 93, 4 로 떨어져 변별력이 없다. 자리를 주는 것이 거짓말이 된다 */
  it("표 아래로 떨어지는 평가 수에는 자리가 없다", () => {
    expect(pseudoRankFromReviews(383, true)).toBeNull();
    expect(pseudoRankFromReviews(0, true)).toBeNull();
  });

  it("값을 모르면 판단하지 않는다 — 무료(0)와 섞지 않는다", () => {
    expect(pseudoRankFromReviews(null, true)).toBeNull();
    expect(pseudoRankFromReviews(undefined, true)).toBeNull();
    expect(pseudoRankFromReviews(Number.NaN, true)).toBeNull();
  });

  it("표는 자리가 커질수록 경계가 낮아지는 내림차순이다", () => {
    for (let i = 1; i < REVIEW_RANK_STEPS.length; i++) {
      expect(REVIEW_RANK_STEPS[i][0]).toBeGreaterThan(REVIEW_RANK_STEPS[i - 1][0]);
      expect(REVIEW_RANK_STEPS[i][1]).toBeLessThan(REVIEW_RANK_STEPS[i - 1][1]);
    }
  });
});
