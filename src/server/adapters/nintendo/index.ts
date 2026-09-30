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
  EC_PRICE_BATCH,
  JP_DISCOVER_FQ,
  jpDlcFq,
  JP_SEARCH_PAGE_SIZE,
  JP_SEARCH_URL,
  KR_CATALOG_INTERVAL_MS,
  KR_CATALOG_PAGE_MS,
  KR_CATALOG_PAGE_SIZE,
  KR_CATALOG_URL,
  NINTENDO_BASE_URL,
  nintendoProductUrl,
  jpProductUrl,
} from "./constants";
import { ecPriceUrl, parseEcPrices, type EcPrice } from "./price-api";
import { parseNintendoProduct, parseNintendoSearch, requireBody } from "./parse-kr";
import { parseJpSearch } from "./search-jp";
import { parseKrCatalog } from "./catalog-kr";

export * from "./constants";
export * from "./parse-kr";
export * from "./price-api";
export * from "./search-jp";
export * from "./catalog-kr";

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
   * listPopularPages 를 두지 않는다 — 한국 eShop 은 **판매량 정렬을 내주지 않는다**(2026-09-21 실측).
   *
   * Magento 라 `product_list_order=bestsellers` 가 먹을 법한데, 검색 결과의 sorter select 에
   * 달린 값이 relevance, price, release_date **셋뿐**이다. bestsellers 를 넣으면 거부가 아니라
   * relevance 로 조용히 떨어진다 — 그래서 상태 코드만 보면 먹은 것처럼 보인다.
   *
   * 새 일본 스토어(store-jp.nintendo.com/ranking)에는 랭킹이 있지만 Akamai Queue-It 대기열
   * (enqueuetoken)이 앞을 막아 자동 경로가 아니다. nintendo.co.jp/software/ranking 은 404 다.
   */
  /**
   * 카탈로그 전체 목록을 startPage 쪽부터 끝까지 흘려보낸다(catalog-kr 주석: 검색 시드를 이걸로 바꾼 이유).
   * 어디서 시작할지는 호출부가 정한다 — 지난 실행이 멈춘 쪽을 기억하는 일은 DB, Redis 를 보는 sync 몫이다.
   * 걸러 낸 뒤 0건인 쪽(굿즈만 있는 쪽)도 빈 배열로 흘려보낸다 — 건너뛰면 호출부가 센 쪽 수와
   * 실제 쪽 번호가 어긋나 다음 시작점이 틀린다.
   */
  resumableDiscovery: true,
  discoverPageMs: KR_CATALOG_PAGE_MS,
  async *discoverPages(startPage = 1): AsyncGenerator<SearchCandidate[]> {
    for (let page = Math.max(1, startPage); ; page++) {
      const u = new URL(KR_CATALOG_URL);
      u.searchParams.set("storeId", "1");
      u.searchParams.set("currencyCode", "KRW");
      u.searchParams.set("searchCriteria[pageSize]", String(KR_CATALOG_PAGE_SIZE));
      u.searchParams.set("searchCriteria[currentPage]", String(page));
      const { candidates, rawCount } = parseKrCatalog(await krHttp.json(u.toString()));
      if (rawCount === 0) return;
      yield candidates;
      await sleep(KR_CATALOG_INTERVAL_MS);
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
   * listPopularPages 를 두지 않는다 — 일본 eShop 검색은 **정렬을 못 바꾼다**(2026-09-21 실측).
   * Solr 이라 sort 가 먹을 법한데, score / hits_i / pv_i / rank_i / sales_i / sotsu_sort_i /
   * dprice_sort_f 를 넣어 봐도 여덟 경우가 전부 **같은 순서**를 돌려준다. Xbox 와 같은 모양이다
   * (adapters/xbox 의 listPopularPages 주석) — 파라미터가 무시되면 기본 순서의 뜻도 알 수 없다.
   *
   * 그래서 스위치 게임은 인기 축에서 자리를 못 받는다. 2026-09-21 실측 영향은 116건이다
   * (자리 없고 평단 70점 이상). 그 안에 Mario Kart World(메타 86), Kirby Air Riders(88)가 있다 —
   * 스위치 독점이라 다른 스토어의 순번을 빌려 올 수도 없다. 대체 축은 스토어 밖에서 찾아야 한다.
   */
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
