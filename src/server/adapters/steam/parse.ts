// 순수 파서 — 네트워크와 분리되어 있어 fixture 기반 테스트가 가능하다(steam.test.ts).
import { AdapterError, type SearchCandidate, type StoreSnapshot } from "../types";
import {
  APP_ID_IN_LOGO_URL,
  appDetailsResponseSchema,
  featuredCategoriesSchema,
  searchResultsSchema,
  storeItemsSchema,
  storeSearchSchema,
  type SteamAppData,
  type StoreItem,
} from "./schemas";
import { PLAYER_CATEGORY, STEAM_ASSET_BASE_URL, STEAM_GENRE_TAG_IDS, STEAM_STORE_APP_URL } from "./constants";

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

/**
 * GetItems assets → 이미지 절대 URL. asset_url_format 의 ${FILENAME} 자리에 해당 에셋 파일명을 끼운다.
 * kind="header" 는 460×215 가로 배너(카드용), "library_capsule" 은 600×900 세로 아트(상세 헤더용).
 */
export function steamAssetUrl(
  assets: { asset_url_format?: string; header?: string; library_capsule?: string } | undefined,
  kind: "header" | "library_capsule" = "header",
): string | null {
  const filename = assets?.[kind];
  if (!assets?.asset_url_format || !filename) return null;
  return `${STEAM_ASSET_BASE_URL}/${assets.asset_url_format.replace("${FILENAME}", filename)}`;
}

/** GetItems 는 출시 시각을 unix 초로 준다. 날짜로 자를 때는 한국 스토어 표기와 같은 KST 기준이어야 한다 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** unix seconds → YYYY-MM-DD (KST). 0/미정은 null */
export function unixToIsoDate(sec: number | undefined): string | null {
  if (!sec || sec <= 0) return null;
  const d = new Date(sec * 1000 + KST_OFFSET_MS);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** 문자열 센트 → KRW 정수. 빈 값/파싱 실패는 null */
function centsStrToKrw(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n / 100) : null;
}

function priceOf(item: StoreItem): { listPrice: number | null; currentPrice: number | null; discountPct: number | null } {
  const opt = item.best_purchase_option;
  const current = centsStrToKrw(opt?.final_price_in_cents);
  if (current === null) {
    // 구매 옵션이 없는 경우: 무료 게임은 0원, 그 외(미출시·미판매)는 값 없음
    return item.is_free ? { listPrice: 0, currentPrice: 0, discountPct: 0 } : { listPrice: null, currentPrice: null, discountPct: null };
  }
  const list = centsStrToKrw(opt?.original_price_in_cents) ?? current;
  const pct = opt?.discount_pct ?? (list > 0 ? Math.round((1 - current / list) * 100) : 0);
  return { listPrice: list, currentPrice: current, discountPct: pct };
}

function multiplayerOf(item: StoreItem): NonNullable<StoreSnapshot["meta"]>["multiplayer"] {
  const ids = item.categories?.supported_player_categoryids ?? [];
  if (ids.length === 0) return undefined;
  const has = (group: readonly number[]) => group.some((id) => ids.includes(id));
  const coop = has(PLAYER_CATEGORY.coop);
  const pvp = has(PLAYER_CATEGORY.pvp);
  return { solo: has(PLAYER_CATEGORY.solo), coop, pvp };
}

function isUsableItem(item: StoreItem): boolean {
  return item.appid !== undefined && item.success !== 0 && item.visible !== false && (item.item_type ?? 0) === 0;
}

/**
 * GetItems 응답(koreana) + 선택적으로 english 응답 → appid별 StoreSnapshot.
 * appdetails(게임당 ko/en 2회) + GetItems(할인 시 1회) 를 100개당 2회로 줄이는 배치 경로.
 * 응답에 없거나 success=0 인 appid 는 Map 에서 빠진다 — 호출부가 그 건만 실패로 처리한다.
 */
export function parseStoreItems(rawKo: unknown, rawEn?: unknown): Map<string, StoreSnapshot> {
  const parsed = storeItemsSchema.safeParse(rawKo);
  if (!parsed.success) throw new AdapterError(`GetItems 응답 형식 오류: ${parsed.error.message}`, "steam", false);
  const enNames = new Map<string, string>();
  if (rawEn !== undefined) {
    const en = storeItemsSchema.safeParse(rawEn);
    if (en.success) {
      for (const it of en.data.response.store_items) {
        if (it.appid !== undefined && it.name) enNames.set(String(it.appid), it.name.trim());
      }
    }
  }

  const out = new Map<string, StoreSnapshot>();
  for (const item of parsed.data.response.store_items) {
    if (!isUsableItem(item)) continue;
    const appid = String(item.appid);
    const nameKo = item.name?.trim() ?? "";
    const titleEn = enNames.get(appid) || nameKo;
    if (!titleEn) continue; // 제목이 없으면 게임 마스터를 만들 수 없다
    const discount = item.best_purchase_option?.active_discounts?.[0];
    const { listPrice, currentPrice, discountPct } = priceOf(item);
    out.set(appid, {
      platform: "steam",
      storeExternalId: appid,
      storeUrl: `${STEAM_STORE_APP_URL}/${appid}`,
      listPrice,
      currentPrice,
      discountPct,
      discountEndsAt: discount?.discount_end_date ? new Date(discount.discount_end_date * 1000).toISOString() : null,
      discountName: steamDiscountLabel(discount?.discount_description),
      currentVersion: null,
      releaseDate: unixToIsoDate(item.release?.steam_release_date),
      meta: {
        titleEn,
        titleKo: nameKo && nameKo !== titleEn ? nameKo : null,
        description: item.basic_info?.short_description?.trim() || null,
        coverUrl: steamAssetUrl(item.assets),
        portraitUrl: steamAssetUrl(item.assets, "library_capsule"),
        developer: item.basic_info?.developers?.[0]?.name ?? null,
        publisher: item.basic_info?.publishers?.[0]?.name ?? null,
        genres: item.tagids.map((id) => STEAM_GENRE_TAG_IDS[id]).filter((g): g is string => Boolean(g)),
        multiplayer: multiplayerOf(item),
      },
    });
  }
  return out;
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
