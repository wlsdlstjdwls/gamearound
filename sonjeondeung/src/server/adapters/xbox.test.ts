// Xbox 파서 테스트 — fixture 기반(Display Catalog 실응답, market=KR), 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import { parseXboxAutosuggest, parseXboxProduct, xboxStoreUrl } from "./xbox";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8"));

describe("parseXboxProduct", () => {
  it("KRW 구매 가용성에서 정가/현재가/출시일을 읽는다 (ELDEN RING)", () => {
    const snap = parseXboxProduct(fixture("xbox-product.json"), "9P3J32CTXLRZ");
    expect(snap.platform).toBe("xbox");
    expect(snap.storeExternalId).toBe("9P3J32CTXLRZ");
    expect(snap.listPrice).toBe(64800);
    expect(snap.currentPrice).toBe(64800);
    expect(snap.discountPct).toBe(0);
    expect(snap.releaseDate).toBe("2022-02-25");
    expect(snap.storeUrl).toBe("https://www.xbox.com/ko-KR/games/store/elden-ring/9P3J32CTXLRZ");
  });

  it("MSRP 보다 ListPrice 가 낮으면 할인율 계산", () => {
    const raw = {
      Products: [
        {
          ProductId: "X1",
          LocalizedProperties: [{ ProductTitle: "Sale Game" }],
          MarketProperties: [{ OriginalReleaseDate: "2024-03-01T15:00:00.0000000Z" }],
          DisplaySkuAvailabilities: [
            { Availabilities: [{ Actions: ["License", "Details"], OrderManagementData: { Price: { CurrencyCode: "USD", ListPrice: 0, MSRP: 0 } } }] },
            { Availabilities: [{ Actions: ["Purchase"], OrderManagementData: { Price: { CurrencyCode: "KRW", ListPrice: 30000, MSRP: 60000 } } }] },
          ],
        },
      ],
    };
    const snap = parseXboxProduct(raw, "X1");
    expect(snap.listPrice).toBe(60000);
    expect(snap.currentPrice).toBe(30000);
    expect(snap.discountPct).toBe(50);
    expect(snap.releaseDate).toBe("2024-03-01");
  });

  it("KRW 구매 가용성이 없으면 가격 null", () => {
    const raw = { Products: [{ ProductId: "X2", LocalizedProperties: [{ ProductTitle: "Pass Only" }], DisplaySkuAvailabilities: [] }] };
    const snap = parseXboxProduct(raw, "X2");
    expect(snap.listPrice).toBeNull();
    expect(snap.currentPrice).toBeNull();
    expect(snap.discountPct).toBeNull();
  });

  it("Products 가 비면 게임 없음(재시도 없음)", () => {
    expect(() => parseXboxProduct({ Products: [] }, "NOPE")).toThrowError(AdapterError);
    try {
      parseXboxProduct({ Products: [] }, "NOPE");
    } catch (e) {
      expect((e as AdapterError).retryable).toBe(false);
    }
  });

  it("형식 오류는 AdapterError", () => {
    expect(() => parseXboxProduct({ nope: true }, "X")).toThrowError(AdapterError);
  });
});

describe("parseXboxAutosuggest", () => {
  it("Type=Game 후보만, ProductId 기준 중복 제거", () => {
    const list = parseXboxAutosuggest(fixture("xbox-autosuggest.json"));
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list[0]).toEqual({ externalId: "9P3J32CTXLRZ", title: "ELDEN RING", url: xboxStoreUrl("9P3J32CTXLRZ", "ELDEN RING") });
    expect(new Set(list.map((c) => c.externalId)).size).toBe(list.length);
  });
  it("빈 응답 → 빈 배열", () => {
    expect(parseXboxAutosuggest({ Results: [] })).toEqual([]);
  });
});
