// 닌텐도 어댑터 둘 — 한국 eShop(nintendo)과 일본 eShop(nintendo_jp).
//
// 왜 소스를 둘로 나눴나: game_source_refs 의 PK 가 (game_id, source) 라 한 게임에 소스당 ID 하나다.
// 같은 작품이라도 판매 단위 ID(nsuid)는 나라마다 다르므로, 한 소스에 두 나라를 담으면 한쪽이 밀려난다.
//
// 가격은 둘 다 공식 API(price-api)를 쓴다. 게임 마스터를 얻는 길만 다르다:
//   한국 — 상품 페이지 HTML. 목록이 제목밖에 안 줘서 신규는 단건 조회가 필요하다(batchPricesOnly "detail")
//   일본 — 검색 JSON. 목록이 마스터까지 주고 단건 조회 경로는 아예 없다(batchPricesOnly "discovery")
import { sleep } from "@/lib/async";
import { AdapterError, type SearchCandidate, type StoreAdapter, type StoreSnapshot } from "../types";
import { createHttpClient, notFoundAs } from "../http";
import {
  DISCOVERY_MAX_PAGES,
  DISCOVERY_QUERIES,
  EC_PRICE_BATCH,
  JP_DISCOVER_FQ,
  jpDlcFq,
  JP_SEARCH_PAGE_SIZE,
  JP_SEARCH_URL,
  NINTENDO_BASE_URL,
  nintendoProductUrl,
  jpProductUrl,
} from "./constants";
import { ecPriceUrl, parseEcPrices, type EcPrice } from "./price-api";
import { parseNintendoProduct, parseNintendoSearch, requireBody } from "./parse-kr";
import { parseJpSearch } from "./search-jp";

export * from "./constants";
export * from "./parse-kr";
export * from "./price-api";
export * from "./search-jp";

// eShop 은 HTML 크롤이라 봇 차단을 피하려 한국어 Accept-Language 를 명시한다. 타임아웃도 API 보다 길게 잡는다.
const krHttp = createHttpClient({
  source: "nintendo",
  label: "Nintendo",
  timeoutMs: 20_000,
  headers: { "Accept-Language": "ko-KR,ko;q=0.9" },
  // 한국 eShop 은 한국 밖 IP 에 202 + 빈 본문을 준다 — CRAWL_PROXY_URL(한국 출구)이 있으면 거쳐 간다.
  // 가정용 회선(한국)에서는 값이 없으므로 그대로 직접 나간다.
  viaProxy: true,
  onStatus: notFoundAs("nintendo", (ctx) => `Nintendo 상품 없음 (${ctx})`),
});

const jpHttp = createHttpClient({
  source: "nintendo_jp",
  label: "Nintendo JP",
  timeoutMs: 20_000,
  headers: { "Accept-Language": "ja-JP,ja;q=0.9" },
  viaProxy: true,
});

/**
 * 가격 API 응답 → 스냅샷. 기기(switch/switch2)는 가격 API 가 알려주지 않는다 —
 * 여기서는 기본값을 두고, 아는 값이 있으면 호출부(sync/store-fetch)가 대상의 기기로 덮는다.
 */
function priceSnapshots(
  prices: Map<string, EcPrice>,
  region: "KR" | "JP",
  storeUrl: (id: string) => string,
): Map<string, StoreSnapshot> {
  const out = new Map<string, StoreSnapshot>();
  for (const [nsuid, p] of prices) {
    out.set(nsuid, {
      platform: "switch",
      region,
      storeExternalId: nsuid,
      storeUrl: storeUrl(nsuid),
      listPrice: p.listPrice,
      currentPrice: p.currentPrice,
      currency: p.currency,
      discountPct: p.discountPct,
      discountStartsAt: p.discountStartsAt,
      discountEndsAt: p.discountEndsAt,
    });
  }
  return out;
}

export const nintendoAdapter: StoreAdapter = {
  source: "nintendo",
  minIntervalMs: 4000,
  batchSize: EC_PRICE_BATCH,
  // 가격은 API 가 배치로 주지만 제목, 이미지는 안 준다 — 신규 등록 대상만 상품 HTML 로 따로 본다
  batchPricesOnly: "detail",

  async search(query: string): Promise<SearchCandidate[]> {
    const u = new URL(`${NINTENDO_BASE_URL}/catalogsearch/result/`);
    u.searchParams.set("q", query);
    return parseNintendoSearch(requireBody(await krHttp.text(u.toString()), `search:${query}`));
  },

  async fetch(id: string): Promise<StoreSnapshot> {
    if (!/^[a-z0-9]+$/i.test(id)) throw new AdapterError(`Nintendo 상품 ID 형식 오류: ${id}`, "nintendo", false);
    return parseNintendoProduct(requireBody(await krHttp.text(nintendoProductUrl(id)), id), id);
  },

  async fetchMany(ids: string[]): Promise<Map<string, StoreSnapshot>> {
    if (ids.length === 0) return new Map();
    const raw = await krHttp.json(ecPriceUrl("KR", "ko", ids));
    return priceSnapshots(parseEcPrices(raw, "KRW"), "KR", nintendoProductUrl);
  },

  /**
   * 검색 시드 × 페이지네이션으로 카탈로그를 페이지 단위로 흘려보낸다. 한 시드가 바닥나면 다음 시드로.
   * 아는 것을 걸러내고 멈출 시점을 정하는 일은 호출부 몫이다(adapters/types 의 discoverPages 주석).
   */
  async *discoverPages(): AsyncGenerator<SearchCandidate[]> {
    for (const q of DISCOVERY_QUERIES) {
      for (let page = 1; page <= DISCOVERY_MAX_PAGES; page++) {
        const u = new URL(`${NINTENDO_BASE_URL}/catalogsearch/result/`);
        u.searchParams.set("q", q);
        u.searchParams.set("p", String(page));
        const found = parseNintendoSearch(requireBody(await krHttp.text(u.toString()), `discover:${q}:${page}`));
        if (found.length === 0) break; // 이 시드는 끝 — 다음 시드로
        yield found;
        await sleep(nintendoAdapter.minIntervalMs);
      }
    }
  },
};

function jpSearchUrl(params: { q?: string; fq?: string; page: number; limit?: number }): string {
  const u = new URL(JP_SEARCH_URL);
  u.searchParams.set("limit", String(params.limit ?? JP_SEARCH_PAGE_SIZE));
  u.searchParams.set("page", String(params.page));
  if (params.q) u.searchParams.set("q", params.q);
  if (params.fq) u.searchParams.set("fq", params.fq);
  return u.toString();
}

export const nintendoJpAdapter: StoreAdapter = {
  source: "nintendo_jp",
  // 검색 JSON 과 가격 API 둘 다 가벼운 JSON 이라 HTML 크롤(4초)만큼 조심할 이유가 없다
  minIntervalMs: 1000,
  batchSize: EC_PRICE_BATCH,
  // 신규 등록의 근거는 발견 목록이다 — nsuid 로 되묻는 질의가 없어 단건 상세 경로를 만들 수 없다
  batchPricesOnly: "discovery",

  async search(query: string): Promise<SearchCandidate[]> {
    return parseJpSearch(await jpHttp.json(jpSearchUrl({ q: query, fq: JP_DISCOVER_FQ, page: 1 })));
  },

  async fetch(id: string): Promise<StoreSnapshot> {
    // 일부러 막아 둔다. 일본 검색은 nsuid 로 되묻는 질의를 받지 않고(id_s, nsuid, q= 모두 0건),
    // 가격만 돌려주면 게임 마스터가 없어 신규 생성이 실패한다 — 그 실패를 여기서 이름으로 설명한다.
    throw new AdapterError(
      `Nintendo JP 는 단건 조회 경로가 없다(nsuid 재조회 불가): ${id}. 신규는 발견 목록으로만 들어온다`,
      "nintendo_jp",
      false,
    );
  },

  async fetchMany(ids: string[]): Promise<Map<string, StoreSnapshot>> {
    if (ids.length === 0) return new Map();
    const raw = await jpHttp.json(ecPriceUrl("JP", "ja", ids));
    return priceSnapshots(parseEcPrices(raw, "JPY"), "JP", jpProductUrl);
  },

  // 본편과 DLC 는 판매 단위(nsuid)가 아니라 작품 코드(icode)로 묶인다 — nsuid 로는 되물을 길이 없다
  dlcListKey: "titleCode",

  /**
   * 본편의 작품 코드로 추가 콘텐츠를 받는다. 한 요청이 ID 와 게임 마스터를 함께 주므로
   * ID 만 돌려주는 listDlcIds 를 쓸 수 없다 — 이 소스에는 DLC 상세를 되묻는 경로가 없어서
   * 여기서 받은 마스터가 새 DLC 를 만들 유일한 근거다(fetch 가 막혀 있는 이유와 같다).
   * 한 페이지(50건)만 본다. 등록 상한(DLC_PER_GAME_MAX)이 30이라 그 뒤는 어차피 버려진다.
   */
  async listDlcCandidates(icode: string): Promise<SearchCandidate[]> {
    return parseJpSearch(await jpHttp.json(jpSearchUrl({ fq: jpDlcFq(icode), page: 1 })));
  },

  /**
   * 카탈로그를 페이지로 흘려보낸다. 질의(JP_DISCOVER_FQ)가 스위치 본편, 판매 중인 것만 남기므로
   * 전체 34,919건이 아니라 약 14,900건을 훑는다 — 페이지당 50건이면 한 바퀴가 약 300페이지다.
   */
  async *discoverPages(): AsyncGenerator<SearchCandidate[]> {
    for (let page = 1; ; page++) {
      const found = parseJpSearch(await jpHttp.json(jpSearchUrl({ fq: JP_DISCOVER_FQ, page })));
      if (found.length === 0) return;
      yield found;
      await sleep(nintendoJpAdapter.minIntervalMs);
    }
  },
};
