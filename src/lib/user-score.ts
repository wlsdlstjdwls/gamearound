// 유저 점수 — 스토어 이용자가 매긴 점수를 한 축으로 다루기 위한 변환, 문구.
//
// 저장은 0~100 정수 하나에 하고 뜻은 kind 가 들고 있다(schema 의 user_score 주석).
// 별점을 20배 해서 넣는 이유는 "정규화" 가 아니라 **비교 가능하게** 두기 위해서다 —
// 화면에 적을 때는 kind 를 보고 원래 말로 되돌린다. 긍정 비율과 평균 별점은 다른 사실이라
// 같은 말로 적으면 거짓이 된다.
import type { UserScoreKind } from "@/server/db/schema";

/** 5점 만점을 100점 축으로 옮기는 배수. 소수 한 자리까지만 오는 값이라 되돌릴 때 손실이 없다 */
export const STAR_SCALE = 20;
/** 별점 만점 */
export const STAR_MAX = 5;

/** 평균 별점(0~5) → 저장값(0~100). 범위를 벗어난 값은 null — 스토어가 이상한 값을 준 것이다 */
export function starsToScore(average: number): number | null {
  if (!Number.isFinite(average) || average < 0 || average > STAR_MAX) return null;
  return Math.round(average * STAR_SCALE);
}

/** 저장값 → 평균 별점. 소수 한 자리 */
export function scoreToStars(value: number): number {
  return Math.round((value / STAR_SCALE) * 10) / 10;
}

/** 긍정 비율(0~100) → 저장값. 범위를 벗어나면 null */
export function ratioToScore(percent: number): number | null {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  return Math.round(percent);
}

/**
 * 값 자리에 적을 짧은 말. 척도가 다르므로 단위까지 함께 말한다.
 *   positive_ratio -> "94%"
 *   star_average   -> "3.9"
 */
export function userScoreValueText(value: number, kind: UserScoreKind): string {
  return kind === "star_average" ? String(scoreToStars(value)) : `${Math.round(value)}%`;
}

/** 값 밑에 적을 단서. "무엇을 잰 값인지" 와 "몇 명이 만든 값인지" 를 말한다 */
export function userScoreNoteText(kind: UserScoreKind, count: number | null): string {
  const what = kind === "star_average" ? `${STAR_MAX}점 만점` : "긍정 비율";
  if (!count || count <= 0) return what;
  return `${what} | ${countText(count)}`;
}

/** 사람 수는 자릿수만 읽히면 된다 — 487,684 보다 "48.7만" 이 한눈에 크기를 말한다 */
export function countText(count: number): string {
  if (count >= 10_000) {
    const man = Math.round(count / 1000) / 10;
    return `${man}만명`;
  }
  if (count >= 1000) return `${Math.round(count / 100) / 10}천명`;
  return `${count}명`;
}
