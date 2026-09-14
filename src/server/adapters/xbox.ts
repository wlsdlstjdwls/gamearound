// Xbox Store 어댑터 — 설계서 §4.1. Microsoft Display Catalog(공개 JSON, 인증 불필요) 기반.
//   검색: productFamilies/autosuggest  |  단건: products?bigIds=<ProductId>
// PoC(2026-09-11): market=KR 에서 4개 타이틀 제목, KRW 가격, 출시일 파싱 확인. 엔드포인트/필드 경로는 이 파일 상수에만 둔다(§10).
import { z } from "zod";
import { slugify } from "@/lib/slug";
import {
  AdapterError,
  type SearchCandidate,
  type StoreAdapter,
  type StoreSnapshot,
} from "./types";
import { createHttpClient, notFoundAs } from "./http";

export const XBOX_CATALOG_URL = "https://displaycatalog.mp.microsoft.com/v7.0";
export const XBOX_STORE_URL = "https://www.xbox.com/ko-KR/games/store";
export const XBOX_MARKET = "KR";
export const XBOX_LANGUAGE = "ko-KR";

// ---- 응답 스키마 ----
const priceSchema = z.object({
  CurrencyCode: z.string().optional(),
  ListPrice: z.number().optional(), // 현재 판매가
  MSRP: z.number().optional(), // 정가
});

const availabilitySchema = z.object({
  Actions: z.array(z.string()).optional(),
  OrderManagementData: z.object({ Price: priceSchema.optional() }).optional(),
  // 할인 기간 — 할인 중이 아니면 상시 판매 구간이라 "종료 없음" 센티널(9998년)이 온다
  Conditions: z.object({ StartDate: z.string().optional(), EndDate: z.string().optional() }).optional(),
});

const productSchema = z.object({
  ProductId: z.string(),
  /**
   * 추가 콘텐츠 유무. **유무뿐이고 목록은 없다** — 다시 조사하지 말 것(2026-09-14 실측).
   * storefront 의 /v9.0/products/<id>/addons 는 200 을 주지만 AddOns 가 늘 빈 배열이었다
   * (KR, US, GB 모두, deviceFamily 를 바꿔도 같음). displaycatalog 응답에도 RelatedProducts 는 null 이다.
   * 그래서 화면은 "추가 콘텐츠가 있어요" 까지만 말하고 목록은 스팀에서 온 것만 보여준다.
   */
  Properties: z.object({ HasAddOns: z.boolean().optional() }).optional(),
  LocalizedProperties: z
    .array(z.object({ ProductTitle: z.string().optional(), DeveloperName: z.string().optional(), PublisherName: z.string().optional() }))
    .default([]),
  MarketProperties: z.array(z.object({ OriginalReleaseDate: z.string().optional() })).default([]),
  DisplaySkuAvailabilities: z.array(z.object({ Availabilities: z.array(availabilitySchema).default([]) })).default([]),
});

const productsResponseSchema = z.object({ Products: z.array(productSchema).default([]) });

const autosuggestSchema = z.object({
  Results: z
    .array(
      z.object({
        ProductFamilyName: z.string().optional(),
        Products: z.array(z.object({ ProductId: z.string(), Title: z.string(), Type: z.string().optional() })).default([]),
      }),
    )
    .default([]),
});

// ---- 순수 파서 ----

/** ISO datetime → YYYY-MM-DD (UTC 기준). 잘못된 값은 null */
function toIsoDate(v: string | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** 상시 판매 구간의 "종료 없음" 센티널(9998-12-30 등)은 할인 기간이 아니다 */
const XBOX_NO_END_YEAR = 9000;

/** ISO datetime 문자열 → ISO. 센티널, 잘못된 값은 null */
export function xboxPeriodDate(v: string | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() >= XBOX_NO_END_YEAR) return null;
  return d.toISOString();
}

/** 구매 가능한 KRW 가용성(Availability) 하나 선택. 없으면 null(미판매/게임패스 전용 등) */
function pickKrwPurchase(
  product: z.infer<typeof productSchema>,
): { list: number; current: number; startsAt: string | null; endsAt: string | null } | null {
  for (const sku of product.DisplaySkuAvailabilities) {
    for (const a of sku.Availabilities) {
      const p = a.OrderManagementData?.Price;
      if (!p || p.CurrencyCode !== "KRW") continue;
      if (!a.Actions?.includes("Purchase")) continue;
      const current = p.ListPrice ?? p.MSRP;
      const list = p.MSRP ?? p.ListPrice;
      if (current === undefined || list === undefined) continue;
      return {
        list,
        current,
        startsAt: xboxPeriodDate(a.Conditions?.StartDate),
        endsAt: xboxPeriodDate(a.Conditions?.EndDate),
      };
    }
  }
  return null;
}

export function xboxStoreUrl(productId: string, title: string): string {
  return `${XBOX_STORE_URL}/${slugify(title) || "game"}/${productId}`;
}

/** products?bigIds 응답 → StoreSnapshot. Products 가 비면 게임 없음(재시도 없음) */
export function parseXboxProduct(raw: unknown, productId: string): StoreSnapshot {
  const parsed = productsResponseSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`Xbox 응답 형식 오류: ${parsed.error.message}`, "xbox", false);
  const product = parsed.data.Products.find((p) => p.ProductId === productId) ?? parsed.data.Products[0];
  if (!product) throw new AdapterError(`Xbox 게임 없음: ${productId}`, "xbox", false);

  const title = product.LocalizedProperties[0]?.ProductTitle?.trim() || productId;
  const price = pickKrwPurchase(product);
  const discountPct = price && price.list > 0 && price.current < price.list ? Math.round(((price.list - price.current) / price.list) * 100) : 0;

  return {
    platform: "xbox",
    storeExternalId: product.ProductId,
    storeUrl: xboxStoreUrl(product.ProductId, title),
    listPrice: price ? price.list : null,
    currentPrice: price ? price.current : null,
    discountPct: price ? discountPct : null,
    // 기간은 할인 중일 때만 의미가 있다(상시 판매 구간의 시작일을 "할인 시작"으로 오해하지 않게)
    discountStartsAt: discountPct > 0 ? price?.startsAt ?? null : null,
    discountEndsAt: discountPct > 0 ? price?.endsAt ?? null : null,
    releaseDate: toIsoDate(product.MarketProperties[0]?.OriginalReleaseDate),
    hasAddOns: product.Properties?.HasAddOns ?? null,
  };
}

/** autosuggest 응답 → 후보 (Type=Game 만) */
export function parseXboxAutosuggest(raw: unknown): SearchCandidate[] {
  const parsed = autosuggestSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`Xbox 검색 응답 형식 오류: ${parsed.error.message}`, "xbox", false);
  const out: SearchCandidate[] = [];
  const seen = new Set<string>();
  for (const group of parsed.data.Results) {
    for (const p of group.Products) {
      if (p.Type && p.Type !== "Game") continue;
      if (seen.has(p.ProductId)) continue;
      seen.add(p.ProductId);
      out.push({ externalId: p.ProductId, title: p.Title.trim(), url: xboxStoreUrl(p.ProductId, p.Title) });
    }
  }
  return out;
}

// ---- 네트워크 ----

/** 요청마다 새 상관 ID (MS-CV). 값 자체는 검증되지 않지만 카탈로그 API 관례상 포함 */
function correlationId(): string {
  return Math.random().toString(36).slice(2, 12);
}

const http = createHttpClient({
  source: "xbox",
  label: "Xbox",
  headers: () => ({ "MS-CV": correlationId() }),
  onStatus: notFoundAs("xbox", (ctx) => `Xbox 게임 없음 (${ctx})`),
});

export const xboxAdapter: StoreAdapter = {
  source: "xbox",
  minIntervalMs: 1500,

  async search(query: string): Promise<SearchCandidate[]> {
    const u = new URL(`${XBOX_CATALOG_URL}/productFamilies/autosuggest`);
    u.searchParams.set("market", XBOX_MARKET);
    u.searchParams.set("languages", XBOX_LANGUAGE);
    u.searchParams.set("query", query);
    u.searchParams.set("productFamilyNames", "Games");
    return parseXboxAutosuggest(await http.json(u.toString()));
  },

  async fetch(productId: string): Promise<StoreSnapshot> {
    const u = new URL(`${XBOX_CATALOG_URL}/products`);
    u.searchParams.set("bigIds", productId);
    u.searchParams.set("market", XBOX_MARKET);
    u.searchParams.set("languages", XBOX_LANGUAGE);
    return parseXboxProduct(await http.json(u.toString()), productId);
  },
};
