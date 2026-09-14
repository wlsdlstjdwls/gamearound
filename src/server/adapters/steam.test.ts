// Steam 파서 테스트 — fixture 기반, 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import {
  inferMultiplayer,
  parseAppDetails,
  parseFeaturedAppIds,
  parseSteamDate,
  parseStoreItemDiscount,
  parseStoreItems,
  parseStoreSearch,
  parseTopSellerAppIds,
  steamAssetUrl,
  steamDiscountLabel,
  unixToIsoDate,
} from "./steam";

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

describe("parseTopSellerAppIds", () => {
  it("logo URL 의 /apps/<id>/ 만 추출하고 subs, logo 없음, 중복은 제외한다", () => {
    expect(parseTopSellerAppIds(fixture("steam-search-results.json"))).toEqual(["578080", "730"]);
  });

  it("형식이 다르면 AdapterError", () => {
    expect(() => parseTopSellerAppIds({ items: "nope" })).toThrow(AdapterError);
  });
});

describe("parseStoreItemDiscount (할인 기간, 행사명)", () => {
  it("GetItems 실응답에서 종료 시각과 행사명을 뽑는다 (2026-09-14 픽스처)", () => {
    const info = parseStoreItemDiscount(fixture("steam-getitems.json"), "275850");
    expect(info.discountEndsAt).toBe(new Date(1790010000 * 1000).toISOString());
    expect(info.discountName).toBe("주말 특가");
  });

  it("할인이 없거나 형식이 다르면 둘 다 null", () => {
    expect(parseStoreItemDiscount({ response: { store_items: [{ appid: 1, best_purchase_option: {} }] } }, "1")).toEqual({
      discountEndsAt: null,
      discountName: null,
    });
    expect(parseStoreItemDiscount({ foo: 1 }, "1")).toEqual({ discountEndsAt: null, discountName: null });
  });
});

describe("steamDiscountLabel", () => {
  it("프리셋 토큰 → 한국어", () => {
    expect(steamDiscountLabel("#discount_desc_preset_daily")).toBe("데일리 딜");
    expect(steamDiscountLabel("#discount_desc_preset_special")).toBe("특별 할인");
  });
  it("계절 세일은 키워드로 잡는다", () => {
    expect(steamDiscountLabel("#discount_desc_summer_sale_2026")).toBe("여름 세일");
  });
  it("모르는 토큰, 빈 값은 null (가짜 행사명을 만들지 않는다)", () => {
    expect(steamDiscountLabel("#discount_desc_preset_zzz")).toBeNull();
    expect(steamDiscountLabel(undefined)).toBeNull();
  });
});

describe("parseStoreItems", () => {
  const ko = () => fixture("steam-getitems-batch-ko.json");
  const en = () => fixture("steam-getitems-batch-en.json");

  it("배치 응답을 appid별 StoreSnapshot 으로 변환한다", () => {
    const map = parseStoreItems(ko(), en());
    expect(map.size).toBe(3);
    const witcher = map.get("292030")!;
    expect(witcher.platform).toBe("steam");
    expect(witcher.storeUrl).toBe("https://store.steampowered.com/app/292030");
    expect(witcher.meta?.titleEn).toBe("The Witcher 3: Wild Hunt - Complete Edition");
    expect(witcher.meta?.titleKo).toBe("더 위쳐 3: 와일드 헌트 - 컴플리트 에디션");
    expect(witcher.meta?.developer).toBe("CD PROJEKT RED");
    expect(witcher.releaseDate).toBe("2015-05-18");
  });

  it("가로 배너(header)와 세로 아트(library_capsule)를 각각 채운다", () => {
    const witcher = parseStoreItems(ko(), en()).get("292030")!;
    // 상세 헤더의 3:4 슬롯은 세로 아트용이다 — 가로 배너를 넣으면 제목이 크롭돼 잘린다
    expect(witcher.meta?.coverUrl).toContain("/header");
    expect(witcher.meta?.portraitUrl).toContain("/library_capsule.jpg");
    expect(witcher.meta?.portraitUrl).not.toBe(witcher.meta?.coverUrl);
  });

  it("할인 중이면 가격 3종 + 종료 시각 + 행사명을 채운다", () => {
    const kalpa = parseStoreItems(ko(), en()).get("2717010")!;
    expect(kalpa.listPrice).toBe(22000); // 센트 문자열 → KRW 정수
    expect(kalpa.currentPrice).toBe(13200);
    expect(kalpa.discountPct).toBe(40);
    expect(kalpa.discountEndsAt).not.toBeNull();
    expect(kalpa.discountName).toBe("특별 할인");
  });

  it("구매 옵션이 없는 무료 게임은 0원으로 처리한다", () => {
    const pubg = parseStoreItems(ko(), en()).get("578080")!;
    expect(pubg.listPrice).toBe(0);
    expect(pubg.currentPrice).toBe(0);
    expect(pubg.discountPct).toBe(0);
  });

  it("tagid 는 기본 장르 12종만 장르명으로 옮기고 나머지는 버린다", () => {
    const kalpa = parseStoreItems(ko(), en()).get("2717010")!;
    expect(kalpa.meta?.genres).toContain("캐주얼"); // 597
    expect(kalpa.meta?.genres).toContain("액션"); // 19
    expect(kalpa.meta?.genres).not.toContain(""); // 매핑 없는 tagid 는 제외
  });

  it("supported_player_categoryids 로 멀티플레이를 추론한다", () => {
    const map = parseStoreItems(ko(), en());
    expect(map.get("292030")!.meta?.multiplayer).toEqual({ solo: true, coop: false, pvp: false });
    expect(map.get("2717010")!.meta?.multiplayer).toEqual({ solo: true, coop: false, pvp: true });
  });

  it("english 응답 없이도 한국어 제목을 titleEn 으로 쓴다", () => {
    const witcher = parseStoreItems(ko()).get("292030")!;
    expect(witcher.meta?.titleEn).toBe("더 위쳐 3: 와일드 헌트 - 컴플리트 에디션");
    expect(witcher.meta?.titleKo).toBeNull(); // 같은 값을 중복으로 넣지 않는다
  });

  it("배치 응답의 기본값은 본편이다", () => {
    const witcher = parseStoreItems(ko(), en()).get("292030")!;
    expect(witcher.contentType).toBe("game");
    expect(witcher.parentExternalId).toBeNull();
  });

  it("type=4 또는 related_items.parent_appid 가 있으면 DLC 로 본다", () => {
    // 엘든 링 DLC(2778580) 실측 모양 — GetItems 는 본편의 DLC 목록을 주지 않고 자식만 부모를 가리킨다
    const raw = {
      response: {
        store_items: [
          { appid: 2778580, type: 4, name: "ELDEN RING Shadow of the Erdtree", related_items: { parent_appid: 1245620 }, tagids: [] },
          // type 은 게임인데 본편만 가리키는 확장팩 — 한쪽 신호만 봐도 DLC 로 잡혀야 한다
          { appid: 999001, type: 0, name: "Expansion", related_items: { parent_appid: 1245620 }, tagids: [] },
        ],
      },
    };
    const map = parseStoreItems(raw);
    expect(map.get("2778580")!.contentType).toBe("dlc");
    expect(map.get("2778580")!.parentExternalId).toBe("1245620");
    expect(map.get("999001")!.contentType).toBe("dlc");
  });

  it("형식이 깨진 응답은 AdapterError", () => {
    expect(() => parseStoreItems({ response: { store_items: "nope" } })).toThrow(AdapterError);
  });
});

describe("steamAssetUrl", () => {
  it("asset_url_format 의 FILENAME 자리에 header 파일명을 끼운다", () => {
    expect(steamAssetUrl({ asset_url_format: "steam/apps/1/${FILENAME}?t=2", header: "abc/header.jpg" })).toBe(
      "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1/abc/header.jpg?t=2",
    );
  });
  it("kind=library_capsule 은 세로 아트 파일명을 끼운다", () => {
    expect(
      steamAssetUrl(
        { asset_url_format: "steam/apps/1/${FILENAME}?t=2", header: "abc/header.jpg", library_capsule: "def/library_capsule.jpg" },
        "library_capsule",
      ),
    ).toBe("https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1/def/library_capsule.jpg?t=2");
  });
  it("둘 중 하나라도 없으면 null", () => {
    expect(steamAssetUrl({ asset_url_format: "x/${FILENAME}" })).toBeNull();
    expect(steamAssetUrl(undefined)).toBeNull();
  });
  it("요청한 종류의 에셋이 없으면 null — header 로 대신 채우지 않는다", () => {
    expect(steamAssetUrl({ asset_url_format: "x/${FILENAME}", header: "h.jpg" }, "library_capsule")).toBeNull();
  });
});

describe("unixToIsoDate", () => {
  it("unix 초를 YYYY-MM-DD 로", () => {
    expect(unixToIsoDate(1431937260)).toBe("2015-05-18");
  });
  it("0, undefined 는 null", () => {
    expect(unixToIsoDate(0)).toBeNull();
    expect(unixToIsoDate(undefined)).toBeNull();
  });
});
