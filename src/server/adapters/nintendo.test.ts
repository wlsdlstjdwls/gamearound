// Nintendo eShop(KR) 파서 테스트 — fixture 기반(store.nintendo.co.kr 실페이지), 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import { parseNintendoDate, parseNintendoGenres, parseNintendoPlayers, parseNintendoProduct, parseNintendoSearch, requireBody } from "./nintendo";

const fixture = (name: string): string => readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");

describe("parseNintendoProduct", () => {
  it("세일 중인 상품: 정가(oldPrice)/세일가(finalPrice)/할인율/발매일/Switch 2", () => {
    const snap = parseNintendoProduct(fixture("nintendo-product-sale.html"), "70010000119221");
    expect(snap.platform).toBe("switch2");
    expect(snap.storeExternalId).toBe("70010000119221");
    expect(snap.storeUrl).toBe("https://store.nintendo.co.kr/70010000119221");
    expect(snap.listPrice).toBe(49800);
    expect(snap.currentPrice).toBe(44820);
    expect(snap.discountPct).toBe(10);
    expect(snap.releaseDate).toBe("2026-11-05");
  });

  it("세일 아님: 정가 = 현재가, 할인율 0 (Silksong Switch 1판 — 대상 본체 'Nintendo Switch')", () => {
    const snap = parseNintendoProduct(fixture("nintendo-product-switch1.html"), "70010000100203");
    expect(snap.platform).toBe("switch");
    expect(snap.releaseDate).toBe("2025-09-04");
    expect(snap.listPrice).toBe(21500);
    expect(snap.currentPrice).toBe(21500);
    expect(snap.discountPct).toBe(0);
  });

  it("가격 요소가 없으면 가격 null, 대상 본체 미표기는 switch", () => {
    const html = '<html><body><span itemprop="name">Test</span></body></html>';
    const snap = parseNintendoProduct(html, "70010000000001");
    expect(snap.platform).toBe("switch");
    expect(snap.listPrice).toBeNull();
    expect(snap.currentPrice).toBeNull();
    expect(snap.discountPct).toBeNull();
    expect(snap.releaseDate).toBeNull();
  });

  it("제목이 없으면 파싱 실패(재시도 없음)", () => {
    expect(() => parseNintendoProduct("<html></html>", "x")).toThrowError(AdapterError);
  });
});

describe("parseNintendoSearch", () => {
  it("다운로드 상품(숫자 ID)만 후보로, 제목 공백 정리", () => {
    const list = parseNintendoSearch(fixture("nintendo-search.html"));
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list[0].externalId).toBe("70010000100203");
    expect(list[0].title).toBe("Hollow Knight: Silksong (할로우 나이트: 실크송)");
    expect(list[0].url).toBe("https://store.nintendo.co.kr/70010000100203");
    expect(list.every((c) => /^\d+$/.test(c.externalId))).toBe(true);
  });
  it("패키지 상품(hacp…)은 제외", () => {
    const html = '<a class="product-item-link" href="https://store.nintendo.co.kr/hacpaxn7akor">젤다</a>';
    expect(parseNintendoSearch(html)).toEqual([]);
  });
});

describe("parseNintendoDate", () => {
  it.each([
    ["2026/11/5", "2026-11-05"],
    ["2023.05.12", "2023-05-12"],
    ["2024-01-31", "2024-01-31"],
    ["2025년 9월 4일", "2025-09-04"],
    ["미정", null],
    ["", null],
  ])("%s → %s", (input, expected) => {
    expect(parseNintendoDate(input)).toBe(expected);
  });
});

describe("parseNintendoProduct meta", () => {
  it("신규 게임 생성에 필요한 meta 를 채운다 (Switch 독점작은 Steam 에 없다)", () => {
    const snap = parseNintendoProduct(fixture("nintendo-product-switch1.html"), "70010000100203");
    // 한국 eShop 은 영문 제목을 주지 않는다 — 같은 한국어 제목이 두 자리에 들어간다.
    // titleKo 가 제자리고, titleEn 은 신규 생성에 반드시 있어야 해서 채우는 값이다(parse-kr 주석).
    expect(snap.meta?.titleEn).toBeTruthy();
    expect(snap.meta?.titleKo).toBe(snap.meta?.titleEn);
    expect(snap.meta?.publisher).toBe("Team Cherry");
    expect(snap.meta?.coverUrl).toContain("media/catalog/product");
    expect(snap.meta?.genres).toContain("액션");
  });
});

describe("parseNintendoGenres", () => {
  it("쉼표, 가운뎃점으로 나누고 중복을 지운다", () => {
    expect(parseNintendoGenres("액션, 어드벤처")).toEqual(["액션", "어드벤처"]);
    expect(parseNintendoGenres("액션 · 액션")).toEqual(["액션"]);
  });
  it("빈 값은 빈 배열", () => {
    expect(parseNintendoGenres(null)).toEqual([]);
    expect(parseNintendoGenres("  ")).toEqual([]);
  });
});

describe("parseNintendoPlayers", () => {
  it("범위 표기에서 최대 인원을 읽는다", () => {
    expect(parseNintendoPlayers("1~4명")).toBe(4);
    expect(parseNintendoPlayers("최대 8명")).toBe(8);
    expect(parseNintendoPlayers("1명")).toBe(1);
  });
  it("숫자가 없으면 null", () => {
    expect(parseNintendoPlayers("")).toBeNull();
    expect(parseNintendoPlayers(null)).toBeNull();
  });
});

describe("requireBody", () => {
  it("본문이 있으면 그대로 돌려준다", () => {
    expect(requireBody("<html>x</html>", "ctx")).toBe("<html>x</html>");
  });

  it("빈 본문(202 차단)은 재시도 가능한 실패로 바꾼다 — 검색 결과 0건과 구분해야 한다", () => {
    let caught: AdapterError | null = null;
    try {
      requireBody("   ", "search:mario");
    } catch (e) {
      caught = e as AdapterError;
    }
    expect(caught).toBeInstanceOf(AdapterError);
    expect(caught?.retryable).toBe(true);
    expect(caught?.message).toContain("search:mario");
  });
});
