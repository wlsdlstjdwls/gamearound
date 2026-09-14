// GOG 어댑터 — 설계서 §4.1. 공개 JSON API(인증 불필요) 기반.
//   발견, 검색: catalog.gog.com/v1/catalog  |  단건, 배치: api.gog.com/products + products/prices
// PoC(2026-09-14): countryCode=KR 에서 기본 게임 6,381건 확인. 막는 것 없이 Node 에서 그대로 200 이다.
//
// **가격이 달러다.** GOG 는 한국에 원화로 팔지 않는다(currencyCode=KRW 로 조회하면 0건).
// 그래서 이 어댑터만 currency:"USD" 를 얹고, 화면의 비교, 정렬은 lib/currency 의 규칙이 따로 거른다.
// locale 은 en-US 고정이다 — ko-KR 을 넣으면 카탈로그가 0건으로 온다(같은 날 확인).
import { z } from "zod";
import {
  AdapterError,
  type SearchCandidate,
  type StoreAdapter,
  type StoreSnapshot,
} from "./types";
import { createHttpClient } from "./http";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";

export const GOG_CATALOG_URL = "https://catalog.gog.com/v1/catalog";
export const GOG_API_URL = "https://api.gog.com";
export const GOG_COUNTRY = "KR";
/** ko-KR 은 카탈로그를 0건으로 만든다 — 제목도 영문으로 온다 */
export const GOG_LOCALE = "en-US";
/** 카탈로그 한 페이지 최대치(실측 100). 전체 6,000여 건이 64페이지 안에 들어온다 */
export const GOG_CATALOG_PAGE_SIZE = 100;
/** 발견이 넘길 최대 페이지. 실제 종료 조건은 빈 페이지다 */
export const GOG_DISCOVERY_MAX_PAGES = 120;
/** 본편만 — 카탈로그의 productType 필터. DLC, 팩은 빠진다 */
export const GOG_GAME_FILTER = "in:game";
/** 배치 조회에 한 번에 넣을 ID 수. products 와 prices 를 각각 한 번씩 부른다 */
export const GOG_BATCH_SIZE = 50;
/** "699 USD" 처럼 최소 단위 정수 + 통화 코드로 온다 */
const MONEY = /^(\d+)\s+([A-Z]{3})$/;
/** 우리 스키마가 아는 통화. 다른 통화가 오면 조용히 원화인 척하지 않고 실패시킨다 */
const SUPPORTED_CURRENCIES = new Set(["USD", "KRW"]);

// ---- 응답 스키마 ----

const productSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string().nullish(),
  game_type: z.string().nullish(),
  is_secret: z.boolean().nullish(),
  /**
   * 본편이 가진 DLC. 값이 없으면 빈 배열([])로, 있으면 객체로 온다 — 같은 필드가 두 모양이다(2026-09-14 실측).
   * expand=expanded_dlcs 를 붙이지 않아도 products 안에 id 가 들어 있어 목록은 이것만으로 충분하다.
   */
  dlcs: z.union([z.array(z.unknown()), z.object({ products: z.array(z.object({ id: z.number() })).default([]) })]).nullish(),
  release_date: z.string().nullish(),
  images: z.object({ logo2x: z.string().nullish(), logo: z.string().nullish() }).nullish(),
  links: z.object({ product_card: z.string().nullish() }).nullish(),
});

const priceItemSchema = z.object({
  _embedded: z.object({
    product: z.object({ id: z.number() }),
    prices: z
      .array(z.object({ currency: z.object({ code: z.string() }).nullish(), basePrice: z.string(), finalPrice: z.string() }))
      .default([]),
  }),
});

const pricesResponseSchema = z.object({ _embedded: z.object({ items: z.array(priceItemSchema).default([]) }) });

const catalogProductSchema = z.object({
  id: z.string(),
  slug: z.string().nullish(),
  title: z.string(),
  productType: z.string().nullish(),
});

const catalogResponseSchema = z.object({
  productCount: z.number().nullish(),
  products: z.array(catalogProductSchema).nullish(),
});

export type GogProduct = z.infer<typeof productSchema>;

// ---- 순수 파서 ----

/** "699 USD" → { amount: 699, currency: "USD" }. 형식이 다르면 null */
export function parseGogMoney(raw: string | null | undefined): { amount: number; currency: string } | null {
  if (!raw) return null;
  const m = raw.trim().match(MONEY);
  if (!m) return null;
  return { amount: Number(m[1]), currency: m[2] };
}

/** "2012-01-26T05:57:00+0100" → "2012-01-26". 못 읽으면 null */
export function gogReleaseDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** GOG 이미지 주소는 프로토콜이 빠진 채로 온다(//images...) */
export function gogImageUrl(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.startsWith("//") ? `https:${v}` : v;
}

export function gogStoreUrl(product: GogProduct): string {
  return product.links?.product_card ?? `https://www.gog.com/game/${product.slug ?? product.id}`;
}

/** 상품 + 가격 → StoreSnapshot. 가격을 못 읽으면 가격만 비운다(상품 자체는 살린다) */
export function toGogSnapshot(product: GogProduct, price: { basePrice: string; finalPrice: string; currencyCode: string } | null): StoreSnapshot {
  const base = parseGogMoney(price?.basePrice);
  const final = parseGogMoney(price?.finalPrice);
  const code = price?.currencyCode ?? base?.currency ?? null;
  if (code !== null && !SUPPORTED_CURRENCIES.has(code)) {
    throw new AdapterError(`GOG 가 모르는 통화로 응답: ${code} (${product.id})`, "gog", false);
  }
  const listPrice = base?.amount ?? null;
  const currentPrice = final?.amount ?? null;
  const discountPct =
    listPrice !== null && currentPrice !== null && listPrice > 0 && currentPrice < listPrice
      ? Math.round(((listPrice - currentPrice) / listPrice) * 100)
      : currentPrice === null
        ? null
        : 0;

  // game_type 이 "game" 이 아니면 본편이 아니다 — "dlc"(추가 콘텐츠)와 "pack"(묶음판)이 온다.
  // 묶음판은 DLC 가 아니라 에디션이므로 본편으로 둔다. 우리가 DLC 로 세는 것은 "dlc" 뿐이다.
  const isDlc = (product.game_type ?? "game") === "dlc";
  const dlcExternalIds = gogDlcIds(product);

  return {
    platform: "gog",
    storeExternalId: String(product.id),
    storeUrl: gogStoreUrl(product),
    contentType: isDlc ? "dlc" : "game",
    dlcExternalIds,
    // DLC 자신에게는 "추가 콘텐츠 유무"가 의미 없다 — null 은 모른다는 뜻이라 기존 값을 덮지 않는다
    hasAddOns: isDlc ? null : dlcExternalIds.length > 0,
    listPrice,
    currentPrice,
    // 한국에는 달러로 판다. 원화로 환산하지 않는 이유는 schema 의 currencyEnum 주석에 있다
    currency: code === "KRW" ? "KRW" : "USD",
    discountPct,
    releaseDate: gogReleaseDate(product.release_date),
    // GOG 는 할인 기간, 행사명을 공개 API 로 주지 않는다 — 할인율만 안다
    meta: {
      titleEn: product.title.trim(),
      titleKo: null,
      coverUrl: gogImageUrl(product.images?.logo2x ?? product.images?.logo),
      developer: null,
      publisher: null,
    },
  };
}

/**
 * 본편이 가진 DLC 의 외부 ID. 없으면 빈 배열.
 * dlcs 는 없을 때 [] 로, 있을 때 { products: [...] } 로 오는 두 모양이라 모양부터 가른다.
 */
export function gogDlcIds(product: GogProduct): string[] {
  const dlcs = product.dlcs;
  if (!dlcs || Array.isArray(dlcs)) return [];
  return dlcs.products.map((p) => String(p.id));
}

/**
 * 상품 응답 파싱. 비공개 상품만 걸러낸다.
 *
 * 예전에는 여기서 game_type!=game 도 걸렀는데, 그러면 DLC 를 **콕 집어 물어도** 빈손이 돌아온다.
 * DLC 등록 단계(sync/dlc-writer)는 부모가 알려준 id 로 이 경로를 다시 타므로, 여기서 걸러 버리면
 * GOG DLC 는 영원히 등록되지 않는다(2026-09-14 기준 GOG DLC 11건, 대부분 스팀에서 온 것).
 * "본편이 아닌 것을 새 게임으로 만들지 않는다"는 규칙은 발견 단계가 이미 지킨다 — 카탈로그 질의에
 * productType=in:game(GOG_GAME_FILTER)을 걸어 DLC, 팩이 아예 목록에 오지 않는다.
 */
export function parseGogProducts(raw: unknown): GogProduct[] {
  const parsed = z.array(productSchema).safeParse(raw);
  if (!parsed.success) throw new AdapterError(`GOG 상품 응답 형식 오류: ${parsed.error.message}`, "gog", false);
  return parsed.data.filter((p) => !p.is_secret);
}

/** 가격 응답 → 상품 ID별 가격. 가격이 없는 상품은 Map 에 담기지 않는다 */
export function parseGogPrices(raw: unknown): Map<string, { basePrice: string; finalPrice: string; currencyCode: string }> {
  const parsed = pricesResponseSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`GOG 가격 응답 형식 오류: ${parsed.error.message}`, "gog", false);
  const out = new Map<string, { basePrice: string; finalPrice: string; currencyCode: string }>();
  for (const item of parsed.data._embedded.items) {
    const price = item._embedded.prices[0];
    if (!price) continue;
    out.set(String(item._embedded.product.id), {
      basePrice: price.basePrice,
      finalPrice: price.finalPrice,
      currencyCode: price.currency?.code ?? "USD",
    });
  }
  return out;
}

export function parseGogCatalog(raw: unknown): SearchCandidate[] {
  const parsed = catalogResponseSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`GOG 카탈로그 응답 형식 오류: ${parsed.error.message}`, "gog", false);
  return (parsed.data.products ?? []).map((p) => ({
    externalId: p.id,
    title: p.title.trim(),
    url: `https://www.gog.com/game/${p.slug ?? p.id}`,
  }));
}

// ---- 네트워크 ----

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
