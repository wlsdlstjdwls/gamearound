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
  EPIC_CONTENT_URL,
  EPIC_COUNTRY,
  EPIC_DISCOVERY_MAX_PAGES,
  EPIC_GRAPHQL_URL,
  EPIC_LOCALE,
  EPIC_LOCALE_EN,
  EPIC_OFFER_QUERY,
  EPIC_PAGE_SIZE,
  EPIC_SEARCH_QUERY,
} from "./constants";
import { epicExternalId, parseEpicExternalId, parseEpicOffer, parseEpicSearch, toEpicCandidate } from "./parse";
import { parseEpicContentKorean } from "./parse-languages";
import { epicProductSlug, parseEpicRequirements } from "./parse-requirements";
import type { RequirementsResult } from "../types";

export * from "./constants";
export * from "./parse";
export * from "./parse-requirements";
export * from "./parse-languages";

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

/**
 * 상품 콘텐츠 전용 클라이언트. GraphQL 쪽과 **일부러 나눠 둔다** —
 * 저쪽은 Cloudflare 때문에 curl 과 프록시가 필요하지만 이 호스트는 Node 로 그냥 열린다
 * (constants 의 EPIC_CONTENT_URL 주석). 한 클라이언트로 묶으면 열려 있는 경로까지
 * curl 프로세스를 띄우고 프록시 요금을 쓴다.
 */
const contentHttp = createHttpClient({
  source: "epic",
  label: "Epic 콘텐츠",
  headers: EPIC_BROWSER_HEADERS,
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
  // 사양 열쇠는 외부 ID 가 아니라 저장해 둔 스토어 주소다(types 의 requirementsKey 주석)
  requirementsKey: "storeUrl",

  /**
   * 사양. 게임 1개가 요청 1회다 — 배치 응답에는 사양이 없다.
   * 주소에서 slug 를 못 뽑으면 빈 배열이다. 그 게임은 "물어봤지만 없더라" 로 기록되고
   * 다음 회차에 다시 줄 서지 않는다 — slug 없는 행은 다시 물어도 같은 답이다.
   */
  async fetchRequirements(storeUrl: string): Promise<RequirementsResult> {
    const slug = epicProductSlug(storeUrl);
    if (!slug) return { requirements: [] };
    const raw = await contentHttp.json(EPIC_CONTENT_URL(slug), { context: `requirements:${slug}` });
    // 같은 응답에 지원 언어도 실려 온다 — 따로 묻지 않는다
    return { requirements: parseEpicRequirements(raw), korean: parseEpicContentKorean(raw) };
  },

  async search(query: string): Promise<SearchCandidate[]> {
    const raw = await graphql(
      EPIC_SEARCH_QUERY,
      { country: EPIC_COUNTRY, locale: EPIC_LOCALE, count: EPIC_PAGE_SIZE, start: 0, category: EPIC_BASE_GAME_CATEGORY, keywords: query },
      `search:${query}`,
    );
    return parseEpicSearch(raw).map(toEpicCandidate);
  },

  /** 한국어 + 영문 2회 요청으로 끝난다 — 제목이 로케일을 따라오므로 영문 이름은 따로 물어야 한다 */
  async fetch(externalId: string): Promise<StoreSnapshot> {
    const { namespace, offerId } = parseEpicExternalId(externalId);
    const raw = await graphql(EPIC_OFFER_QUERY, { country: EPIC_COUNTRY, locale: EPIC_LOCALE, namespace, offerId }, externalId);
    await sleep(Math.floor(epicAdapter.minIntervalMs / 2));
    // 영문 요청이 실패해도 가격 수집은 계속된다 — 그때는 한국어 제목이 그대로 titleEn 에 남는다(예전 동작)
    const rawEn = await graphql(
      EPIC_OFFER_QUERY,
      { country: EPIC_COUNTRY, locale: EPIC_LOCALE_EN, namespace, offerId },
      `${externalId}:en`,
    ).catch(() => undefined);
    return parseEpicOffer(raw, externalId, rawEn);
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
   * listPopularPages 를 두지 않는다 — Epic 카탈로그에는 **인기 정렬이 없다**(2026-09-21 실측).
   *
   * Xbox 와 막히는 방식이 다르다. 저쪽은 정렬 파라미터를 조용히 무시하는데, 여기는 화이트리스트를
   * 서버가 검증해서 없는 값이면 400 을 준다(`errors.com.epicgames.catalog.invalid_sort_by`) —
   * 덕분에 무엇이 있고 없는지가 분명하다. 31개를 넣어 보고 받아들인 것은 열하나뿐이다:
   *   relevancy, title, currentPrice, discountPercentage,
   *   releaseDate, pcReleaseDate, effectiveDate, viewableDate, creationDate, lastModifiedDate, featured
   * 값, 날짜, 이름, 할인율이 전부다. popularity, topSellers, salesRank, trending, downloads,
   * playerCount, wishlist, installs, mostPlayed 는 모두 400 이다. (`featured` 는 받아들이지만
   * releaseDate 와 같은 순서를 줘서 뜻이 없다.)
   *
   * 스토어의 Top Sellers 컬렉션 페이지는 남은 문이지만 자동 경로가 아니다 — 서버가 목록을 안 박고
   * (`__REACT_QUERY_INITIAL_QUERIES__` 에 launcherVersion 하나뿐), GraphQL 에 Collection 루트 필드가
   * 없으며 인트로스펙션도 꺼져 있다. 붙인다면 브라우저로 질의를 떠 오는 일이 먼저다(psstore 해시와 같은 방식).
   *
   * 그때까지 Epic 게임은 인기 축에서 자리를 못 받는다. 2026-09-21 실측으로 그 영향은 25건이다
   * (자리 없고 평단 70점 이상인 Epic 게임). 대부분은 다른 스토어에도 있어 그쪽 순번을 받는다.
   */
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

