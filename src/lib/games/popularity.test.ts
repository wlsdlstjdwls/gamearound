// 평가 수를 순번 자리로 바꾸는 규칙 테스트. 숫자는 전부 2026-09-21 카탈로그 실측값이다.
import { describe, expect, it } from "vitest";
import { HLTB_RANK_OFFSET, HLTB_RANK_STEPS, pseudoRankFromHltb, pseudoRankFromReviews, REVIEW_RANK_STEPS } from "./popularity";

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

describe("pseudoRankFromHltb", () => {
  it("기록 인원이 많을수록 앞자리를 받는다", () => {
    // Assassin's Creed II 19,917 | Mario Kart World 1,812 | Kirby Air Riders 326 | Mario Tennis Fever 154
    expect(pseudoRankFromHltb(19917)).toBe(100 + HLTB_RANK_OFFSET);
    expect(pseudoRankFromHltb(1812)).toBe(300 + HLTB_RANK_OFFSET);
    expect(pseudoRankFromHltb(326)).toBe(500 + HLTB_RANK_OFFSET);
    expect(pseudoRankFromHltb(154)).toBe(600 + HLTB_RANK_OFFSET);
  });

  it("자리는 단조다", () => {
    const samples = [19917, 4879, 1985, 841, 466, 249, 123, 64];
    const ranks = samples.map((n) => pseudoRankFromHltb(n));
    for (const r of ranks) expect(r).not.toBeNull();
    for (let i = 1; i < ranks.length; i++) expect(ranks[i]!).toBeGreaterThanOrEqual(ranks[i - 1]!);
  });

  /**
   * 표 아래는 자리를 주지 않는다. 800 자리의 경계가 29명이고 그 아래는 14, 5, 1 이라
   * 변별력이 없다 — 자리를 주면 "1명이 기록한 게임" 이 순서를 주장하게 된다.
   */
  it("표 아래(64명 미만)와 값 없음은 자리가 없다", () => {
    expect(pseudoRankFromHltb(63)).toBeNull();
    expect(pseudoRankFromHltb(0)).toBeNull();
    expect(pseudoRankFromHltb(null)).toBeNull();
    expect(pseudoRankFromHltb(undefined)).toBeNull();
  });

  /**
   * 오프셋이 이 일의 핵심이다. count_comp 는 누적값이라 옛 명작이 계속 쌓는다 —
   * 표 값을 그대로 쓰면 Assassin's Creed II 가 13,364위에서 173위로 뛰어 지금 팔리는 게임 앞에 선다.
   * 실제 순번을 받는 범위(2,000위) 뒤로 통째로 내려야 "한때 인기였던 순" 이 되지 않는다.
   */
  it("환산 자리는 실제 순번 범위(2,000위)보다 반드시 뒤다", () => {
    for (const [, needed] of HLTB_RANK_STEPS) {
      expect(pseudoRankFromHltb(needed)!).toBeGreaterThan(2000);
    }
  });

  it("무료 여부를 보지 않는다 — 평가 수와 달리 기록은 그 방식으로 부풀지 않는다", () => {
    expect(pseudoRankFromHltb(4879)).toBe(100 + HLTB_RANK_OFFSET);
  });
});
