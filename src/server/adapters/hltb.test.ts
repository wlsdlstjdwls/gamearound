// HLTB 파서 테스트 — fixture 기반, 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import { buildHltbSearchBody, HLTB_SEARCH_INIT_URL, HLTB_SEARCH_URL, parseHltbGamePage, parseHltbSearch, parseHoursText, secondsToHours } from "./hltb";

const fixture = (name: string): string => readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");

/** __NEXT_DATA__ 한 벌만 담은 최소 페이지. 필드 하나를 재는 데 고정 파일을 늘리지 않는다 */
const nextDataHtml = (game: Record<string, number>): string =>
  `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { pageProps: { game: { data: { game: [game] } } } },
  })}</script></body></html>`;

describe("parseHltbGamePage", () => {
  it("__NEXT_DATA__ 의 초 단위 값을 시간(소수 1자리)으로 변환", () => {
    const snap = parseHltbGamePage(fixture("hltb-game.html"));
    expect(snap.playtime).toEqual({ main: 25.5, extra: 62, completionist: 106 });
  });

  it("__NEXT_DATA__ 가 없으면 시간 박스 텍스트를 파싱 (½, Mins, -- 처리)", () => {
    const snap = parseHltbGamePage(fixture("hltb-game-no-nextdata.html"));
    expect(snap.playtime).toEqual({ main: 12, extra: null, completionist: 0.8 });
  });

  it("제보가 없어 값이 전부 0 이면 에러가 아니라 전부 null (2026-09-13 hltb partial 원인)", () => {
    const snap = parseHltbGamePage(fixture("hltb-game-no-data.html"));
    expect(snap.playtime).toEqual({ main: null, extra: null, completionist: null });
  });

  it("count_comp 를 기록 인원수로 싣는다 — 인기 축의 재료(schema 의 games.hltbLoggedCount)", () => {
    expect(parseHltbGamePage(nextDataHtml({ comp_main: 3600, count_comp: 21465 })).loggedCount).toBe(21465);
  });

  it("count_comp 가 0 이면 0 그대로다 — null 로 접으면 '아무도 기록 안 함'이 '값 없음'이 된다", () => {
    expect(parseHltbGamePage(nextDataHtml({ comp_main: 3600, count_comp: 0 })).loggedCount).toBe(0);
  });

  it("count_comp 가 없으면 null — sync 가 이 값으로 기존 값을 덮지 않는다(§7)", () => {
    expect(parseHltbGamePage(fixture("hltb-game.html")).loggedCount).toBeNull();
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
  it("검색 응답 → 후보 (2026-09-12 실응답 픽스처)", () => {
    const list = parseHltbSearch(JSON.parse(fixture("hltb-search.json")));
    expect(list).toHaveLength(3);
    expect(list[0]).toEqual({ externalId: "68151", title: "Elden Ring", url: "https://howlongtobeat.com/game/68151" });
  });
  it("형식이 다르면 빈 배열", () => {
    expect(parseHltbSearch({ foo: 1 })).toEqual([]);
  });
});

describe("buildHltbSearchBody", () => {
  const token = JSON.parse(fixture("hltb-search-init.json")) as { token: string; hpKey: string; hpVal: string };

  it("hpKey 필드에 hpVal 을 넣는다 (서버 검증 대상)", () => {
    const body = buildHltbSearchBody("elden ring", token);
    expect(body[token.hpKey]).toBe(token.hpVal);
  });

  it("검색어를 공백으로 나누고 빈 토큰을 버린다", () => {
    expect(buildHltbSearchBody("  elden   ring  ", token).searchTerms).toEqual(["elden", "ring"]);
  });

  it("필터는 include/빈 배열 형태 (2026-09-12 프런트엔드 스키마)", () => {
    const games = (buildHltbSearchBody("hades", token).searchOptions as { games: Record<string, unknown> }).games;
    expect(games.platform).toEqual({ mode: "include", values: [] });
    expect(games.year).toEqual({ mode: "include", values: [] });
  });
});

describe("검색 엔드포인트 상수", () => {
  it("site 검색 경로와 init 경로", () => {
    expect(HLTB_SEARCH_URL).toBe("https://howlongtobeat.com/api/search/site");
    expect(HLTB_SEARCH_INIT_URL).toBe("https://howlongtobeat.com/api/search/site/init");
  });
});
