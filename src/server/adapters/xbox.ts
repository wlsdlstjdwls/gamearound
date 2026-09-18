// Xbox Store 어댑터 — 설계서 §4.1. Microsoft Display Catalog(공개 JSON, 인증 불필요) 기반.
//   검색: productFamilies/autosuggest  |  단건: products?bigIds=<ProductId>  |  발견: emerald 의 browse
// PoC(2026-09-11): market=KR 에서 4개 타이틀 제목, KRW 가격, 출시일 파싱 확인. 엔드포인트/필드 경로는 이 파일 상수에만 둔다(§10).
import { z } from "zod";
import { slugify } from "@/lib/slug";
import { starsToScore } from "@/lib/user-score";
import {
  AdapterError,
  type SearchCandidate,
  type StoreAdapter,
  type StoreSnapshot,
} from "./types";
import { createHttpClient, notFoundAs } from "./http";
import { isPreOrderExtraTitle } from "@/lib/games/content-kind";
import { sleep } from "@/lib/async";

export const XBOX_CATALOG_URL = "https://displaycatalog.mp.microsoft.com/v7.0";
/**
 * 카탈로그 목록 — xbox.com 스토어가 쓰는 공개 엔드포인트(인증 불필요, MS-CV 헤더는 필수).
 * displaycatalog 에는 목록 API 가 없다: productFamilies/Games/products 는 top, skipItems 를 무시하고
 * 늘 같은 10건만 준다(2026-09-14 실측). 그래서 발견만 이 호스트를 쓴다.
 */
export const XBOX_BROWSE_URL = "https://emerald.xboxservices.com/xboxcomfd/browse";
/** 한 페이지 요청 수. 실제로는 필터링돼 43~48건이 온다(2026-09-14 실측, KR 전체 16,991건) */
export const XBOX_BROWSE_PAGE_SIZE = 50;
/** 발견이 넘길 최대 페이지. 16,991 / 50 ≈ 340 페이지에 여유를 뒀다. 실제 종료 조건은 빈 페이지 */
export const XBOX_DISCOVERY_MAX_PAGES = 400;
export const XBOX_STORE_URL = "https://www.xbox.com/ko-KR/games/store";
export const XBOX_MARKET = "KR";
export const XBOX_LANGUAGE = "ko-KR";
/** 영문 제목용. 게임 slug 와 titleEn 은 영문에서 만든다(steam 과 같은 규칙) */
export const XBOX_LANGUAGE_EN = "en-US";
/** products?bigIds= 에 한 번에 넣을 ID 수. 3건 응답 확인(2026-09-14), 보수적으로 20 */
export const XBOX_BIGIDS_BATCH = 20;
/** 가로 배너(카드, 목록용) 후보 — 앞에 있는 것부터 고른다 */
export const XBOX_IMAGE_WIDE = ["TitledHeroArt", "SuperHeroArt", "FeaturePromotionalSquareArt"];
/** 세로 아트(상세 헤더용) 후보 */
export const XBOX_IMAGE_TALL = ["Poster", "BrandedKeyArt", "BoxArt"];
/** 추가 콘텐츠 응답의 RelatedProducts 에서 본편을 가리키는 관계 이름 */
export const XBOX_ADDON_PARENT_RELATION = "addOnParent";

/**
 * 추가 콘텐츠 목록이 들어 있는 스토어 페이지 상태 키. 실제 키는 `PRODUCTADDONS_<ProductId>` 다.
 *
 * 왜 HTML 을 읽는가: JSON API 는 유무(Properties.HasAddOns)까지만 준다(위 주석). 목록은
 * xbox.com 상품 페이지가 `__PRELOADED_STATE__` 에 실어 보내는 것뿐이다(2026-09-14 실측).
 * 주소의 슬러그 자리는 서버가 무시한다 — 아무 값이나 넣어도 같은 페이지가 온다(`/x/<ProductId>` 확인).
 *
 * 한계: 페이지에 오는 것은 **첫 묶음뿐**이다. 철권 8(9PPSM14VKCLW)은 totalItems 30 인데 25건만 실려 온다.
 * 나머지는 페이지 안에서 더 불러오는 몫이라 여기서는 못 본다. 상한(DLC_PER_GAME_MAX)이 어차피 더 낮아
 * 지금은 손해가 없지만, 목록이 30개에서 잘려 보이면 이 한계를 먼저 의심할 것.
 */
export const XBOX_ADDONS_KEY = (productId: string): string => `PRODUCTADDONS_${productId}`;
/** ProductKind 가 이 값이면 본편이 아니라 추가 콘텐츠다. 본편은 "Game" 으로 온다 */
export const XBOX_ADDON_KIND = "Durable";
/** 상태 키 뒤에서 products 배열을 찾을 때 넘겨다볼 글자 수. 한 줄짜리 900KB HTML 이라 창을 둬야 한다 */
export const XBOX_ADDONS_SCAN_WINDOW = 20_000;

// ---- 응답 스키마 ----
const priceSchema = z.object({
  CurrencyCode: z.string().nullish(),
  ListPrice: z.number().nullish(), // 현재 판매가
  MSRP: z.number().nullish(), // 정가
});

const availabilitySchema = z.object({
  Actions: z.array(z.string()).nullish(),
  OrderManagementData: z.object({ Price: priceSchema.nullish() }).nullish(),
  // 할인 기간 — 할인 중이 아니면 상시 판매 구간이라 "종료 없음" 센티널(9998년)이 온다
  Conditions: z.object({ StartDate: z.string().nullish(), EndDate: z.string().nullish() }).nullish(),
});

const imageSchema = z.object({ ImagePurpose: z.string().nullish(), Uri: z.string().nullish() });

const productSchema = z.object({
  ProductId: z.string(),
  /**
   * 본편인지 추가 콘텐츠인지. 본편은 "Game", 추가 콘텐츠는 "Durable" 로 온다(2026-09-14 실측:
   * 철권 8 = Game, "철권 8 시즌 3 패스" = Durable). 이 값이 없으면 본편으로 본다 —
   * 우리가 보는 목록이 게임 카탈로그라 기본값이 그쪽이 맞다.
   */
  ProductKind: z.string().nullish(),
  /**
   * 추가 콘텐츠 유무. 이 JSON API 는 유무만 주고 목록은 주지 않는다(2026-09-14 실측):
   * storefront 의 /v9.0/products/<id>/addons 는 200 을 주지만 AddOns 가 늘 빈 배열이고
   * (KR, US, GB 모두, deviceFamily 를 바꿔도 같음), displaycatalog 응답의 RelatedProducts 는 null 이다.
   * 목록은 스토어 페이지 HTML 에만 있다 — listDlcIds 와 XBOX_ADDONS_KEY 주석 참고.
   */
  // 추가 콘텐츠 상품은 이 값이 null 로 온다(2026-09-14 실측) — optional 만으로는 파싱이 통째로 실패해서
  // DLC 가 한 건도 등록되지 않았다. "모른다"와 "없다"를 갈라 두려면 nullish 여야 한다
  Properties: z.object({ HasAddOns: z.boolean().nullish() }).optional(),
  LocalizedProperties: z
    .array(
      z.object({
        // 이 스토어는 "값 없음" 을 키 생략이 아니라 null 로 준다(2026-09-15 실측: ShortDescription null).
        // optional 만 달면 그 상품 하나 때문에 응답 전체가 거절된다 — Properties 에서 이미 한 번 겪은 함정이다.
        ProductTitle: z.string().nullish(),
        DeveloperName: z.string().nullish(),
        PublisherName: z.string().nullish(),
        ShortDescription: z.string().nullish(),
        Images: z.array(imageSchema).nullish().default([]),
      }),
    )
    .default([]),
  MarketProperties: z
    .array(
      z.object({
        OriginalReleaseDate: z.string().nullish(),
        /**
         * 이용자 별점. 기간별로 여러 줄이 온다(7Days, 30Days, AllTime).
         * AllTime 만 쓴다 — 7일치는 표본이 수십 건이라 신작 하나가 별 하나로 출렁인다
         * (2026-09-15 실측, 팰월드: 7일 4.4/73명, 30일 4.4/512명, 전체 3.9/57,919명).
         */
        UsageData: z
          .array(
            z.object({
              AggregateTimeSpan: z.string().nullish(),
              AverageRating: z.number().nullish(),
              RatingCount: z.number().nullish(),
            }),
          )
          .default([]),
        /**
         * 관계 목록. 방향에 주의한다 — 본편 응답에서는 늘 비어 있어서 여기로 DLC 목록을 만들 수 없지만
         * (위 Properties.HasAddOns 주석), **추가 콘텐츠 응답에는 addOnParent 로 본편 ProductId 가 들어 있다**
         * (2026-09-16 실측). 자식에서 부모로 올라가는 길만 열려 있는 셈이다.
         */
        RelatedProducts: z
          .array(z.object({ RelatedProductId: z.string().nullish(), RelationshipType: z.string().nullish() }))
          .nullish()
          .default([]),
      }),
    )
    .default([]),
  DisplaySkuAvailabilities: z.array(z.object({ Availabilities: z.array(availabilitySchema).default([]) })).default([]),
});

/**
 * 응답 봉투. 상품을 여기서 검증하지 않고 z.unknown 으로 받아 두는 것이 요점이다.
 *
 * 왜: fetchMany 는 한 번에 20건을 묻고 "응답에 없는 ID 만 그 게임의 실패" 로 치려 한다.
 * 그런데 배열 전체를 한 번에 검증하면 상품 하나의 필드가 예상을 벗어나는 순간 나머지 19건까지
 * 같이 죽는다 — 2026-09-15 실측으로 이게 실제로 일어나고 있었다(ShortDescription 이 null 인
 * 상품 하나 때문에 배치 20건이 통째로 실패, 한 실행에서 200건 중 100건이 이렇게 날아갔다).
 * 게다가 호출부는 그 사유를 모르고 "비공개, 미판매, 삭제 추정" 으로 기록해 진단까지 틀어졌다.
 * 그래서 검증은 **우리가 찾는 상품 하나에만** 건다(parseXboxProduct).
 */
const productsEnvelopeSchema = z.object({ Products: z.array(z.unknown()).default([]) });
/** 봉투 안에서 원하는 상품을 고를 때만 쓰는 최소 스키마 */
const productIdSchema = z.object({ ProductId: z.string() });

/** browse 응답 — 목록은 productSummaries 에 있고, channels 는 페이지 메타라 쓰지 않는다 */
const browseSchema = z.object({
  productSummaries: z
    .array(z.object({ productId: z.string(), title: z.string().optional(), productKind: z.string().optional() }))
    .default([]),
});

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
function toIsoDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** 상시 판매 구간의 "종료 없음" 센티널(9998-12-30 등)은 할인 기간이 아니다 */
const XBOX_NO_END_YEAR = 9000;

/** ISO datetime 문자열 → ISO. 센티널, 잘못된 값은 null */
export function xboxPeriodDate(v: string | null | undefined): string | null {
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
      // 두 값 다 null 로 오는 자리가 있어 nullish 로 받는다 — 하나라도 비면 이 SKU 는 값을 모르는 것이다
      const current = p.ListPrice ?? p.MSRP;
      const list = p.MSRP ?? p.ListPrice;
      if (current == null || list == null) continue;
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
/**
 * 목적(ImagePurpose)이 앞선 것부터 골라 절대 주소로 돌려준다.
 * Uri 는 "//store-images..." 처럼 스킴이 빠진 채로 온다 — 그대로 쓰면 화면에서 깨진다.
 */
export function xboxImageUrl(images: Array<{ ImagePurpose?: string | null; Uri?: string | null }>, purposes: string[]): string | null {
  for (const purpose of purposes) {
    const uri = images.find((i) => i.ImagePurpose === purpose && i.Uri)?.Uri;
    if (uri) return uri.startsWith("//") ? `https:${uri}` : uri;
  }
  return null;
}

/**
 * 한국어 응답 하나로 가격, 출시일을 읽고, 영문 응답이 있으면 게임 마스터 정보(meta)를 붙인다.
 * meta 가 있어야 이 소스만 아는 게임(Xbox 독점작)을 새로 만들 수 있다 — 없으면 가격만 붙이는 소스가 된다.
 * titleEn 을 영문 응답에서 가져오는 이유: slug 를 한국어로 만들면 다른 소스와 매칭이 안 된다.
 */
/** 봉투에서 상품 원본 배열만 꺼낸다. null = 봉투 자체가 깨짐. 던지지 않는다 — 영문 경로가 이걸 무시하고 넘어간다 */
function rawProductsOf(raw: unknown): unknown[] | null {
  const env = productsEnvelopeSchema.safeParse(raw);
  return env.success ? env.data.Products : null;
}

/** 전체 기간 별점 묶음. 기간 이름이 이것뿐이라 상수로 박는다 */
const XBOX_USAGE_ALL_TIME = "AllTime";

/**
 * 유저 점수 — 전체 기간 평균 별점. 별점을 매긴 사람이 없으면 값을 주지 않는다.
 * 평균이 0 으로 오는 건은 "0점" 이 아니라 "아직 아무도 안 매김" 이라 같이 버린다.
 */
function xboxUserScore(product: { MarketProperties: Array<{ UsageData: Array<{ AggregateTimeSpan?: string | null; AverageRating?: number | null; RatingCount?: number | null }> }> }): StoreSnapshot["userScore"] {
  const usage = product.MarketProperties[0]?.UsageData ?? [];
  const all = usage.find((u) => u.AggregateTimeSpan === XBOX_USAGE_ALL_TIME);
  const count = all?.RatingCount ?? 0;
  if (!all?.AverageRating || count <= 0) return null;
  const value = starsToScore(all.AverageRating);
  return value === null ? null : { value, kind: "star_average", count };
}

/**
 * 이 ID 의 상품 원본. 대소문자를 가리지 않고 찾는다 — 스토어는 ProductId 를 대문자로 돌려주는데
 * 우리가 들고 있는 SKU 는 소문자일 수 있다(psprices 병합분이 전부 소문자다).
 *
 * 못 찾으면 없는 것으로 본다. 예전에는 `?? products[0]` 으로 떨어졌고 그 관용이 배치 조회에서
 * 사고를 냈다 — 소문자 ID 20개를 한 번에 물으면 하나도 일치하지 않아 **요청한 전원이 첫 상품의
 * 값(제목, 커버, ProductKind)을 받았다**(2026-09-16 실측). 다른 상품을 이 상품이라고 말하느니
 * 없다고 하는 편이 안전하다. 배치에서 못 찾은 ID 는 그 건만 실패한다(fetchMany 주석 참고).
 */
function pickRawProduct(products: unknown[], productId: string): unknown {
  const want = productId.toLowerCase();
  return products.find((p) => productIdSchema.safeParse(p).data?.ProductId?.toLowerCase() === want);
}

export function parseXboxProduct(raw: unknown, productId: string, rawEn?: unknown): StoreSnapshot {
  const products = rawProductsOf(raw);
  if (!products) throw new AdapterError(`Xbox 응답 형식 오류: 상품 배열이 없다 (${productId})`, "xbox", false);
  const rawProduct = pickRawProduct(products, productId);
  if (rawProduct === undefined) throw new AdapterError(`Xbox 게임 없음: ${productId}`, "xbox", false);
  const parsed = productSchema.safeParse(rawProduct);
  if (!parsed.success) throw new AdapterError(`Xbox 응답 형식 오류: ${parsed.error.message}`, "xbox", false);
  const product = parsed.data;

  const title = product.LocalizedProperties[0]?.ProductTitle?.trim() || productId;
  // ProductKind 가 "Game" 이어도 예약 특전, 예약 팩은 본편이 아니다 — 스토어가 안 가르는 자리다(lib/games/content-kind).
  // Sku.Properties.IsPreOrder 는 못 쓴다: 예약 중인 **본편**의 SKU 에도 true 가 실린다(2026-09-18 원문 확인)
  const isDlc = product.ProductKind === XBOX_ADDON_KIND || isPreOrderExtraTitle(title);
  const price = pickKrwPurchase(product);
  const discountPct = price && price.list > 0 && price.current < price.list ? Math.round(((price.list - price.current) / price.list) * 100) : 0;

  return {
    platform: "xbox",
    userScore: xboxUserScore(product),
    storeExternalId: product.ProductId,
    storeUrl: xboxStoreUrl(product.ProductId, title),
    listPrice: price ? price.list : null,
    currentPrice: price ? price.current : null,
    discountPct: price ? discountPct : null,
    // 기간은 할인 중일 때만 의미가 있다(상시 판매 구간의 시작일을 "할인 시작"으로 오해하지 않게)
    discountStartsAt: discountPct > 0 ? price?.startsAt ?? null : null,
    discountEndsAt: discountPct > 0 ? price?.endsAt ?? null : null,
    releaseDate: toIsoDate(product.MarketProperties[0]?.OriginalReleaseDate),
    contentType: isDlc ? "dlc" : "game",
    // 본편 쪽에서 물으면 이 자리가 비어 있다 — 부모를 말해 주는 건 추가 콘텐츠 응답뿐이다
    parentExternalId: isDlc ? xboxAddOnParentId(product) : null,
    // DLC 자신에게는 "추가 콘텐츠 유무"가 의미 없다 — null 은 모른다는 뜻이라 기존 값을 덮지 않는다
    hasAddOns: isDlc ? null : product.Properties?.HasAddOns ?? null,
    meta: xboxMeta(product, rawEn ? titleOf(rawEn, productId) : null),
  };
}

/**
 * 이 추가 콘텐츠가 붙는 본편의 ProductId. 없으면 null — 부모를 모른다는 뜻이고, 그 자리는 비워 둔다.
 * 같은 배열에 Bundle, SellableBy 같은 다른 관계가 섞여 오므로 관계 이름을 반드시 본다.
 */
function xboxAddOnParentId(product: z.infer<typeof productSchema>): string | null {
  for (const mp of product.MarketProperties) {
    const hit = (mp.RelatedProducts ?? []).find(
      (r) => r.RelationshipType === XBOX_ADDON_PARENT_RELATION && r.RelatedProductId,
    );
    if (hit?.RelatedProductId) return hit.RelatedProductId;
  }
  return null;
}

/** 영문 응답에서 이 상품의 제목만 꺼낸다. 형식이 깨져 있으면 없는 것으로 본다 — 가격 수집을 막지 않는다 */
function titleOf(rawEn: unknown, productId: string): string | null {
  const products = rawProductsOf(rawEn);
  if (!products) return null;
  const hit = productSchema.safeParse(pickRawProduct(products, productId));
  if (!hit.success) return null;
  return hit.data.LocalizedProperties[0]?.ProductTitle?.trim() || null;
}

/** 게임 마스터 정보. 영문 제목이 없으면 meta 자체를 만들지 않는다(한국어 slug 로 게임을 만들지 않기 위해) */
function xboxMeta(
  product: z.infer<typeof productSchema>,
  titleEn: string | null,
): StoreSnapshot["meta"] {
  if (!titleEn) return undefined;
  const lp = product.LocalizedProperties[0];
  const titleKo = lp?.ProductTitle?.trim() || null;
  return {
    titleEn,
    titleKo: titleKo && titleKo !== titleEn ? titleKo : null,
    description: lp?.ShortDescription?.trim() || null,
    coverUrl: xboxImageUrl(lp?.Images ?? [], XBOX_IMAGE_WIDE),
    portraitUrl: xboxImageUrl(lp?.Images ?? [], XBOX_IMAGE_TALL),
    developer: lp?.DeveloperName?.trim() || null,
    publisher: lp?.PublisherName?.trim() || null,
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

/** browse 응답 → 후보 (productKind=Game 만. 추가 콘텐츠는 본편 수집이 따로 들여온다) */
export function parseXboxBrowse(raw: unknown): SearchCandidate[] {
  const parsed = browseSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`Xbox 목록 응답 형식 오류: ${parsed.error.message}`, "xbox", false);
  const out: SearchCandidate[] = [];
  const seen = new Set<string>();
  for (const p of parsed.data.productSummaries) {
    if (p.productKind && p.productKind !== "Game") continue;
    const title = p.title?.trim();
    // 제목이 없으면 흡수 판단(제목 역매칭)을 할 수 없다 — 중복 등록을 만드느니 건너뛴다
    if (!title || seen.has(p.productId)) continue;
    seen.add(p.productId);
    out.push({ externalId: p.productId, title, url: xboxStoreUrl(p.productId, title) });
  }
  return out;
}

// ---- 네트워크 ----

/** 요청마다 새 상관 ID (MS-CV). 값 자체는 검증되지 않지만 카탈로그 API 관례상 포함 */
function correlationId(): string {
  return Math.random().toString(36).slice(2, 12);
}

/** products?bigIds= 주소. ID 를 쉼표로 잇는다 */
function productsUrl(productIds: string[], language: string): string {
  const u = new URL(`${XBOX_CATALOG_URL}/products`);
  u.searchParams.set("bigIds", productIds.join(","));
  u.searchParams.set("market", XBOX_MARKET);
  u.searchParams.set("languages", language);
  return u.toString();
}

/**
 * 스토어 페이지 HTML 에서 그 게임의 추가 콘텐츠 ProductId 목록을 꺼낸다.
 *
 * 같은 페이지에 "비슷한 게임"(SeededProductChannel) 같은 다른 상품 묶음도 실려 오므로
 * 반드시 PRODUCTADDONS_<이 게임 id> 블록 안에서만 읽는다. 그 키는 두 번 나오는데(목록 블록,
 * 제목 블록) products 를 가진 쪽만 쓴다.
 */
export function parseXboxAddOnIds(html: string, productId: string): string[] {
  const key = XBOX_ADDONS_KEY(productId);
  const out: string[] = [];
  const seen = new Set<string>();
  let from = 0;
  for (;;) {
    const at = html.indexOf(key, from);
    if (at === -1) break;
    from = at + key.length;
    const window = html.slice(from, from + XBOX_ADDONS_SCAN_WINDOW);
    // 항목이 {"productId":"..."} 뿐이라 대괄호가 안쪽에 없다 — 여는 괄호 뒤를 닫는 괄호까지 그대로 읽는다
    const list = /"products":\[([^\]]*)\]/.exec(window);
    if (!list) continue;
    for (const m of list[1].matchAll(/"productId":"([A-Za-z0-9]+)"/g)) {
      const id = m[1];
      // 자기 자신이 목록에 섞여 오는 경우를 대비한다 — 부모를 자기 DLC 로 등록하면 안 된다
      if (id === productId || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
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

  /** 한국어 + 영문 2회. 영문은 제목만 쓰지만, 그게 있어야 신규 게임을 만들 수 있다 */
  async fetch(productId: string): Promise<StoreSnapshot> {
    const rawKo = await http.json(productsUrl([productId], XBOX_LANGUAGE));
    await sleep(Math.floor(xboxAdapter.minIntervalMs / 2));
    const rawEn = await http.json(productsUrl([productId], XBOX_LANGUAGE_EN));
    return parseXboxProduct(rawKo, productId, rawEn);
  },

  batchSize: XBOX_BIGIDS_BATCH,

  /**
   * 추가 콘텐츠 목록. JSON API 에는 없고 스토어 페이지에만 있어 HTML 을 읽는다(XBOX_ADDONS_KEY 주석).
   * 한 건에 900KB 짜리 응답이라 비싸다 — 호출 빈도와 건수는 sync/dlc-list 가 막아 준다.
   */
  async listDlcIds(productId: string): Promise<string[]> {
    // 슬러그 자리는 서버가 무시한다. 제목을 모르는 자리에서도 부를 수 있게 고정 값을 넣는다
    const html = await http.text(`${XBOX_STORE_URL}/x/${productId}`, { context: `dlc:${productId}` });
    return parseXboxAddOnIds(html, productId);
  },

  /** bigIds 로 한 번에. 배치 하나가 한국어 + 영문 2회 요청으로 끝난다 */
  async fetchMany(productIds: string[]): Promise<Map<string, StoreSnapshot>> {
    if (productIds.length === 0) return new Map();
    const rawKo = await http.json(productsUrl(productIds, XBOX_LANGUAGE));
    await sleep(Math.floor(xboxAdapter.minIntervalMs / 2));
    const rawEn = await http.json(productsUrl(productIds, XBOX_LANGUAGE_EN));
    const out = new Map<string, StoreSnapshot>();
    for (const id of productIds) {
      // 배치 응답에 없는 ID 는 그 게임만 실패다 — 배치 전체를 죽이지 않는다(adapters/types 의 fetchMany 주석)
      try {
        out.set(id, parseXboxProduct(rawKo, id, rawEn));
      } catch {
        continue;
      }
    }
    return out;
  },

  /**
   * 카탈로그를 페이지 단위로 흘려보낸다. 이게 없던 동안 Xbox 는 Steam 으로 들어온 게임에
   * 가격만 붙이는 소스였다 — Xbox 독점작은 한 건도 못 들어왔다(2026-09-14: ref 50건).
   */
  async *discoverPages(): AsyncGenerator<SearchCandidate[]> {
    for (let page = 1; page <= XBOX_DISCOVERY_MAX_PAGES; page++) {
      const u = new URL(XBOX_BROWSE_URL);
      u.searchParams.set("locale", XBOX_LANGUAGE);
      u.searchParams.set("market", XBOX_MARKET);
      u.searchParams.set("PageNumber", String(page));
      u.searchParams.set("ResultsPerPage", String(XBOX_BROWSE_PAGE_SIZE));
      const found = parseXboxBrowse(await http.json(u.toString(), { context: `discover:${page}` }));
      if (found.length === 0) return; // 카탈로그 끝
      yield found;
      await sleep(xboxAdapter.minIntervalMs);
    }
  },
};
