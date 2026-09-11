// Steam 파서 테스트 — fixture 기반, 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import { inferMultiplayer, parseAppDetails, parseFeaturedAppIds, parseSteamDate, parseStoreSearch } from "./steam";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8"));

describe("parseAppDetails", () => {
  it("koreana + english 응답을 StoreSnapshot 으로 변환한다", () => {
    const snap = parseAppDetails(fixture("steam-appdetails-ko.json"), "1091500", fixture("steam-appdetails-en.json"));
    expect(snap.platform).toBe("steam");
    expect(snap.storeExternalId).toBe("1091500");
    expect(snap.storeUrl).toBe("https://store.steampowered.com/app/1091500");
    expect(snap.listPrice).toBe(66000); // 센트 → KRW 정수
    expect(snap.currentPrice).toBe(33000);
    expect(snap.discountPct).toBe(50);
    expect(snap.releaseDate).toBe("2020-12-10");
    expect(snap.meta?.titleEn).toBe("Cyberpunk 2077");
    expect(snap.meta?.titleKo).toBe("사이버펑크 2077");
    expect(snap.meta?.coverUrl).toContain("/1091500/header.jpg");
    expect(snap.meta?.developer).toBe("CD PROJEKT RED");
    expect(snap.meta?.publisher).toBe("CD PROJEKT RED");
    expect(snap.meta?.genres).toEqual(["액션", "RPG"]);
    expect(snap.meta?.multiplayer).toEqual({ solo: true, coop: false, pvp: false });
  });

  it("english 응답이 없으면 koreana 값을 titleEn 으로 쓰고 titleKo 는 null", () => {
    const snap = parseAppDetails(fixture("steam-appdetails-ko.json"), "1091500");
    expect(snap.meta?.titleEn).toBe("사이버펑크 2077");
    expect(snap.meta?.titleKo).toBeNull();
    expect(snap.releaseDate).toBe("2020-12-10"); // 한국어 날짜 파싱
  });

  it("무료 게임은 가격 0, 멀티플레이 카테고리로 coop/pvp 추론", () => {
    const snap = parseAppDetails(fixture("steam-appdetails-free-coop.json"), "570");
    expect(snap.listPrice).toBe(0);
    expect(snap.currentPrice).toBe(0);
    expect(snap.discountPct).toBe(0);
    expect(snap.meta?.multiplayer).toEqual({ solo: false, coop: true, pvp: true });
  });

  it("success=false 면 재시도 불가 AdapterError", () => {
    expect(() => parseAppDetails(fixture("steam-appdetails-fail.json"), "999999999")).toThrowError(AdapterError);
    try {
      parseAppDetails(fixture("steam-appdetails-fail.json"), "999999999");
    } catch (e) {
      expect((e as AdapterError).retryable).toBe(false);
    }
  });

  it("응답에 해당 appid 가 없으면 실패", () => {
    expect(() => parseAppDetails(fixture("steam-appdetails-ko.json"), "1")).toThrowError(AdapterError);
  });
});

describe("parseSteamDate", () => {
  it("여러 형식을 YYYY-MM-DD 로 변환", () => {
    expect(parseSteamDate("2020년 12월 10일")).toBe("2020-12-10");
    expect(parseSteamDate("10 Dec, 2020")).toBe("2020-12-10");
    expect(parseSteamDate("Dec 10, 2020")).toBe("2020-12-10");
    expect(parseSteamDate("2020-12-10")).toBe("2020-12-10");
    expect(parseSteamDate("2026년 3월 1일")).toBe("2026-03-01");
  });
  it("모호하면 null", () => {
    expect(parseSteamDate("Coming soon")).toBeNull();
    expect(parseSteamDate("2026")).toBeNull();
    expect(parseSteamDate("")).toBeNull();
    expect(parseSteamDate(undefined)).toBeNull();
  });
});

describe("inferMultiplayer", () => {
  it("카테고리가 없으면 undefined", () => {
    expect(inferMultiplayer(undefined)).toBeUndefined();
    expect(inferMultiplayer([{ description: "Steam Cloud" }])).toBeUndefined();
  });
});

describe("parseStoreSearch", () => {
  it("앱만 후보로 반환 (번들 제외)", () => {
    const list = parseStoreSearch(fixture("steam-storesearch.json"));
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ externalId: "1091500", title: "Cyberpunk 2077", url: "https://store.steampowered.com/app/1091500" });
  });
});

describe("parseFeaturedAppIds", () => {
  it("top_sellers + specials 에서 앱(type=0)만 중복 없이 n개", () => {
    expect(parseFeaturedAppIds(fixture("steam-featuredcategories.json"), 10)).toEqual(["570", "1091500", "730", "1245620"]);
    expect(parseFeaturedAppIds(fixture("steam-featuredcategories.json"), 2)).toEqual(["570", "1091500"]);
  });
});
