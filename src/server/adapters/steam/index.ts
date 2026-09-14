// Steam 스토어 어댑터 — 설계서 §4.1/§4.2. 기준 소스(공식 API). 가져오기만 하고 DB 반영은 sync/ 가 맡는다.
// 이 파일은 '어떤 요청을 어떤 순서로 보낼지'만 담당한다 — 응답 해석은 parse.ts, 형식 검증은 schemas.ts.
import { type SearchCandidate, type StoreAdapter, type StoreSnapshot } from "../types";
import { createHttpClient } from "../http";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";
import {
  DISCOVERY_SLICES,
  STEAM_APPDETAILS_URL,
  STEAM_FEATURED_URL,
  STEAM_GETITEMS_BATCH,
  STEAM_STOREITEMS_URL,
  STEAM_STORESEARCH_URL,
  STEAM_TOPSELLERS_URL,
  TOPSELLERS_MAX_PAGES,
  TOPSELLERS_PAGE_INTERVAL_MS,
  TOPSELLERS_PAGE_SIZE,
} from "./constants";
import {
  parseAppDetails,
  parseFeaturedAppIds,
  parseStoreItemDiscount,
  parseStoreItems,
  parseStoreSearch,
  parseTopSellerAppIds,
} from "./parse";

// 외부(어댑터 레지스트리, sync, 테스트)가 쓰는 이름은 여기서 한 번에 내보낸다
export * from "./constants";
export * from "./parse";
export type { StoreItem } from "./schemas";

const http = createHttpClient({ source: "steam", label: "Steam" });

/** GetItems 는 input_json 쿼리 하나로 받는다. appid 여러 개를 한 번에 넣을 수 있다(STEAM_GETITEMS_BATCH) */
function storeItemsUrl(appids: string[], language: "koreana" | "english", full: boolean): string {
  const input = {
    ids: appids.map((id) => ({ appid: Number(id) })),
    context: { language, country_code: "KR", steam_realm: 1 },
    // 영문 응답은 제목만 쓰므로 basic_info 만 요청해 응답 크기를 줄인다
    data_request: full
      ? { include_basic_info: true, include_assets: true, include_release: true, include_platforms: true, include_tag_count: 20 }
      : { include_basic_info: true },
  };
  const u = new URL(STEAM_STOREITEMS_URL);
  u.searchParams.set("input_json", JSON.stringify(input));
  return u.toString();
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function appDetailsUrl(appid: string, lang: "koreana" | "english"): string {
  const u = new URL(STEAM_APPDETAILS_URL);
  u.searchParams.set("appids", appid);
  u.searchParams.set("cc", "kr");
  u.searchParams.set("l", lang);
  return u.toString();
}

/**
 * scripts/crawl.ts --seed-top=N 용: 인기순위 appid 상위 n개 (§11-1: 전체가 아닌 상위 N개).
 * 1차 인기순위 검색(페이지네이션) → 실패/빈 응답 시 featuredcategories(top_sellers+specials) 폴백.
 */
export async function fetchSteamTopAppIds(n: number): Promise<string[]> {
  const ids: string[] = [];
  const seen = new Set<string>();
  try {
    outer: for (const slice of DISCOVERY_SLICES) {
      for (let page = 0; page < TOPSELLERS_MAX_PAGES && ids.length < n; page++) {
        const u = new URL(STEAM_TOPSELLERS_URL);
        u.searchParams.set("json", "1");
        u.searchParams.set("filter", "topsellers");
        u.searchParams.set("cc", "kr");
        u.searchParams.set("l", "koreana");
        u.searchParams.set("count", String(TOPSELLERS_PAGE_SIZE));
        u.searchParams.set("start", String(page * TOPSELLERS_PAGE_SIZE));
        if (slice) u.searchParams.set("tags", slice);
        const pageIds = parseTopSellerAppIds(await http.json(u.toString()));
        if (pageIds.length === 0) break; // 이 슬라이스는 바닥 — 다음 슬라이스로
        for (const id of pageIds) {
          if (seen.has(id)) continue;
          seen.add(id);
          ids.push(id);
          if (ids.length >= n) break;
        }
        await sleep(TOPSELLERS_PAGE_INTERVAL_MS);
      }
      if (ids.length >= n) break outer;
    }
  } catch (e) {
    console.warn(`[steam] 인기순위 검색 실패 → featuredcategories 폴백: ${errorMessage(e)}`);
  }
  if (ids.length > 0) return ids;

  const u = new URL(STEAM_FEATURED_URL);
  u.searchParams.set("cc", "kr");
  u.searchParams.set("l", "koreana");
  return parseFeaturedAppIds(await http.json(u.toString()), n);
}

export const steamAdapter: StoreAdapter = {
  source: "steam",
  minIntervalMs: 1500,

  async search(query: string): Promise<SearchCandidate[]> {
    const u = new URL(STEAM_STORESEARCH_URL);
    u.searchParams.set("term", query);
    u.searchParams.set("cc", "kr");
    u.searchParams.set("l", "koreana");
    return parseStoreSearch(await http.json(u.toString()));
  },

  /**
   * koreana + english 2회 호출(영문 제목/출시일 확보). 사이 간격은 minIntervalMs 의 절반만 둔다.
   * 할인 중일 때만 GetItems 를 1회 더 호출해 종료 시각, 행사명을 붙인다(할인 아닌 게임엔 요청을 늘리지 않음).
   * GetItems 실패는 가격 수집을 막지 않는다 — 부가 정보라 경고만 남기고 넘어간다.
   */
  async fetch(appid: string): Promise<StoreSnapshot> {
    const rawKo = await http.json(appDetailsUrl(appid, "koreana"));
    await sleep(Math.floor(steamAdapter.minIntervalMs / 2));
    const rawEn = await http.json(appDetailsUrl(appid, "english"));
    const snapshot = parseAppDetails(rawKo, appid, rawEn);
    if (!snapshot.discountPct || snapshot.discountPct <= 0) return snapshot;
    try {
      const info = parseStoreItemDiscount(await http.json(storeItemsUrl([appid], "koreana", false)), appid);
      return { ...snapshot, discountEndsAt: info.discountEndsAt, discountName: info.discountName };
    } catch (e) {
      console.warn(`[steam] 할인 기간 조회 실패 (appid=${appid}): ${errorMessage(e)}`);
      return snapshot;
    }
  },

  batchSize: STEAM_GETITEMS_BATCH,

  /**
   * GetItems 로 최대 100개를 한 번에. koreana(전체 필드) + english(제목만) 2회 요청으로 배치 하나를 끝낸다.
   * 게임당 2.3초 → 100개당 ~3초. 카탈로그가 수만 건이어도 Actions 예산 안에 들어온다.
   */
  async fetchMany(appids: string[]): Promise<Map<string, StoreSnapshot>> {
    if (appids.length === 0) return new Map();
    const rawKo = await http.json(storeItemsUrl(appids, "koreana", true));
    await sleep(Math.floor(steamAdapter.minIntervalMs / 2));
    const rawEn = await http.json(storeItemsUrl(appids, "english", false));
    return parseStoreItems(rawKo, rawEn);
  },
};
