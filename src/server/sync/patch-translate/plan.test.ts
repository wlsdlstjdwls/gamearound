import { describe, expect, it } from "vitest";
import { afterFailure, fitsBudget, isKoreanBody, planBody, spend } from "./plan";

const LIMITS = { daily: 1000, monthly: 5000, reserve: 100 };

describe("isKoreanBody", () => {
  it("한글이 없으면 거짓", () => {
    expect(isKoreanBody("Fixed a crash")).toBe(false);
  });
  it("영어 공지에 언어 이름 한 번은 한국어 공지가 아니다", () => {
    expect(isKoreanBody("Added Korean (한국어) localization and fixed many bugs in the menu")).toBe(false);
  });
  it("한글이 대부분이면 참", () => {
    expect(isKoreanBody("## 수정 사항\n- 접속 오류를 고쳤어요\n- UI 개선")).toBe(true);
  });
});

describe("planBody", () => {
  const note = { title: "Patch 1.2", titleKo: null };

  it("그림뿐이면 empty", () => {
    expect(planBody("[img]{STEAM_CLAN_IMAGE}/a.png[/img]", note)).toEqual({ kind: "empty" });
  });

  it("한국어 본문은 옮기지 않는다", () => {
    expect(planBody("[p]버그를 고쳤어요. 접속이 더 안정적이에요.[/p]", note)).toEqual({ kind: "source_ko", body: "버그를 고쳤어요. 접속이 더 안정적이에요." });
  });

  it("상한을 넘으면 원문만", () => {
    const plan = planBody("x".repeat(50), note, 10);
    expect(plan.kind).toBe("too_long");
  });

  it("옮길 글은 본문과 제목 글자 수를 함께 센다", () => {
    const plan = planBody("[list][*]Fixed bug[/list]", note);
    expect(plan).toMatchObject({ kind: "translate", body: "- Fixed bug", title: "Patch 1.2", chars: "- Fixed bug".length + "Patch 1.2".length });
  });

  it("한글 제목이 이미 있으면 제목은 안 옮긴다", () => {
    const plan = planBody("Fixed bug", { title: "Patch", titleKo: "패치" });
    expect(plan).toMatchObject({ kind: "translate", title: null, chars: "Fixed bug".length });
  });
});

describe("fitsBudget", () => {
  it("하루, 달, DeepL 남은 몫을 모두 본다", () => {
    expect(fitsBudget({ usedToday: 900, usedMonth: 0, deeplRemaining: null }, 100, LIMITS)).toBe(true);
    expect(fitsBudget({ usedToday: 901, usedMonth: 0, deeplRemaining: null }, 100, LIMITS)).toBe(false);
    expect(fitsBudget({ usedToday: 0, usedMonth: 4950, deeplRemaining: null }, 100, LIMITS)).toBe(false);
    expect(fitsBudget({ usedToday: 0, usedMonth: 0, deeplRemaining: 150 }, 100, LIMITS)).toBe(false);
    expect(fitsBudget({ usedToday: 0, usedMonth: 0, deeplRemaining: 300 }, 100, LIMITS)).toBe(true);
  });

  it("spend 는 세 값을 함께 줄인다", () => {
    expect(spend({ usedToday: 1, usedMonth: 2, deeplRemaining: 10 }, 3)).toEqual({ usedToday: 4, usedMonth: 5, deeplRemaining: 7 });
    expect(spend({ usedToday: 0, usedMonth: 0, deeplRemaining: null }, 3).deeplRemaining).toBeNull();
  });
});

describe("afterFailure", () => {
  it("한도에 닿으면 failed 로 접는다", () => {
    expect(afterFailure(0, 3)).toEqual({ count: 1, status: null });
    expect(afterFailure(2, 3)).toEqual({ count: 3, status: "failed" });
  });
});
