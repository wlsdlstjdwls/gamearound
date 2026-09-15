// 유저 점수 변환, 문구 — 척도가 다른 값을 한 축에 두고도 뜻을 잃지 않는지 본다.
import { describe, expect, it } from "vitest";
import { countText, ratioToScore, scoreToStars, starsToScore, userScoreNoteText, userScoreValueText } from "./user-score";

describe("starsToScore / scoreToStars", () => {
  it("별점을 100점 축으로 옮겼다가 되돌려도 값이 그대로다", () => {
    for (const stars of [0, 1.5, 3.9, 4.4, 5]) {
      const score = starsToScore(stars);
      expect(score).not.toBeNull();
      expect(scoreToStars(score as number)).toBe(stars);
    }
  });

  it("척도를 벗어난 값은 받지 않는다 — 스토어가 이상한 값을 준 것이다", () => {
    expect(starsToScore(-1)).toBeNull();
    expect(starsToScore(5.1)).toBeNull();
    expect(starsToScore(Number.NaN)).toBeNull();
  });
});

describe("ratioToScore", () => {
  it("긍정 비율은 그대로 정수로 들어간다", () => {
    expect(ratioToScore(94)).toBe(94);
    expect(ratioToScore(0)).toBe(0);
  });

  it("0~100 밖은 받지 않는다", () => {
    expect(ratioToScore(101)).toBeNull();
    expect(ratioToScore(-3)).toBeNull();
  });
});

describe("userScoreValueText", () => {
  it("척도에 따라 다른 말로 적는다 — 같은 78 이어도 뜻이 다르다", () => {
    expect(userScoreValueText(78, "positive_ratio")).toBe("78%");
    expect(userScoreValueText(78, "star_average")).toBe("3.9");
  });
});

describe("userScoreNoteText", () => {
  it("무엇을 잰 값인지 말한다", () => {
    expect(userScoreNoteText("positive_ratio", 0)).toBe("긍정 비율");
    expect(userScoreNoteText("star_average", 0)).toBe("5점 만점");
  });

  it("표본 수가 있으면 함께 적는다 — 100명의 90점과 5만명의 90점은 다른 값이다", () => {
    expect(userScoreNoteText("positive_ratio", 487684)).toBe("긍정 비율 | 48.8만명");
  });
});

describe("countText", () => {
  it("자릿수만 읽히면 된다", () => {
    expect(countText(57)).toBe("57명");
    expect(countText(1240)).toBe("1.2천명");
    expect(countText(57919)).toBe("5.8만명");
  });
});
