// GOG 어댑터 — 설계서 §4.1. 공개 JSON API(인증 불필요) 기반.
//   발견, 검색: catalog.gog.com/v1/catalog  |  단건, 배치: api.gog.com/products + products/prices
// PoC(2026-09-14): countryCode=KR 에서 기본 게임 6,381건 확인. 막는 것 없이 Node 에서 그대로 200 이다.
//
// **가격이 달러다.** GOG 는 한국에 원화로 팔지 않는다(currencyCode=KRW 로 조회하면 0건).
// 그래서 이 어댑터만 currency:"USD" 를 얹고, 화면의 비교, 정렬은 lib/currency 의 규칙이 따로 거른다.
// locale 은 en-US 고정이다 — ko-KR 을 넣으면 카탈로그가 0건으로 온다(같은 날 확인).
//
// 이 파일은 '어떤 요청을 어떤 순서로 보낼지'만 담당한다 — 응답 해석은 parse.ts, 변경 기록은 parse-changelog.ts.
import {
  AdapterError,
  type PatchNote,
  type SearchCandidate,
  type StoreAdapter,
  type StoreSnapshot,
} from "../types";
import { createHttpClient } from "../http";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";
import {
  GOG_API_URL,
  GOG_BATCH_SIZE,
  GOG_CATALOG_PAGE_SIZE,
  GOG_CATALOG_URL,
  GOG_CHANGELOG_EXPAND,
  GOG_CHANGELOG_MAX,
  GOG_COUNTRY,
  GOG_DISCOVERY_MAX_PAGES,
  GOG_GAME_FILTER,
  GOG_LOCALE,
} from "./constants";
import { parseGogCatalog, parseGogPrices, parseGogProducts, toGogSnapshot } from "./parse";
import { parseGogChangelog } from "./parse-changelog";

// 외부(어댑터 레지스트리, sync, 테스트)가 쓰는 이름은 여기서 한 번에 내보낸다
export * from "./constants";
export * from "./parse";
export * from "./parse-changelog";

const http = createHttpClient({ source: "gog", label: "GOG" });

function catalogUrl(page: number, query?: string): string {
  const u = new URL(GOG_CATALOG_URL);
  u.searchParams.set("limit", String(GOG_CATALOG_PAGE_SIZE));
  u.searchParams.set("page", String(page));
  u.searchParams.set("countryCode", GOG_COUNTRY);
  u.searchParams.set("locale", GOG_LOCALE);
  u.searchParams.set("productType", GOG_GAME_FILTER);
  if (query) u.searchParams.set("query", `like:${query}`);
  else u.searchParams.set("order", "desc:trending");
  return u.toString();
}

/**
 * 가격 응답. 한국에서 안 파는 상품이 하나라도 섞이면 이 API 는 400 을 준다
 * ("Product <id> not found", reason PRICES_NOT_FOUND — 2026-09-14 실측, GOG 판 Cyberpunk 2077).
 * 그걸 그대로 던지면 **배치에 든 나머지 상품까지 통째로 날아간다**. DLC 등록이 특히 여기 걸린다 —
 * 한 본편의 DLC 를 한 배치로 묻는데 그중 하나만 미판매여도 전부 못 들어온다.
 * 그래서 못 받은 가격은 "없음"으로 두고 상품은 살린다. 일시적 장애(retryable)는 그대로 올린다.
 */
async function fetchPrices(joined: string): Promise<Map<string, { basePrice: string; finalPrice: string; currencyCode: string }>> {
  try {
    return parseGogPrices(await http.json(`${GOG_API_URL}/products/prices?ids=${joined}&countryCode=${GOG_COUNTRY}`, { context: joined }));
  } catch (e) {
    if (e instanceof AdapterError && e.retryable) throw e;
    console.warn(`[gog] 가격 없음 — 상품만 반영한다 (${joined}): ${errorMessage(e)}`);
    return new Map();
  }
}

/** 상품 + 가격을 한 번씩 불러 스냅샷으로 묶는다. 두 응답 중 가격만 비어도 상품은 살린다 */
async function fetchSnapshots(ids: string[]): Promise<Map<string, StoreSnapshot>> {
  const joined = ids.join(",");
  const products = parseGogProducts(await http.json(`${GOG_API_URL}/products?ids=${joined}&locale=${GOG_LOCALE}`, { context: joined }));
  const prices = await fetchPrices(joined);
  const out = new Map<string, StoreSnapshot>();
  for (const product of products) {
    const id = String(product.id);
    out.set(id, toGogSnapshot(product, prices.get(id) ?? null));
  }
  return out;
}

export const gogAdapter: StoreAdapter = {
  source: "gog",
  minIntervalMs: 1000,
  batchSize: GOG_BATCH_SIZE,

  async search(query: string): Promise<SearchCandidate[]> {
    return parseGogCatalog(await http.json(catalogUrl(1, query), { context: `search:${query}` }));
  },

  async fetch(externalId: string): Promise<StoreSnapshot> {
    const snapshot = (await fetchSnapshots([externalId])).get(externalId);
    if (!snapshot) throw new AdapterError(`GOG 게임 없음: ${externalId}`, "gog", false);
    return snapshot;
  },

  async fetchMany(externalIds: string[]): Promise<Map<string, StoreSnapshot>> {
    return fetchSnapshots(externalIds);
  },

  /**
   * 이 게임의 변경 기록. 가격 배치에 얹지 않고 따로 부르는 이유: expand=changelog 를 붙이면
   * 응답이 게임당 수십에서 수백 KB 로 뛴다(사이버펑크 244KB). 50개를 한 번에 묻는 가격 배치에
   * 그걸 얹으면 매 실행 수 MB 를 받게 되는데, 패치 기록은 그렇게 자주 볼 값이 아니다.
   */
  async listPatchNotes(externalId: string): Promise<PatchNote[]> {
    const raw = await http.json(
      `${GOG_API_URL}/products/${encodeURIComponent(externalId)}?expand=${GOG_CHANGELOG_EXPAND}&locale=${GOG_LOCALE}`,
      { context: externalId },
    );
    const changelog = (raw as { changelog?: unknown })?.changelog;
    return parseGogChangelog(typeof changelog === "string" ? changelog : null).slice(0, GOG_CHANGELOG_MAX);
  },

  /**
   * 카탈로그를 페이지 단위로 흘려보낸다. 아는 것을 걸러내고 언제 멈출지는 호출부가 정한다
   * (adapters/types 의 discoverPages 주석) — 여기서 앞부분만 끊어 돌려주면 매 실행 같은 목록만 나온다.
   */
  async *discoverPages(): AsyncGenerator<SearchCandidate[]> {
    for (let page = 1; page <= GOG_DISCOVERY_MAX_PAGES; page++) {
      const found = parseGogCatalog(await http.json(catalogUrl(page), { context: `discover:${page}` }));
      if (found.length === 0) return; // 카탈로그 끝
      yield found;
      await sleep(gogAdapter.minIntervalMs);
    }
  },
};
