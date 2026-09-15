// GOG 응답 파서 — 외부 JSON 은 unknown 으로 받아 zod 로만 통과시킨다.
// 응답이 바뀌면 잘못된 값을 반영하는 대신 여기서 형식 오류로 멈춘다.
import { z } from "zod";
import { AdapterError, type SearchCandidate, type StoreSnapshot } from "../types";

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
  /** expand=changelog 를 붙였을 때만 온다. 변경 기록 전체가 붙은 HTML 한 덩어리다 */
  changelog: z.string().nullish(),
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
