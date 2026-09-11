// Nintendo eShop(KR) 파서 테스트 — fixture 기반(store.nintendo.co.kr 실페이지), 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import { parseNintendoDate, parseNintendoProduct, parseNintendoSearch } from "./nintendo";

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
