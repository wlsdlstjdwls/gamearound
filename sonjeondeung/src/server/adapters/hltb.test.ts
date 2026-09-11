// HLTB 파서 테스트 — fixture 기반, 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import { parseHltbGamePage, parseHltbSearch, parseHoursText, secondsToHours } from "./hltb";

const fixture = (name: string): string => readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");

describe("parseHltbGamePage", () => {
  it("__NEXT_DATA__ 의 초 단위 값을 시간(소수 1자리)으로 변환", () => {
    const snap = parseHltbGamePage(fixture("hltb-game.html"));
    expect(snap.playtime).toEqual({ main: 25.5, extra: 62, completionist: 106 });
  });

  it("__NEXT_DATA__ 가 없으면 시간 박스 텍스트를 파싱 (½, Mins, -- 처리)", () => {
    const snap = parseHltbGamePage(fixture("hltb-game-no-nextdata.html"));
    expect(snap.playtime).toEqual({ main: 12, extra: null, completionist: 0.8 });
  });

  it("아무것도 못 찾으면 재시도 불가 AdapterError (마크업 변경 감지)", () => {
    expect(() => parseHltbGamePage("<html><body><p>nothing</p></body></html>")).toThrowError(AdapterError);
  });
});

describe("parseHoursText / secondsToHours", () => {
  it("텍스트 → 시간", () => {
    expect(parseHoursText("11½ Hours")).toBe(11.5);
    expect(parseHoursText("1 Hour")).toBe(1);
    expect(parseHoursText("30 Mins")).toBe(0.5);
    expect(parseHoursText("--")).toBeNull();
    expect(parseHoursText("")).toBeNull();
  });
  it("초 → 시간, 0 은 null", () => {
    expect(secondsToHours(5400)).toBe(1.5);
    expect(secondsToHours(0)).toBeNull();
    expect(secondsToHours(undefined)).toBeNull();
  });
});

describe("parseHltbSearch", () => {
  it("검색 응답 → 후보", () => {
    const list = parseHltbSearch(JSON.parse(fixture("hltb-search.json")));
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ externalId: "2127", title: "Cyberpunk 2077", url: "https://howlongtobeat.com/game/2127" });
  });
  it("형식이 다르면 빈 배열", () => {
    expect(parseHltbSearch({ foo: 1 })).toEqual([]);
  });
});
