// Steam 스토어 어댑터 — 설계서 §4.1/§4.2. 기준 소스(공식 API). 가져오기만 하고 DB 반영은 sync/ 가 맡는다.
// 이 파일은 '어떤 요청을 어떤 순서로 보낼지'만 담당한다 — 응답 해석은 parse.ts, 형식 검증은 schemas.ts.
import { type PatchNote, type RequirementSnapshot, type SearchCandidate, type StoreAdapter, type StoreSnapshot } from "../types";
import { createHttpClient } from "../http";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";
import {
  DISCOVERY_PASSES,
  STEAM_APPDETAILS_URL,
  STEAM_FEATURED_URL,
  STEAM_GETITEMS_BATCH,
  STEAM_NEWS_COUNT,
  STEAM_NEWS_FEED,
  STEAM_NEWS_MAXLENGTH,
  STEAM_NEWS_TAG,
  STEAM_NEWS_URL,
  STEAM_STOREITEMS_URL,
  STEAM_STORESEARCH_URL,
  STEAM_TOPSELLERS_URL,
  TOPSELLERS_PAGE_INTERVAL_MS,
  TOPSELLERS_PAGE_SIZE,
} from "./constants";
import {
  parseAppDetails,
  parseAppRequirements,
  parseDlcIds,
  parseFeaturedCandidates,
  parseStoreItemDiscount,
  parseStoreItems,
  parseSteamPatchNotes,
  parseStoreSearch,
  parseTopSellerCandidates,
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
    // 영문 응답은 제목만 쓰므로 basic_info 만 요청해 응답 크기를 줄인다.
    // include_reviews 는 유저 점수를 준다 — 요청 수가 늘지 않고 응답만 조금 커진다(2026-09-15 실측)
    data_request: full
      ? {
          include_basic_info: true,
          include_assets: true,
          include_release: true,
          include_platforms: true,
          include_reviews: true,
          include_tag_count: 20,
        }
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

/** 패치 공지 목록 주소. 태그 필터는 서버가 걸고, 본문은 maxlength 로 잘라 받는다 */
function newsUrl(appid: string): string {
  const u = new URL(STEAM_NEWS_URL);
  u.searchParams.set("appid", appid);
  u.searchParams.set("count", String(STEAM_NEWS_COUNT));
  u.searchParams.set("maxlength", String(STEAM_NEWS_MAXLENGTH));
  u.searchParams.set("feeds", STEAM_NEWS_FEED);
  u.searchParams.set("tags", STEAM_NEWS_TAG);
  return u.toString();
}

function appDetailsUrl(appid: string, lang: "koreana" | "english"): string {
  const u = new URL(STEAM_APPDETAILS_URL);
  u.searchParams.set("appids", appid);
  u.searchParams.set("cc", "kr");
  u.searchParams.set("l", lang);
  return u.toString();
}

/**
 * 카탈로그 발견 — 같은 검색 API 를 패스 단위로 흘려보낸다(§11-1).
 * 먼저 출시예정을 몇 페이지 훑고(아직 안 나온 게임이 늦게 들어오면 출시예정 축이 빈다),
 * 그다음 인기순위를 본다. 한 쿼리는 ~6,500건에서 바닥나므로 장르 태그 슬라이스로 잘라 계속 파고든다.
 * 상위 N개만 끊어 돌려주지 않는 이유: 그 N개가 전부 등록된 순간 신규가 영원히 0건이 된다 —
 * 어디까지 아는지는 DB 를 보는 호출부만 안다(adapters/types 의 discoverPages 주석).
 * 인기순위 검색 자체가 막히면 featuredcategories 한 장(60건 안팎)으로 폴백한다.
 */
async function* steamDiscoverPages(): AsyncGenerator<SearchCandidate[]> {
  let pages = 0;
  try {
    for (const pass of DISCOVERY_PASSES) {
      for (let page = 0; page < pass.maxPages; page++) {
        const u = new URL(STEAM_TOPSELLERS_URL);
        u.searchParams.set("json", "1");
        u.searchParams.set("filter", pass.filter);
        u.searchParams.set("cc", "kr");
        u.searchParams.set("l", "koreana");
        u.searchParams.set("count", String(TOPSELLERS_PAGE_SIZE));
        u.searchParams.set("start", String(page * TOPSELLERS_PAGE_SIZE));
        if (pass.tags) u.searchParams.set("tags", pass.tags);
        // 순번을 담는 패스는 하나뿐이다: 태그 없는 topsellers = 스토어 전체 인기순위.
        // 출시예정은 인기순이 아니고, 장르 슬라이스는 그 장르 안 순위다(types 의 rank 주석).
        const isGlobalRanking = pass.filter === "topsellers" && pass.tags === null;
        const firstRank = isGlobalRanking ? page * TOPSELLERS_PAGE_SIZE + 1 : undefined;
        const found = parseTopSellerCandidates(await http.json(u.toString()), firstRank);
        if (found.length === 0) break; // 이 패스는 바닥 — 다음 패스로
        pages++;
        yield found;
        await sleep(TOPSELLERS_PAGE_INTERVAL_MS);
      }
    }
    return;
  } catch (e) {
    // 이미 넘긴 페이지가 있으면 거기까지가 이번 실행의 수확이다 — 폴백으로 앞부분을 다시 훑지 않는다
    if (pages > 0) {
      console.warn(`[steam] 인기순위 검색 중단 (${pages}페이지까지 수집): ${errorMessage(e)}`);
      return;
    }
    console.warn(`[steam] 인기순위 검색 실패 → featuredcategories 폴백: ${errorMessage(e)}`);
  }
  const u = new URL(STEAM_FEATURED_URL);
  u.searchParams.set("cc", "kr");
  u.searchParams.set("l", "koreana");
  yield parseFeaturedCandidates(await http.json(u.toString()));
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

  /**
   * 본편이 가진 DLC 목록. appdetails 에만 있다 — GetItems 는 자식의 parent_appid 만 준다.
   * 언어는 english 하나로 족하다(목록은 appid 배열이라 언어와 무관하고, 요청을 반으로 줄인다).
   */
  async listDlcIds(appid: string): Promise<string[]> {
    return parseDlcIds(await http.json(appDetailsUrl(appid, "english")), appid);
  },

  /**
   * 이 게임의 구동 사양. english 하나만 받는다 — 라벨이 번역되면 별칭 지도가 몇 배로 커지고
   * 번역이 게임마다 흔들린다(parse-requirements 주석). 값(칩 이름)은 어차피 영문이다.
   */
  async fetchRequirements(appid: string): Promise<RequirementSnapshot[]> {
    return parseAppRequirements(await http.json(appDetailsUrl(appid, "english")), appid);
  },

  /**
   * 이 게임의 패치 공지. 배치가 없어 게임 1개가 요청 1회다 — listDlcIds 와 같은 성격이라
   * 빈도와 건수는 sync/patch-list 가 막는다.
   */
  async listPatchNotes(appid: string): Promise<PatchNote[]> {
    return parseSteamPatchNotes(await http.json(newsUrl(appid)), appid);
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

  discoverPages: steamDiscoverPages,
};
