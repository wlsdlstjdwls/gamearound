// Steam 파서 테스트 — fixture 기반, 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import {
  inferMultiplayer,
  parseAppDetails,
  parseDlcIds,
  parseFeaturedCandidates,
  parseSteamDate,
  parseStoreItemDiscount,
  parseStoreItems,
  parseStoreSearch,
  parseTopSellerCandidates,
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

describe("parseDlcIds", () => {
  // 실제 응답에서 옮겨 온 값 — 할로우 나이트(367520)의 두 번째 항목 916000 은 사운드트랙이다(2026-09-14)
  const response = { "367520": { success: true, data: { type: "game", name: "Hollow Knight", dlc: [598190, 916000] } } };

  it("본편이 알려준 DLC appid 를 문자열로 돌려준다", () => {
    expect(parseDlcIds(response, "367520")).toEqual(["598190", "916000"]);
  });

  it("목록이 없으면 빈 배열", () => {
    expect(parseDlcIds({ "1": { success: true, data: { name: "No DLC" } } }, "1")).toEqual([]);
  });

  it("success=false 는 빈 배열 — 게임이 없는 것과 목록이 없는 것을 가르지 않는다", () => {
    expect(parseDlcIds(fixture("steam-appdetails-fail.json"), "999999999")).toEqual([]);
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

describe("parseFeaturedCandidates", () => {
  it("top_sellers + specials 에서 앱(type=0)만 중복 없이", () => {
    const list = parseFeaturedCandidates(fixture("steam-featuredcategories.json"));
    expect(list.map((c) => c.externalId)).toEqual(["570", "1091500", "730", "1245620"]);
    expect(list[0].url).toBe("https://store.steampowered.com/app/570");
  });
});

describe("parseTopSellerCandidates", () => {
  it("logo URL 의 /apps/<id>/ 만 추출하고 subs, logo 없음, 중복은 제외한다", () => {
    const list = parseTopSellerCandidates(fixture("steam-search-results.json"));
    expect(list).toEqual([
      { externalId: "578080", title: "PUBG: BATTLEGROUNDS", url: "https://store.steampowered.com/app/578080" },
      { externalId: "730", title: "Counter-Strike 2", url: "https://store.steampowered.com/app/730" },
    ]);
  });

  it("형식이 다르면 AdapterError", () => {
    expect(() => parseTopSellerCandidates({ items: "nope" })).toThrow(AdapterError);
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

describe("parseStoreItems 의 종류 판정", () => {
  // 출시예정 목록에는 체험판이 섞여 온다(2026-09-16 실측 100건 중 10건). 본편으로 새면 안 된다
  const items = (type: number, extra: Record<string, unknown> = {}) => ({
    response: { store_items: [{ appid: 7, type, name: "Foo", success: 1, visible: true, ...extra }] },
  });

  it("type 1 은 체험판이다", () => {
    expect(parseStoreItems(items(1), items(1)).get("7")?.contentType).toBe("demo");
  });

  it("체험판은 본편을 가리켜도 DLC 가 되지 않는다", () => {
    const withParent = items(1, { related_items: { parent_appid: 9 } });
    expect(parseStoreItems(withParent, withParent).get("7")?.contentType).toBe("demo");
  });

  it("type 11 은 사운드트랙이다", () => {
    expect(parseStoreItems(items(11), items(11)).get("7")?.contentType).toBe("music");
  });

  // 부모가 있으면 그 게임의 추가 콘텐츠로 서는 편이 맞다 — 체험판과 반대 순서다
  it("부모를 가리키는 사운드트랙은 DLC 로 남는다", () => {
    const withParent = items(11, { related_items: { parent_appid: 9 } });
    expect(parseStoreItems(withParent, withParent).get("7")?.contentType).toBe("dlc");
  });

  it("type 0 은 본편, type 4 는 DLC", () => {
    expect(parseStoreItems(items(0), items(0)).get("7")?.contentType).toBe("game");
    expect(parseStoreItems(items(4), items(4)).get("7")?.contentType).toBe("dlc");
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

  it("유저 점수는 전체 리뷰의 긍정 비율이다 — 한국어 리뷰만 세면 표본이 20분의 1로 줄어 값이 튄다", () => {
    const map = parseStoreItems(ko(), en());
    expect(map.get("292030")!.userScore).toEqual({ value: 96, kind: "positive_ratio", count: 793664 });
    // 한국어 묶음(49%)이 아니라 전체 묶음(58%)을 쓴다
    expect(map.get("578080")!.userScore).toEqual({ value: 58, kind: "positive_ratio", count: 2455900 });
  });

  it("리뷰가 없는 게임은 점수를 주지 않는다 — 1건짜리 100% 를 만점으로 띄우지 않는다", () => {
    expect(parseStoreItems(ko(), en()).get("2717010")!.userScore).toBeNull();
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

  // 요청을 늘리지 않고 얻는 축이다 — 이미 include_platforms 로 받고 있던 값을 파서가 버리고 있었다
  it("스팀덱 등급을 옮긴다 (2026-09-18 실측: 위쳐3 verified, 칼파 playable, 배그 unsupported)", () => {
    const map = parseStoreItems(ko(), en());
    expect(map.get("292030")!.deckCompat).toBe("verified");
    expect(map.get("2717010")!.deckCompat).toBe("playable");
    expect(map.get("578080")!.deckCompat).toBe("unsupported");
  });

  it("밸브가 아직 안 본 게임(0)은 등급이 아니라 null 이다 — 기존 등급을 덮으면 안 된다", () => {
    const raw = {
      response: { store_items: [{ appid: 7, type: 0, name: "Foo", tagids: [], platforms: { windows: true, steam_deck_compat_category: 0 } }] },
    };
    expect(parseStoreItems(raw).get("7")!.deckCompat).toBeNull();
  });

  it("platforms 자체가 없으면 네 값 모두 건드리지 않는다 (undefined = 기존 값 유지)", () => {
    const raw = { response: { store_items: [{ appid: 7, type: 0, name: "Foo", tagids: [] }] } };
    const snap = parseStoreItems(raw).get("7")!;
    expect(snap.deckCompat).toBeUndefined();
    expect(snap.nativeWindows).toBeUndefined();
    expect(snap.nativeMac).toBeUndefined();
  });

  it("네이티브 OS 는 스팀이 말한 그대로 — 리눅스 칸 이름은 steamos_linux 다", () => {
    const raw = {
      response: {
        store_items: [{ appid: 730, type: 0, name: "CS2", tagids: [], platforms: { windows: true, steamos_linux: true, steam_deck_compat_category: 2 } }],
      },
    };
    const snap = parseStoreItems(raw).get("730")!;
    expect(snap.nativeWindows).toBe(true);
    expect(snap.nativeLinux).toBe(true);
    // 응답이 안 준 OS 는 미지원이다 — 스팀은 지원하는 것만 켜서 보낸다(2026-09-18 실측)
    expect(snap.nativeMac).toBe(false);
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
