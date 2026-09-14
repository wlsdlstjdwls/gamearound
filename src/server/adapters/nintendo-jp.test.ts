// 일본 eShop 파서, 공용 가격 API 파서 테스트 — 실응답 모양을 고정한 표본, 네트워크 없음
import { describe, expect, it } from "vitest";
import { cleanJpTitle, parseJpDate, parseJpPlayers, parseJpSearch } from "./nintendo/search-jp";
import { ecPriceUrl, parseEcPrices } from "./nintendo/price-api";
import { parseNintendoTitleCode } from "./nintendo/parse-kr";

/** 2026-09-14 실응답에서 필요한 필드만 남긴 표본 */
const jpResponse = {
  result: {
    total: 2,
    items: [
      {
        id: "70010000044641",
        title: "No Man's Sky（ノーマンズスカイ）",
        icode: "A5WZA",
        hard: "1_HAC",
        pdate: "2022-10-07 00:00:00",
        maker: "Hello Games",
        genre: ["アドベンチャー"],
        player: ["1-4"],
        iurl: "abc123",
      },
      {
        id: "70010000099216",
        title: "ホロウナイト – Nintendo Switch 2 Edition",
        icode: "AKLHA",
        hard: "05_BEE",
        pdate: "2026-06-05 00:00:00",
        maker: "Team Cherry",
        genre: [],
        player: ["1"],
        iurl: null,
      },
      // 3DS 항목 — 기기를 우리 플랫폼으로 옮길 수 없어 버려져야 한다
      { id: "50010000000001", title: "旧作", icode: "ZZZZZ", hard: "2_CTR", pdate: null, maker: null, genre: [], player: [], iurl: null },
    ],
  },
};

describe("parseJpSearch", () => {
  it("스위치 항목만 남기고 기기를 옮긴다", () => {
    const out = parseJpSearch(jpResponse);
    expect(out).toHaveLength(2);
    expect(out[0].platform).toBe("switch");
    expect(out[1].platform).toBe("switch2");
  });

  it("작품 코드를 들고 내려온다 — 지역 간 동일 게임 판정의 유일한 근거다", () => {
    expect(parseJpSearch(jpResponse)[0].titleCode).toBe("A5WZA");
  });

  it("발견 목록이 게임 마스터까지 준다 — 일본은 단건 조회 경로가 없다", () => {
    const [first] = parseJpSearch(jpResponse);
    expect(first.meta?.titleEn).toBe("No Man's Sky");
    expect(first.meta?.publisher).toBe("Hello Games");
    expect(first.meta?.multiplayer?.localMax).toBe(4);
    expect(first.releaseDate).toBe("2022-10-07");
    expect(first.coverUrl).toContain("abc123");
  });
});

describe("cleanJpTitle", () => {
  it("가나 덧붙임을 떼어 영문 원제를 남긴다", () => {
    expect(cleanJpTitle("Hollow Knight（ホロウナイト）– Nintendo Switch 2")).toBe("Hollow Knight");
    expect(cleanJpTitle("No Man's Sky（ノーマンズスカイ）")).toBe("No Man's Sky");
  });

  it("일본어뿐인 제목은 그대로 둔다 — 뗄 것이 없다", () => {
    expect(cleanJpTitle("ア フォルド エーパート")).toBe("ア フォルド エーパート");
  });

  it("기기 표기만 있는 제목도 본체를 남긴다", () => {
    expect(cleanJpTitle("ゼルダの伝説 - Nintendo Switch 2 Edition")).toBe("ゼルダの伝説");
  });
});

describe("parseJpDate / parseJpPlayers", () => {
  it("날짜에서 시각을 떼고, 못 읽으면 null", () => {
    expect(parseJpDate("2026-09-10 00:00:00")).toBe("2026-09-10");
    expect(parseJpDate(null)).toBeNull();
    expect(parseJpDate("미정")).toBeNull();
  });

  it("인원 표기에서 최대치", () => {
    expect(parseJpPlayers(["1-4"])).toBe(4);
    expect(parseJpPlayers(["1"])).toBe(1);
    expect(parseJpPlayers([])).toBeNull();
  });
});

/** 2026-09-14 실응답 */
const ecResponse = {
  personalized: false,
  country: "KR",
  prices: [
    {
      title_id: 70010000044639,
      sales_status: "onsale",
      regular_price: { amount: "64,800원", currency: "KRW", raw_value: "64800" },
      discount_price: {
        amount: "25,920원",
        currency: "KRW",
        raw_value: "25920",
        start_datetime: "2026-09-08T15:00:00Z",
        end_datetime: "2026-09-23T14:59:59Z",
      },
    },
    {
      title_id: 70010000119151,
      sales_status: "onsale",
      regular_price: { amount: "29,990원", currency: "KRW", raw_value: "29990" },
    },
    { title_id: 70010000000001, sales_status: "not_found" },
    { title_id: 70010000000002, sales_status: "sales_termination" },
  ],
};

describe("parseEcPrices", () => {
  it("할인 중이면 할인가를 현재가로, 할인율과 기간을 함께 준다", () => {
    const p = parseEcPrices(ecResponse, "KRW").get("70010000044639")!;
    expect(p.listPrice).toBe(64800);
    expect(p.currentPrice).toBe(25920);
    expect(p.discountPct).toBe(60);
    expect(p.discountEndsAt).toBe("2026-09-23T14:59:59Z");
    expect(p.discountStartsAt).toBe("2026-09-08T15:00:00Z");
  });

  it("정가만 있으면 할인율 0, 기간은 없다", () => {
    const p = parseEcPrices(ecResponse, "KRW").get("70010000119151")!;
    expect(p.currentPrice).toBe(29990);
    expect(p.discountPct).toBe(0);
    expect(p.discountEndsAt).toBeNull();
  });

  it("팔지 않는 상품은 빼고 돌려준다 — 호출부가 '배치 응답에 없음' 으로 처리한다", () => {
    const m = parseEcPrices(ecResponse, "KRW");
    expect(m.has("70010000000001")).toBe(false);
    expect(m.has("70010000000002")).toBe(false);
    expect(m.size).toBe(2);
  });

  it("통화는 호출부가 정한다 — 응답 값을 환산하지 않는다", () => {
    expect(parseEcPrices(ecResponse, "JPY").get("70010000119151")!.currency).toBe("JPY");
  });
});

describe("ecPriceUrl", () => {
  it("나라, 언어, id 목록을 질의로 싣는다", () => {
    const u = new URL(ecPriceUrl("JP", "ja", ["1", "2"]));
    expect(u.searchParams.get("country")).toBe("JP");
    expect(u.searchParams.get("ids")).toBe("1,2");
  });
});

describe("parseNintendoTitleCode", () => {
  it("한국 SKU 가운데 5자가 작품 코드다 — 일본 icode 와 같은 값", () => {
    expect(parseNintendoTitleCode('x"catalog_product_view_sku_HACPA5WZA"x')).toBe("A5WZA");
    expect(parseNintendoTitleCode('"catalog_product_view_sku_BEEPAA2TA"')).toBe("AA2TA");
  });

  it("SKU 가 없으면 null — 그 게임은 제목으로만 이어진다", () => {
    expect(parseNintendoTitleCode("<html></html>")).toBeNull();
  });
});
