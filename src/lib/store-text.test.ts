// 제목, 소개글 다듬기 — 표본은 2026-10-27 운영 DB 에 실제로 들어 있던 값이다.
import { describe, expect, it } from "vitest";
import { cleanStoreTitle, usableDescription } from "./store-text";

describe("cleanStoreTitle", () => {
  it.each([
    ["HELLDIVERS™ 2", "HELLDIVERS 2"],
    ["Sniper Elite 5 PS4™ & PS5™", "Sniper Elite 5"],
    ["콜 오브 듀티®: 블랙 옵스 콜드 워 - 세대 호환 번들 PS4™ & PS5®", "콜 오브 듀티: 블랙 옵스 콜드 워 - 세대 호환 번들"],
    ["Dead by Daylight (영어판/일어판) PS4® & PS5®", "Dead by Daylight"],
    ["PS4 및 PS5용 EA SPORTS FC™", "EA SPORTS FC"],
    ["Battlefield™ 6와 REDSEC용 500 BFC", "Battlefield 6와 REDSEC용 500 BFC"],
    ["Carnival Games® (영어판/일어판)", "Carnival Games"],
  ])("%s", (input, expected) => {
    expect(cleanStoreTitle(input)).toBe(expected);
  });

  it("언어가 아닌 괄호와 기기 이름이 든 정식 이름은 남긴다", () => {
    expect(cleanStoreTitle("Some Game (디럭스판)")).toBe("Some Game (디럭스판)");
    expect(cleanStoreTitle("Rooms: The Unsolvable Puzzle (게임)")).toBe("Rooms: The Unsolvable Puzzle (게임)");
    expect(cleanStoreTitle("ASTRAL CHAIN (애스트럴 체인)")).toBe("ASTRAL CHAIN (애스트럴 체인)");
    expect(cleanStoreTitle("PS5 Controller Tester")).toBe("PS5 Controller Tester");
  });

  it("다 걷혀 비면 원래 값", () => {
    expect(cleanStoreTitle("PS5")).toBe("PS5");
    expect(cleanStoreTitle(null)).toBeNull();
  });
});

describe("usableDescription", () => {
  it("중국어 원문은 비운다", () => {
    expect(usableDescription("《決勝時刻®》體驗支援《現代戰爭® 4》、《黑色行動 7》和《決勝時刻®：現代戰域™》。")).toBeNull();
  });

  it("한국어, 영어는 남긴다", () => {
    expect(usableDescription("콜 오브 듀티®:블랙 옵스 6는 영화 같은 캠페인")).toBe("콜 오브 듀티®:블랙 옵스 6는 영화 같은 캠페인");
    expect(usableDescription("Call of Duty®: Black Ops takes you deep")).toBe("Call of Duty®: Black Ops takes you deep");
  });
});
