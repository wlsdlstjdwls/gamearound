// Steam 스토어 어댑터 — 설계서 §4.1/§4.2. 기준 소스(공식 API). 가져오기만 하고 DB 반영은 sync/가 맡음.
// 파싱 함수(parse*)는 네트워크와 분리되어 있어 fixture 기반 테스트가 가능하다.
import { z } from "zod";
import {
  AdapterError,
  CRAWLER_USER_AGENT,
  type SearchCandidate,
  type StoreAdapter,
  type StoreSnapshot,
} from "./types";

export const STEAM_APPDETAILS_URL = "https://store.steampowered.com/api/appdetails";
export const STEAM_STORESEARCH_URL = "https://store.steampowered.com/api/storesearch/";
export const STEAM_FEATURED_URL = "https://store.steampowered.com/api/featuredcategories";
/** 인기순위 검색(비공식 JSON, 페이지당 최대 100개). featuredcategories 는 60개 안팎이라 시드 상위 N개용으로는 부족 */
export const STEAM_TOPSELLERS_URL = "https://store.steampowered.com/search/results/";
const TOPSELLERS_PAGE_SIZE = 100;
const TOPSELLERS_MAX_PAGES = 5;
const TOPSELLERS_PAGE_INTERVAL_MS = 1500;
export const STEAM_STORE_APP_URL = "https://store.steampowered.com/app";
/** 할인 종료 시각·행사명은 appdetails 에 없다. 공개 스토어 API(GetItems)의 active_discounts 에만 있다 */
export const STEAM_STOREITEMS_URL = "https://api.steampowered.com/IStoreBrowseService/GetItems/v1/";
const FETCH_TIMEOUT_MS = 15_000;

// ---- 응답 스키마 (unknown → zod) ----
const priceOverviewSchema = z.object({
  currency: z.string().optional(),
  initial: z.number(), // 센트 단위 (KRW × 100)
  final: z.number(),
  discount_percent: z.number().optional(),
});

const appDataSchema = z.object({
  type: z.string().optional(),
  name: z.string(),
  steam_appid: z.number().optional(),
  is_free: z.boolean().optional(),
  short_description: z.string().optional(),
  header_image: z.string().optional(),
  developers: z.array(z.string()).optional(),
  publishers: z.array(z.string()).optional(),
  price_overview: priceOverviewSchema.optional(),
  categories: z.array(z.object({ id: z.number(), description: z.string() })).optional(),
  genres: z.array(z.object({ id: z.union([z.string(), z.number()]), description: z.string() })).optional(),
  release_date: z.object({ coming_soon: z.boolean().optional(), date: z.string().optional() }).optional(),
});

const appDetailsResponseSchema = z.record(
  z.string(),
  z.object({ success: z.boolean(), data: appDataSchema.optional() }),
);

const storeSearchSchema = z.object({
  total: z.number().optional(),
  items: z
    .array(z.object({ id: z.number(), name: z.string(), type: z.string().optional() }))
    .default([]),
});

const featuredItemSchema = z.object({ id: z.number(), name: z.string().optional(), type: z.number().optional() });
const featuredCategoriesSchema = z.object({
  top_sellers: z.object({ items: z.array(featuredItemSchema).default([]) }).optional(),
  specials: z.object({ items: z.array(featuredItemSchema).default([]) }).optional(),
});

/** GetItems 응답 — 할인 기간·행사명만 쓴다 */
const storeItemsSchema = z.object({
  response: z
    .object({
      store_items: z
        .array(
          z.object({
            appid: z.number().optional(),
            best_purchase_option: z
              .object({
                discount_pct: z.number().optional(),
                active_discounts: z
                  .array(z.object({ discount_end_date: z.number().optional(), discount_description: z.string().optional() }))
                  .default([]),
              })
              .optional(),
          }),
        )
        .default([]),
    })
    .default({ store_items: [] }),
});

/** search/results?json=1 — items 에 appid 가 없고 logo URL(.../apps/<appid>/...) 에만 들어 있다 */
const searchResultsSchema = z.object({
  items: z.array(z.object({ name: z.string().optional(), logo: z.string().optional() })).default([]),
});
const APP_ID_IN_LOGO_URL = /\/apps\/(\d+)\//;

export type SteamAppData = z.infer<typeof appDataSchema>;

// ---- 순수 파서 ----

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Steam 출시일 문자열 → YYYY-MM-DD. "2020년 12월 10일", "10 Dec, 2020", "Dec 10, 2020", "2020-12-10" 지원. 불명확하면 null */
export function parseSteamDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  const pad = (n: number) => String(n).padStart(2, "0");
  const build = (y: number, m: number, d: number) =>
    m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : null;

  let m = s.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/);
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    return mon ? build(Number(m[3]), mon, Number(m[1])) : null;
  }
  m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()];
    return mon ? build(Number(m[3]), mon, Number(m[2])) : null;
  }
  return null;
}

/** Steam categories 로 멀티플레이 정보 추론 (§11-7: 카테고리 태그만 사용, 인원수는 알 수 없음) */
export function inferMultiplayer(categories: Array<{ description: string }> | undefined): NonNullable<StoreSnapshot["meta"]>["multiplayer"] {
  const descs = (categories ?? []).map((c) => c.description.toLowerCase());
  const has = (kw: string) => descs.some((d) => d.includes(kw));
  const solo = has("single-player");
  const coop = has("co-op");
  const pvp = has("pvp");
  const multi = has("multi-player") || has("mmo") || coop || pvp;
  if (!solo && !multi) return undefined;
  return { solo, coop, pvp };
}

function centsToKrw(cents: number): number {
  return Math.round(cents / 100);
}

function extractAppData(raw: unknown, appid: string): SteamAppData | null {
  const parsed = appDetailsResponseSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`appdetails 응답 형식 오류 (appid=${appid}): ${parsed.error.message}`, "steam", false);
  const entry = parsed.data[appid];
  if (!entry || !entry.success || !entry.data) return null;
  return entry.data;
}

/**
 * appdetails 응답(koreana) + 선택적으로 english 응답 → StoreSnapshot.
 * - 가격: price_overview.initial/final(센트) → KRW 정수. 무료 게임은 0, 미판매/미출시는 null
 * - titleKo: koreana name (영문 name과 같으면 null → UI는 titleEn 사용)
 */
export function parseAppDetails(rawKo: unknown, appid: string, rawEn?: unknown): StoreSnapshot {
  const ko = extractAppData(rawKo, appid);
  if (!ko) throw new AdapterError(`appid ${appid} 를 찾을 수 없거나 success=false`, "steam", false);
  const en = rawEn === undefined ? null : extractAppData(rawEn, appid);

  let listPrice: number | null = null;
  let currentPrice: number | null = null;
  let discountPct: number | null = null;
  if (ko.price_overview) {
    listPrice = centsToKrw(ko.price_overview.initial);
    currentPrice = centsToKrw(ko.price_overview.final);
    discountPct = ko.price_overview.discount_percent ?? (listPrice > 0 ? Math.round((1 - currentPrice / listPrice) * 100) : 0);
  } else if (ko.is_free) {
    listPrice = 0;
    currentPrice = 0;
    discountPct = 0;
  }

  const titleEn = (en?.name ?? ko.name).trim();
  const titleKoRaw = ko.name.trim();
  const titleKo = titleKoRaw && titleKoRaw !== titleEn ? titleKoRaw : null;
  const releaseDate = parseSteamDate(en?.release_date?.date) ?? parseSteamDate(ko.release_date?.date);

  return {
    platform: "steam",
    storeExternalId: appid,
    storeUrl: `${STEAM_STORE_APP_URL}/${appid}`,
    listPrice,
    currentPrice,
    discountPct,
    currentVersion: null,
    releaseDate,
    meta: {
      titleEn,
      titleKo,
      description: ko.short_description?.trim() || null,
      coverUrl: ko.header_image ?? null,
      developer: ko.developers?.[0] ?? null,
      publisher: ko.publishers?.[0] ?? null,
      genres: (ko.genres ?? []).map((g) => g.description.trim()).filter(Boolean),
      multiplayer: inferMultiplayer(ko.categories),
    },
  };
}

/**
 * discount_description 토큰 → 한국어 행사명.
 * Steam 은 language=koreana 로 물어도 "#discount_desc_preset_weekend" 같은 토큰을 준다(2026-09-14 확인).
 * 모르는 토큰은 계절 키워드로 한 번 더 시도하고, 그래도 모르면 null(가짜 이름을 만들지 않는다).
 */
export const STEAM_DISCOUNT_LABELS: Record<string, string> = {
  daily: "데일리 딜",
  midweek: "미드위크 할인",
  weekend: "주말 특가",
  weeklong: "주간 할인",
  special: "특별 할인",
  publisher: "퍼블리셔 세일",
  franchise: "프랜차이즈 세일",
  launch: "출시 기념 할인",
  prerelease: "예약 구매 할인",
  freeweekend: "무료 주말",
  bundle: "번들 할인",
};
const STEAM_SEASON_LABELS: Array<[RegExp, string]> = [
  [/spring/, "봄 세일"],
  [/summer/, "여름 세일"],
  [/autumn|fall/, "가을 세일"],
  [/winter/, "겨울 세일"],
  [/lunar/, "설 세일"],
  [/halloween|scream/, "할로윈 세일"],
  [/golden|award/, "스팀 어워드 페스티벌"],
  [/next[_-]?fest/, "넥스트 페스트"],
];

export function steamDiscountLabel(description: string | undefined): string | null {
  if (!description) return null;
  const key = description.replace(/^#?discount_desc_(preset_)?/, "").trim().toLowerCase();
  if (!key) return null;
  if (STEAM_DISCOUNT_LABELS[key]) return STEAM_DISCOUNT_LABELS[key];
  for (const [re, label] of STEAM_SEASON_LABELS) if (re.test(key)) return label;
  return null;
}

export type SteamDiscountInfo = { discountEndsAt: string | null; discountName: string | null };

/** GetItems 응답 → 할인 종료 시각(ISO)·행사명. 할인 중이 아니면 둘 다 null */
export function parseStoreItemDiscount(raw: unknown, appid: string): SteamDiscountInfo {
  const parsed = storeItemsSchema.safeParse(raw);
  if (!parsed.success) return { discountEndsAt: null, discountName: null };
  const items = parsed.data.response.store_items;
  const item = items.find((i) => String(i.appid) === appid) ?? items[0];
  const discount = item?.best_purchase_option?.active_discounts?.[0];
  if (!discount) return { discountEndsAt: null, discountName: null };
  const end = discount.discount_end_date;
  return {
    discountEndsAt: end && end > 0 ? new Date(end * 1000).toISOString() : null,
    discountName: steamDiscountLabel(discount.discount_description),
  };
}

/** storesearch 응답 → 검색 후보 (앱만, 번들/DLC 제외 불가 — type 필드가 "app"인 것만) */
export function parseStoreSearch(raw: unknown): SearchCandidate[] {
  const parsed = storeSearchSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`storesearch 응답 형식 오류: ${parsed.error.message}`, "steam", false);
  return parsed.data.items
    .filter((it) => !it.type || it.type === "app")
    .map((it) => ({ externalId: String(it.id), title: it.name, url: `${STEAM_STORE_APP_URL}/${it.id}` }));
}

/** featuredcategories 응답 → top_sellers + specials 의 appid 상위 n개 (중복 제거, type=0 앱만) */
export function parseFeaturedAppIds(raw: unknown, n: number): string[] {
  const parsed = featuredCategoriesSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`featuredcategories 응답 형식 오류: ${parsed.error.message}`, "steam", false);
  const items = [...(parsed.data.top_sellers?.items ?? []), ...(parsed.data.specials?.items ?? [])];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (it.type !== undefined && it.type !== 0) continue; // 0 = 앱, 그 외 패키지/번들
    const id = String(it.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= n) break;
  }
  return out;
}

/** search/results 응답 → logo URL 에서 appid 추출 (subs/bundles 는 /apps/ 경로가 아니므로 자연 제외, 중복 제거) */
export function parseTopSellerAppIds(raw: unknown): string[] {
  const parsed = searchResultsSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`search/results 응답 형식 오류: ${parsed.error.message}`, "steam", false);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of parsed.data.items) {
    const id = it.logo?.match(APP_ID_IN_LOGO_URL)?.[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

// ---- 네트워크 ----

async function fetchJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": CRAWLER_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    throw new AdapterError(`Steam 요청 실패 (${url}): ${e instanceof Error ? e.message : String(e)}`, "steam", true);
  }
  if (res.status === 429 || res.status >= 500) throw new AdapterError(`Steam HTTP ${res.status} (${url})`, "steam", true);
  if (!res.ok) throw new AdapterError(`Steam HTTP ${res.status} (${url})`, "steam", false);
  try {
    return await res.json();
  } catch (e) {
    throw new AdapterError(`Steam JSON 파싱 실패 (${url}): ${e instanceof Error ? e.message : String(e)}`, "steam", true);
  }
}

/** GetItems 는 input_json 쿼리 하나로 받는다. 한 번에 여러 id 도 가능하지만 어댑터 구조상 1건씩 */
function storeItemsUrl(appid: string): string {
  const input = {
    ids: [{ appid: Number(appid) }],
    context: { language: "koreana", country_code: "KR", steam_realm: 1 },
    data_request: { include_basic_info: true },
  };
  const u = new URL(STEAM_STOREITEMS_URL);
  u.searchParams.set("input_json", JSON.stringify(input));
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
 * scripts/crawl.ts --seed-top=N 용: 인기순위 appid 상위 n개 (§11-1: 전체가 아닌 상위 N개).
 * 1차 인기순위 검색(페이지네이션) → 실패/빈 응답 시 featuredcategories(top_sellers+specials) 폴백.
 */
export async function fetchSteamTopAppIds(n: number): Promise<string[]> {
  const ids: string[] = [];
  const seen = new Set<string>();
  try {
    for (let page = 0; page < TOPSELLERS_MAX_PAGES && ids.length < n; page++) {
      const u = new URL(STEAM_TOPSELLERS_URL);
      u.searchParams.set("json", "1");
      u.searchParams.set("filter", "topsellers");
      u.searchParams.set("cc", "kr");
      u.searchParams.set("l", "koreana");
      u.searchParams.set("count", String(TOPSELLERS_PAGE_SIZE));
      u.searchParams.set("start", String(page * TOPSELLERS_PAGE_SIZE));
      const pageIds = parseTopSellerAppIds(await fetchJson(u.toString()));
      if (pageIds.length === 0) break;
      for (const id of pageIds) {
        if (seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
        if (ids.length >= n) break;
      }
      if (ids.length < n) await new Promise((r) => setTimeout(r, TOPSELLERS_PAGE_INTERVAL_MS));
    }
  } catch (e) {
    console.warn(`[steam] 인기순위 검색 실패 → featuredcategories 폴백: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (ids.length > 0) return ids;

  const u = new URL(STEAM_FEATURED_URL);
  u.searchParams.set("cc", "kr");
  u.searchParams.set("l", "koreana");
  return parseFeaturedAppIds(await fetchJson(u.toString()), n);
}

export const steamAdapter: StoreAdapter = {
  source: "steam",
  minIntervalMs: 1500,

  async search(query: string): Promise<SearchCandidate[]> {
    const u = new URL(STEAM_STORESEARCH_URL);
    u.searchParams.set("term", query);
    u.searchParams.set("cc", "kr");
    u.searchParams.set("l", "koreana");
    return parseStoreSearch(await fetchJson(u.toString()));
  },

  /**
   * koreana + english 2회 호출(영문 제목/출시일 확보). 사이 간격은 minIntervalMs 의 절반만 둔다.
   * 할인 중일 때만 GetItems 를 1회 더 호출해 종료 시각·행사명을 붙인다(할인 아닌 게임엔 요청을 늘리지 않음).
   * GetItems 실패는 가격 수집을 막지 않는다 — 부가 정보라 경고만 남기고 넘어간다.
   */
  async fetch(appid: string): Promise<StoreSnapshot> {
    const rawKo = await fetchJson(appDetailsUrl(appid, "koreana"));
    await new Promise((r) => setTimeout(r, Math.floor(steamAdapter.minIntervalMs / 2)));
    const rawEn = await fetchJson(appDetailsUrl(appid, "english"));
    const snapshot = parseAppDetails(rawKo, appid, rawEn);
    if (!snapshot.discountPct || snapshot.discountPct <= 0) return snapshot;
    try {
      const info = parseStoreItemDiscount(await fetchJson(storeItemsUrl(appid)), appid);
      return { ...snapshot, discountEndsAt: info.discountEndsAt, discountName: info.discountName };
    } catch (e) {
      console.warn(`[steam] 할인 기간 조회 실패 (appid=${appid}): ${e instanceof Error ? e.message : String(e)}`);
      return snapshot;
    }
  },
};
