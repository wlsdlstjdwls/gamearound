// PlayStation Store 어댑터 — 설계서 §4.1. 스토어프론트가 쓰는 공개 GraphQL(인증 불필요) 기반.
//   발견: categoryGridRetrieve(전체 게임 카테고리)  |  단건: conceptRetrieve  |  검색: universalSearch
// 이 파일은 '어떤 요청을 어떤 순서로 보낼지'만 담당한다 — 응답 해석은 parse.ts.
//
// 이 API 는 질의문을 화이트리스트로 막는다(persisted query). 그래서 질의문 대신 해시를 보내고,
// 해시는 constants.ts 에 적어 둔다 — 갱신 방법도 거기 주석에 있다.
// 수집 단위는 상품(에디션)이 아니라 콘셉트(게임)다. 상품 단위로 모으면 같은 게임이
// 디럭스, 번들, PS4판, PS5판으로 여러 번 등록된다.
import { AdapterError, type SearchCandidate, type StoreAdapter, type StoreSnapshot } from "../types";
import { createHttpClient } from "../http";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";
import {
  PSSTORE_ALL_GAMES_CATEGORY,
  PSSTORE_COUNTRY,
  PSSTORE_DISCOVERY_MAX_PAGES,
  PSSTORE_GRAPHQL_URL,
  PSSTORE_HEADERS,
  PSSTORE_LANGUAGE,
  PSSTORE_PAGE_SIZE,
  PSSTORE_QUERY_HASHES,
  PSSTORE_SEARCH_LOOKUP_MAX,
} from "./constants";
import { parsePsstoreConcept, parsePsstoreGrid, parsePsstoreProduct, parsePsstoreSearch } from "./parse";

export * from "./constants";
export * from "./parse";

const http = createHttpClient({ source: "psstore", label: "PlayStation", headers: PSSTORE_HEADERS });

/** persisted query 는 GET + 쿼리스트링이다. 질의문은 보내지 않고 해시만 보낸다 */
function opUrl(operationName: string, variables: unknown, sha256Hash: string): string {
  const u = new URL(PSSTORE_GRAPHQL_URL);
  u.searchParams.set("operationName", operationName);
  u.searchParams.set("variables", JSON.stringify(variables));
  u.searchParams.set("extensions", JSON.stringify({ persistedQuery: { version: 1, sha256Hash } }));
  return u.toString();
}

async function op(operationName: string, variables: unknown, hash: string, context: string): Promise<unknown> {
  return http.json(opUrl(operationName, variables, hash), { context });
}

export const psstoreAdapter: StoreAdapter = {
  source: "psstore",
  minIntervalMs: 1000,

  /**
   * 검색은 상품(에디션)만 돌려주고 콘셉트 id 를 주지 않는다. 우리 키는 콘셉트라
   * 상위 몇 건만 상세를 더 보고 콘셉트로 바꾼다 — 매칭 단계에서만 쓰여 깊게 볼 이유가 없다.
   */
  async search(query: string): Promise<SearchCandidate[]> {
    const raw = await op(
      "getSearchResults",
      { countryCode: PSSTORE_COUNTRY, languageCode: PSSTORE_LANGUAGE, nextCursor: "", pageOffset: 0, pageSize: PSSTORE_PAGE_SIZE, searchTerm: query },
      PSSTORE_QUERY_HASHES.search,
      `search:${query}`,
    );
    const out: SearchCandidate[] = [];
    const seen = new Set<string>();
    for (const hit of parsePsstoreSearch(raw).slice(0, PSSTORE_SEARCH_LOOKUP_MAX)) {
      await sleep(psstoreAdapter.minIntervalMs);
      try {
        const detail = await op("productRetrieveForCtasWithPrice", { productId: hit.productId }, PSSTORE_QUERY_HASHES.productDetail, hit.productId);
        const candidate = parsePsstoreProduct(detail);
        if (!candidate || seen.has(candidate.externalId)) continue;
        seen.add(candidate.externalId);
        out.push(candidate);
      } catch (e) {
        // 한 건이 실패해도 나머지 후보는 쓸 수 있다 — 매칭은 후보가 하나만 맞아도 된다
        console.warn(`[psstore] 검색 후보 조회 실패 (${hit.productId}): ${errorMessage(e)}`);
      }
    }
    return out;
  },

  async fetch(conceptId: string): Promise<StoreSnapshot> {
    if (!/^\d+$/.test(conceptId)) throw new AdapterError(`PlayStation 콘셉트 ID 형식 오류: ${conceptId}`, "psstore", false);
    const raw = await op("conceptRetrieveForCtasWithPrice", { conceptId }, PSSTORE_QUERY_HASHES.conceptDetail, conceptId);
    return parsePsstoreConcept(raw, conceptId);
  },

  /** 전체 게임 카테고리를 페이지 단위로 흘려보낸다. 아는 것을 걸러내고 멈출 시점은 호출부가 정한다 */
  async *discoverPages(): AsyncGenerator<SearchCandidate[]> {
    for (let page = 0; page < PSSTORE_DISCOVERY_MAX_PAGES; page++) {
      const raw = await op(
        "categoryGridRetrieve",
        {
          id: PSSTORE_ALL_GAMES_CATEGORY,
          pageArgs: { size: PSSTORE_PAGE_SIZE, offset: page * PSSTORE_PAGE_SIZE },
          sortBy: null,
          filterBy: [],
          facetOptions: [],
        },
        PSSTORE_QUERY_HASHES.categoryGrid,
        `discover:${page}`,
      );
      const found = parsePsstoreGrid(raw);
      if (found.length === 0) return; // 카탈로그 끝
      yield found;
      await sleep(psstoreAdapter.minIntervalMs);
    }
  },
};
