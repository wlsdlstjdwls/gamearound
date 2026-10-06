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
  PSSTORE_CONCEPT_URL,
  PSSTORE_COUNTRY,
  PSSTORE_DISCOVERY_MAX_PAGES,
  PSSTORE_GRAPHQL_URL,
  PSSTORE_HEADERS,
  PSSTORE_LANGUAGE,
  PSSTORE_PAGE_SIZE,
  PSSTORE_PRODUCT_ID,
  PSSTORE_QUERY_HASHES,
  PSSTORE_SEARCH_LOOKUP_MAX,
} from "./constants";
import { parsePsstoreConcept, parsePsstoreDlc, parsePsstoreGrid, parsePsstoreProduct, parsePsstoreSearch } from "./parse";
import { parsePsstoreAddOnIds } from "./add-ons";
import { psstoreStandardProductIdFromConcept } from "./standard-product";

export * from "./constants";
export * from "./parse";
export * from "./add-ons";

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

/**
 * 목록 한 장. 발견과 인기순위 수집이 같은 질의를 쓰므로 여기로 모은다.
 * firstRank 를 주면 후보에 순번이 실린다 — 이 카테고리의 기본 정렬이 베스트셀러라 그 자리가 곧 순위다.
 */
async function gridPage(page: number, context: string, firstRank?: number): Promise<SearchCandidate[]> {
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
    context,
  );
  return parsePsstoreGrid(raw, firstRank);
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

  /**
   * 본편은 콘셉트, DLC 는 상품이다 — 키 모양으로 가른다.
   * 콘셉트 id 는 숫자뿐이고(10006270), 상품 id 는 "HP0700-PPSA10593_00-TK8S3CHARASTPASS" 꼴이다.
   * DLC 는 콘셉트를 갖지 않아서 여기서 갈라 주지 않으면 애드온 목록이 준 id 를 되물을 길이 없다.
   */
  async fetch(externalId: string): Promise<StoreSnapshot> {
    if (PSSTORE_PRODUCT_ID.test(externalId)) {
      const raw = await op("productRetrieveForCtasWithPrice", { productId: externalId }, PSSTORE_QUERY_HASHES.productDetail, externalId);
      return parsePsstoreDlc(raw, externalId);
    }
    if (!/^\d+$/.test(externalId)) throw new AdapterError(`PlayStation 외부 ID 형식 오류: ${externalId}`, "psstore", false);
    const raw = await op("conceptRetrieveForCtasWithPrice", { conceptId: externalId }, PSSTORE_QUERY_HASHES.conceptDetail, externalId);
    const snap = parsePsstoreConcept(raw, externalId);
    // 기본 상품이 에디션이면 일반판 값을 한 번 더 묻는다(근거는 standard-product). 드문 경우에만 나가는 요청이다
    const standardId = psstoreStandardProductIdFromConcept(raw);
    if (!standardId) return snap;
    try {
      await sleep(psstoreAdapter.minIntervalMs);
      const std = parsePsstoreDlc(
        await op("productRetrieveForCtasWithPrice", { productId: standardId }, PSSTORE_QUERY_HASHES.productDetail, standardId),
        standardId,
      );
      if (std.currentPrice == null || std.currentPrice <= 0 || (snap.currentPrice != null && std.currentPrice >= snap.currentPrice)) return snap;
      return { ...snap, listPrice: std.listPrice, currentPrice: std.currentPrice, discountPct: std.discountPct, discountEndsAt: std.discountEndsAt };
    } catch (e) {
      // 일반판 조회가 실패해도 콘셉트 값은 살린다 — 에디션 값이 빈칸보다는 낫다
      console.warn(`[psstore] 일반판 값 조회 실패 (${standardId}): ${errorMessage(e)}`);
      return snap;
    }
  },

  /**
   * 추가 콘텐츠 목록. GraphQL 질의는 화이트리스트에 막혀 있지만 콘셉트 페이지 HTML 이
   * 애드온을 이미 서버 렌더링해서 준다(constants 의 "추가 콘텐츠(DLC) 목록" 주석).
   * 한 건에 0.6~1.2MB 짜리 응답이라 비싸다 — 호출 빈도와 건수는 sync/dlc-list 가 막아 준다.
   */
  async listDlcIds(conceptId: string): Promise<string[]> {
    const html = await http.text(`${PSSTORE_CONCEPT_URL}/${conceptId}`, { context: `dlc:${conceptId}` });
    return parsePsstoreAddOnIds(html);
  },

  /** 전체 게임 카테고리를 페이지 단위로 흘려보낸다. 아는 것을 걸러내고 멈출 시점은 호출부가 정한다 */
  async *discoverPages(): AsyncGenerator<SearchCandidate[]> {
    for (let page = 0; page < PSSTORE_DISCOVERY_MAX_PAGES; page++) {
      yield await gridPage(page, `discover:${page}`);
      await sleep(psstoreAdapter.minIntervalMs);
    }
  },

  /**
   * 인기순위(베스트셀러)만 1위부터. 발견과 같은 목록을 읽지만 멈출 조건이 페이지 수뿐이다
   * (adapters/types 의 listPopularPages 주석).
   *
   * 같은 질의를 쓰는 이유: 이 카테고리의 기본 정렬이 이미 `sales30`("베스트셀러", 30일 판매)이다 —
   * 응답의 sortedBy 가 그렇게 말한다(2026-09-21 실측). 스토어가 정렬해 준 순서를 우리가 여태
   * 버리고 있었을 뿐이라 새 엔드포인트도 새 해시도 필요 없다.
   */
  async *listPopularPages(maxPages: number): AsyncGenerator<SearchCandidate[]> {
    for (let page = 0; page < maxPages; page++) {
      const found = await gridPage(page, `popular:${page}`, page * PSSTORE_PAGE_SIZE + 1);
      if (found.length === 0) return;
      yield found;
      await sleep(psstoreAdapter.minIntervalMs);
    }
  },
};
