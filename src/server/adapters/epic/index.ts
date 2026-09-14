// Epic Games Store 어댑터 — 설계서 §4.1. 스토어프론트가 쓰는 공개 GraphQL(인증 불필요) 기반.
//   검색, 발견: Catalog.searchStore  |  단건: Catalog.catalogOffer(namespace, id)  |  DLC: 같은 searchStore 에 애드온 카테고리
// PoC(2026-09-14): country=KR 에서 기본판 6,990건, KRW 정가/할인가/할인 기간/행사명 파싱 확인.
// 이 파일은 '어떤 요청을 어떤 순서로 보낼지'만 담당한다 — 응답 해석은 parse.ts, 값은 constants.ts.
//
// Cloudflare 가 앞에 있어 브라우저 헤더(Origin, Referer, sec-fetch-*)가 없으면 403 챌린지 HTML 이 온다 —
// 크롤러 UA 만으로는 통과하지 못해 이 어댑터만 UA 를 브라우저 값으로 덮어쓴다(§10 의 UA 명시 예외).
// 헤더를 다 맞춰도 Node 는 막힌다(constants 의 EPIC_ENABLE_ENV 주석). 지금은 비활성 소스다.
import { type SearchCandidate, type StoreAdapter, type StoreSnapshot } from "../types";
import { createHttpClient } from "../http";
import { sleep } from "@/lib/async";
import {
  EPIC_ADDON_CATEGORY,
  EPIC_ADDON_PAGE_SIZE,
  EPIC_ADDON_QUERY,
  EPIC_BASE_GAME_CATEGORY,
  EPIC_BROWSER_HEADERS,
  EPIC_COUNTRY,
  EPIC_DISCOVERY_MAX_PAGES,
  EPIC_GRAPHQL_URL,
  EPIC_LOCALE,
  EPIC_OFFER_QUERY,
  EPIC_PAGE_SIZE,
  EPIC_SEARCH_QUERY,
} from "./constants";
import { epicExternalId, parseEpicExternalId, parseEpicOffer, parseEpicSearch, toEpicCandidate } from "./parse";

export * from "./constants";
export * from "./parse";

// ---- 네트워크 ----

// transport: "curl" 인 이유 — Node 는 헤더를 다 맞춰도 403 이다. 자세한 실측은 adapters/curl.ts 상단
// viaProxy — Cloudflare 가 데이터센터 IP 를 막으므로 러너에서는 주거용 출구가 필요하다.
// 가정용 회선에서 돌릴 때는 CRAWL_PROXY_URL 이 비어 있어 그대로 직접 나간다.
const http = createHttpClient({
  source: "epic",
  label: "Epic",
  headers: EPIC_BROWSER_HEADERS,
  transport: "curl",
  viaProxy: true,
});

async function graphql(query: string, variables: Record<string, unknown>, context: string): Promise<unknown> {
  return http.json(EPIC_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    context,
  });
}

export const epicAdapter: StoreAdapter = {
  source: "epic",
  minIntervalMs: 1000,

  async search(query: string): Promise<SearchCandidate[]> {
    const raw = await graphql(
      EPIC_SEARCH_QUERY,
      { country: EPIC_COUNTRY, locale: EPIC_LOCALE, count: EPIC_PAGE_SIZE, start: 0, category: EPIC_BASE_GAME_CATEGORY, keywords: query },
      `search:${query}`,
    );
    return parseEpicSearch(raw).map(toEpicCandidate);
  },

  async fetch(externalId: string): Promise<StoreSnapshot> {
    const { namespace, offerId } = parseEpicExternalId(externalId);
    const raw = await graphql(EPIC_OFFER_QUERY, { country: EPIC_COUNTRY, locale: EPIC_LOCALE, namespace, offerId }, externalId);
    return parseEpicOffer(raw, externalId);
  },

  /**
   * 이 게임의 추가 콘텐츠 외부 ID 목록. 요청 1회로 끝난다 —
   * 부모의 namespace 가 우리 외부 ID 안에 이미 들어 있어 따로 물어볼 것이 없다.
   */
  async listDlcIds(externalId: string): Promise<string[]> {
    const { namespace, offerId } = parseEpicExternalId(externalId);
    const raw = await graphql(
      EPIC_ADDON_QUERY,
      { country: EPIC_COUNTRY, locale: EPIC_LOCALE, namespace, category: EPIC_ADDON_CATEGORY, count: EPIC_ADDON_PAGE_SIZE },
      `dlc:${externalId}`,
    );
    // 같은 namespace 의 본편이 섞여 오는 일은 카테고리가 막지만, 자기 자신은 한 번 더 걸러 둔다
    return parseEpicSearch(raw)
      .map((o) => epicExternalId(o.namespace, o.id))
      .filter((id) => id !== epicExternalId(namespace, offerId));
  },

  /**
   * 카탈로그를 출시일 내림차순으로, 페이지 단위로 흘려보낸다.
   * 아는 것을 걸러내고 언제 멈출지는 호출부가 정한다(adapters/types 의 discoverPages 주석) —
   * 신작 N개만 끊어 돌려주면 그 N개가 다 등록된 순간 나머지 카탈로그가 영원히 안 들어온다.
   */
  async *discoverPages(): AsyncGenerator<SearchCandidate[]> {
    for (let page = 0; page < EPIC_DISCOVERY_MAX_PAGES; page++) {
      const raw = await graphql(
        EPIC_SEARCH_QUERY,
        {
          country: EPIC_COUNTRY,
          locale: EPIC_LOCALE,
          count: EPIC_PAGE_SIZE,
          start: page * EPIC_PAGE_SIZE,
          category: EPIC_BASE_GAME_CATEGORY,
          sortBy: "releaseDate",
          sortDir: "DESC",
        },
        `discover:${page}`,
      );
      const offers = parseEpicSearch(raw);
      if (offers.length === 0) return; // 카탈로그 끝
      yield offers.map(toEpicCandidate);
      await sleep(epicAdapter.minIntervalMs);
    }
  },
};

