// Metacritic 파서 테스트 — fixture 기반(backend.metacritic.com 실응답; composer 는 product 컴포넌트만 남긴 축약본), 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import { parseMetacriticGame, parseMetacriticSearch } from "./metacritic";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8"));

describe("parseMetacriticGame", () => {
  it("product 컴포넌트의 criticScoreSummary.score → scores.metacritic (Elden Ring 96)", () => {
    const snap = parseMetacriticGame(fixture("metacritic-game-trimmed.json"), "elden-ring");
    expect(snap.scores?.metacritic).toBe(96);
    expect(snap.genres).toContain("Action RPG");
  });
  it("점수 null/0(tbd) 은 null", () => {
    const raw = { components: [{ meta: { componentName: "product" }, data: { item: { criticScoreSummary: { score: null } } } }] };
    expect(parseMetacriticGame(raw, "x").scores?.metacritic).toBeNull();
    const zero = { components: [{ meta: { componentName: "product" }, data: { item: { criticScoreSummary: { score: 0 } } } }] };
    expect(parseMetacriticGame(zero, "x").scores?.metacritic).toBeNull();
  });
  it("product 컴포넌트가 없으면 게임 없음(재시도 없음) — 존재하지 않는 slug 도 HTTP 200 으로 온다", () => {
    try {
      parseMetacriticGame({ components: [] }, "no-such-game");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AdapterError);
      expect((e as AdapterError).retryable).toBe(false);
    }
  });
  it("형식 오류는 AdapterError", () => {
    expect(() => parseMetacriticGame("nope", "x")).toThrowError(AdapterError);
  });
});

describe("parseMetacriticSearch", () => {
  it("게임(typeId 13)만 후보로, externalId 는 slug", () => {
    const list = parseMetacriticSearch(fixture("metacritic-search.json"));
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list[0]).toEqual({ externalId: "elden-ring", title: "Elden Ring", url: "https://www.metacritic.com/game/elden-ring/" });
  });
  it("게임이 아닌 항목은 제외", () => {
    const raw = { data: { items: [{ typeId: 1, title: "Movie", slug: "movie" }, { typeId: 13, title: "Game", slug: "game" }] } };
    expect(parseMetacriticSearch(raw).map((c) => c.externalId)).toEqual(["game"]);
  });
});
