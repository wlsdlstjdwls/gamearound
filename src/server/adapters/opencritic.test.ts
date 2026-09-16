// OpenCritic 파서 테스트 — fixture 기반, 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import { OPENCRITIC_API_URL, parseOpenCriticGame, parseOpenCriticSearch } from "./opencritic";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8"));

describe("parseOpenCriticGame", () => {
  it("topCriticScore 를 반올림해 scores.opencritic 에 넣는다", () => {
    const snap = parseOpenCriticGame(fixture("opencritic-game.json"));
    expect(snap.scores?.opencritic).toBe(86);
    expect(snap.genres).toEqual(["RPG", "Action"]);
  });
  it("점수 -1/null 은 null", () => {
    expect(parseOpenCriticGame({ id: 1, name: "x", topCriticScore: -1 }).scores?.opencritic).toBeNull();
    expect(parseOpenCriticGame({ id: 1, name: "x", topCriticScore: null }).scores?.opencritic).toBeNull();
  });
  it("형식 오류는 AdapterError", () => {
    expect(() => parseOpenCriticGame({ nope: true })).toThrowError(AdapterError);
  });
});

describe("parseOpenCriticSearch", () => {
  it("검색 응답 → 후보", () => {
    const list = parseOpenCriticSearch(fixture("opencritic-search.json"));
    expect(list).toHaveLength(2);
    expect(list[0].externalId).toBe("9136");
    expect(list[0].url).toBe("https://opencritic.com/game/9136/cyberpunk-2077");
  });
});

describe("RapidAPI 주소", () => {
  // /api 접두를 붙이면 모든 호출이 404 로 돌아온다(2026-09-16 실측). 키가 없어 여태 안 드러났다
  it("경로에 /api 접두가 없다", () => {
    expect(OPENCRITIC_API_URL).toBe("https://opencritic-api.p.rapidapi.com");
    expect(OPENCRITIC_API_URL).not.toContain("/api");
  });
});
