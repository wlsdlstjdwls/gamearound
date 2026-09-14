// Epic Games Store 어댑터 — 설계서 §4.1. 스토어프론트가 쓰는 공개 GraphQL(인증 불필요) 기반.
//   검색, 발견: Catalog.searchStore  |  단건: Catalog.catalogOffer(namespace, id)
// PoC(2026-09-14): country=KR 에서 기본판 6,990건, KRW 정가/할인가/할인 기간/행사명 파싱 확인.
// Cloudflare 가 앞에 있어 브라우저 헤더(Origin, Referer, sec-fetch-*)가 없으면 403 챌린지 HTML 이 온다 —
// 크롤러 UA 만으로는 통과하지 못해 이 어댑터만 UA 를 브라우저 값으로 덮어쓴다(§10 의 UA 명시 예외).
// 헤더를 다 맞춰도 Node 는 막힌다(아래 EPIC_ENABLE_ENV 주석). 지금은 비활성 소스다.
import { z } from "zod";
import {
  AdapterError,
  type SearchCandidate,
  type StoreAdapter,
  type StoreSnapshot,
} from "./types";
import { createHttpClient } from "./http";
import { sleep } from "@/lib/async";

/**
 * 이 소스를 켜는 환경변수. 기본은 비활성이고, 켠다고 바로 되지도 않는다 — 2026-09-14 실측:
 *   - GitHub Actions 러너에서는 curl 로도 403 (데이터센터 IP 차단)
 *   - 가정용 회선에서도 Node(undici, http2, 암호군 교체 전부) 는 403 이고 curl 만 통과 (TLS 지문 차단)
 * 즉 Node 로 부를 수 있는 경로가 지금은 없다. Cloudflare 를 통과하는 전송 수단(프록시 등)이 생기면
 * 이 값만 켜서 되살린다 — 파서와 질의는 그대로 쓸 수 있게 남겨 둔다.
 */
export const EPIC_ENABLE_ENV = "EPIC_CRAWL_ENABLED";

export const EPIC_GRAPHQL_URL = "https://store.epicgames.com/graphql";
export const EPIC_STORE_BASE_URL = "https://store.epicgames.com/ko/p";
export const EPIC_COUNTRY = "KR";
export const EPIC_LOCALE = "ko";
/** searchStore 는 count 를 40 으로 깎는다 — 100 을 넣어도 40건만 온다(2026-09-14 확인) */
export const EPIC_PAGE_SIZE = 40;
/** 기본판만 보는 카테고리. DLC, 애드온, 번들은 여기서 걸러진다 */
export const EPIC_BASE_GAME_CATEGORY = "games/edition/base";
/**
 * 발견이 넘길 수 있는 최대 페이지 수. KR 기본판이 약 7,000건이라 175페이지면 카탈로그를 한 바퀴 돈다.
 * 여유를 둔 상한이고, 실제 종료 조건은 "빈 페이지" 다.
 */
export const EPIC_DISCOVERY_MAX_PAGES = 220;
/** 미발표작의 출시일 센티널(2099-12-31). 이 해 이상이면 출시일 미정으로 본다 */
const EPIC_NO_DATE_YEAR = 2090;
/** 세로 아트(1200×1600), 가로 배너(2560×1440) 키. 응답의 keyImages[].type 값 */
const EPIC_IMAGE_TALL = "OfferImageTall";
const EPIC_IMAGE_WIDE = "OfferImageWide";
/** 상세 페이지 주소를 만들 매핑 종류. addon--cms-hybrid 등 다른 값은 DLC 페이지다 */
const EPIC_PAGE_TYPE_HOME = "productHome";
/** offerType → 본편/DLC. 그 외(번들, 에디션)는 본편으로 두고 목록에서 걸러지게 둔다 */
const EPIC_DLC_OFFER_TYPES = new Set(["DLC", "ADD_ON"]);
/** 행사명 앞에 붙는 분류 꼬리표("[Seasonal Sale] 여름 세일") — 화면에는 행사명만 남긴다 */
const SALE_NAME_TAG = /^\s*\[[^\]]*\]\s*/;

/**
 * 브라우저 헤더. Cloudflare 가 UA 만 보는 게 아니라 Origin/Referer 조합까지 본다 —
 * 하나라도 빠지면 403 이다(2026-09-14 실측). 값은 실제 스토어프론트가 보내는 것과 같게 둔다.
 */
export const EPIC_BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "ko-KR,ko;q=0.9",
  Origin: "https://store.epicgames.com",
  Referer: "https://store.epicgames.com/ko/browse",
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
};

// ---- GraphQL 질의 ----

/** 목록, 단건이 함께 쓰는 오퍼 필드 */
const OFFER_FIELDS = `
  title id namespace description effectiveDate offerType
  productSlug urlSlug developerDisplayName publisherDisplayName
  keyImages { type url }
  catalogNs { mappings { pageSlug pageType } }
  price(country: $country) {
    totalPrice { discountPrice originalPrice currencyCode currencyInfo { decimals } }
    lineOffers { appliedRules { name startDate endDate } }
  }`;

export const EPIC_SEARCH_QUERY = `query search($country: String!, $locale: String, $count: Int, $start: Int, $category: String, $keywords: String, $sortBy: String, $sortDir: String) {
  Catalog { searchStore(country: $country, locale: $locale, count: $count, start: $start, category: $category, keywords: $keywords, sortBy: $sortBy, sortDir: $sortDir) {
    paging { total count }
    elements { ${OFFER_FIELDS} }
  } }
}`;

export const EPIC_OFFER_QUERY = `query offer($country: String!, $locale: String, $namespace: String!, $offerId: String!) {
  Catalog { catalogOffer(namespace: $namespace, id: $offerId, locale: $locale) { ${OFFER_FIELDS} } }
}`;

// ---- 응답 스키마 ----

const offerSchema = z.object({
  title: z.string(),
  id: z.string(),
  namespace: z.string(),
  description: z.string().nullish(),
  effectiveDate: z.string().nullish(),
  offerType: z.string().nullish(),
  productSlug: z.string().nullish(),
  urlSlug: z.string().nullish(),
  developerDisplayName: z.string().nullish(),
  publisherDisplayName: z.string().nullish(),
  keyImages: z.array(z.object({ type: z.string(), url: z.string() })).nullish(),
  catalogNs: z.object({ mappings: z.array(z.object({ pageSlug: z.string(), pageType: z.string() })).nullish() }).nullish(),
  price: z
    .object({
      totalPrice: z.object({
        discountPrice: z.number(),
        originalPrice: z.number(),
        currencyCode: z.string().nullish(),
        currencyInfo: z.object({ decimals: z.number() }).nullish(),
      }),
      lineOffers: z
        .array(z.object({ appliedRules: z.array(z.object({ name: z.string().nullish(), startDate: z.string().nullish(), endDate: z.string().nullish() })).nullish() }))
        .nullish(),
    })
    .nullish(),
});

const searchResponseSchema = z.object({
  data: z.object({
    Catalog: z.object({
      searchStore: z.object({
        paging: z.object({ total: z.number().nullish(), count: z.number().nullish() }).nullish(),
        elements: z.array(offerSchema).nullish(),
      }),
    }),
  }),
});

const offerResponseSchema = z.object({
  data: z.object({ Catalog: z.object({ catalogOffer: offerSchema.nullish() }) }),
});

export type EpicOffer = z.infer<typeof offerSchema>;

// ---- 순수 파서 ----

/**
 * 외부 ID 는 `namespace:offerId` 다. Epic 은 오퍼 ID 하나만으로는 조회가 안 되고
 * 네임스페이스가 항상 함께 필요하다 — 두 값을 한 문자열에 담아 다른 소스와 같은 계약을 지킨다.
 */
export function epicExternalId(namespace: string, offerId: string): string {
  return `${namespace}:${offerId}`;
}

export function parseEpicExternalId(externalId: string): { namespace: string; offerId: string } {
  const [namespace, offerId] = externalId.split(":");
  if (!namespace || !offerId) {
    throw new AdapterError(`Epic 외부 ID 형식 오류(namespace:offerId 여야 함): ${externalId}`, "epic", false);
  }
  return { namespace, offerId };
}

/** ISO datetime → YYYY-MM-DD. 미발표 센티널(2099)과 잘못된 값은 null */
export function epicReleaseDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() >= EPIC_NO_DATE_YEAR) return null;
  return d.toISOString().slice(0, 10);
}

/** "[Seasonal Sale] End of Summer Sale 2026" → "End of Summer Sale 2026" */
export function epicSaleName(v: string | null | undefined): string | null {
  if (!v) return null;
  const cleaned = v.replace(SALE_NAME_TAG, "").trim();
  return cleaned || null;
}

export function epicStoreUrl(offer: EpicOffer): string {
  const home = offer.catalogNs?.mappings?.find((m) => m.pageType === EPIC_PAGE_TYPE_HOME)?.pageSlug;
  const slug = home ?? offer.productSlug ?? offer.urlSlug ?? offer.id;
  // productSlug 는 상품이 사라지면 "{}" 로 온다 — 그 자리엔 오퍼 ID 를 넣어도 스토어가 찾아 준다
  return `${EPIC_STORE_BASE_URL}/${slug === "{}" ? offer.id : slug.replace(/\/home$/, "")}`;
}

function imageUrl(offer: EpicOffer, type: string): string | null {
  return offer.keyImages?.find((i) => i.type === type)?.url ?? null;
}

/** 적용 중인 할인 규칙 하나. 여러 개면 첫 번째(스토어가 실제로 표시하는 것)를 쓴다 */
function appliedRule(offer: EpicOffer): { name: string | null; startsAt: string | null; endsAt: string | null } | null {
  for (const line of offer.price?.lineOffers ?? []) {
    for (const rule of line.appliedRules ?? []) {
      return { name: epicSaleName(rule.name), startsAt: rule.startDate ?? null, endsAt: rule.endDate ?? null };
    }
  }
  return null;
}

/** 오퍼 → StoreSnapshot. KRW 가 아니면 가격을 비워 둔다(지역 미판매) */
export function toEpicSnapshot(offer: EpicOffer): StoreSnapshot {
  const total = offer.price?.totalPrice;
  const krw = total && (total.currencyCode ?? "KRW") === "KRW";
  // 통화 최소 단위로 오는 값이라 자릿수만큼 나눈다. KRW 는 decimals=0 이지만 계약을 믿지 않고 계산한다
  const scale = 10 ** (total?.currencyInfo?.decimals ?? 0);
  const listPrice = krw && total ? Math.round(total.originalPrice / scale) : null;
  const currentPrice = krw && total ? Math.round(total.discountPrice / scale) : null;
  const discountPct =
    listPrice !== null && currentPrice !== null && listPrice > 0 && currentPrice < listPrice
      ? Math.round(((listPrice - currentPrice) / listPrice) * 100)
      : currentPrice === null
        ? null
        : 0;
  const rule = discountPct && discountPct > 0 ? appliedRule(offer) : null;

  return {
    platform: "epic",
    storeExternalId: epicExternalId(offer.namespace, offer.id),
    storeUrl: epicStoreUrl(offer),
    listPrice,
    currentPrice,
    discountPct,
    discountStartsAt: rule?.startsAt ?? null,
    discountEndsAt: rule?.endsAt ?? null,
    discountName: rule?.name ?? null,
    releaseDate: epicReleaseDate(offer.effectiveDate),
    contentType: EPIC_DLC_OFFER_TYPES.has(offer.offerType ?? "") ? "dlc" : "game",
    // Epic 독점작은 Steam 에 없어 이 스냅샷으로 게임 마스터를 새로 만든다 → meta 가 있어야 한다.
    // 제목은 locale=ko 에서도 원어 하나만 오므로 titleEn 자리에 넣고 titleKo 는 비운다.
    // 장르는 채우지 않는다 — tags 에 장르("RPG")와 기능("Cloud Saves", "Windows")이 섞여 오고
    // 태그 ID 로 장르만 가려낼 공개 목록이 없다. 잘못 넣으면 장르 필터가 오염된다.
    meta: {
      titleEn: offer.title.trim(),
      titleKo: null,
      description: offer.description?.trim() || null,
      coverUrl: imageUrl(offer, EPIC_IMAGE_WIDE),
      portraitUrl: imageUrl(offer, EPIC_IMAGE_TALL),
      developer: offer.developerDisplayName?.trim() || null,
      publisher: offer.publisherDisplayName?.trim() || null,
    },
  };
}

export function parseEpicSearch(raw: unknown): EpicOffer[] {
  const parsed = searchResponseSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`Epic 검색 응답 형식 오류: ${parsed.error.message}`, "epic", false);
  return parsed.data.data.Catalog.searchStore.elements ?? [];
}

export function parseEpicOffer(raw: unknown, externalId: string): StoreSnapshot {
  const parsed = offerResponseSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`Epic 응답 형식 오류: ${parsed.error.message}`, "epic", false);
  const offer = parsed.data.data.Catalog.catalogOffer;
  if (!offer) throw new AdapterError(`Epic 게임 없음: ${externalId}`, "epic", false);
  return toEpicSnapshot(offer);
}

export function toEpicCandidate(offer: EpicOffer): SearchCandidate {
  return { externalId: epicExternalId(offer.namespace, offer.id), title: offer.title.trim(), url: epicStoreUrl(offer) };
}

// ---- 네트워크 ----

// transport: "curl" 인 이유 — Node 는 헤더를 다 맞춰도 403 이다. 자세한 실측은 adapters/curl.ts 상단
const http = createHttpClient({ source: "epic", label: "Epic", headers: EPIC_BROWSER_HEADERS, transport: "curl" });

async function graphql(query: string, variables: Record<string, unknown>, context: string): Promise<unknown> {
  return http.json(EPIC_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    context,
  });
}

export const epicAdapter: StoreAdapter = {
  source: "epic",
  minIntervalMs: 1000,

  async search(query: string): Promise<SearchCandidate[]> {
    const raw = await graphql(
      EPIC_SEARCH_QUERY,
      { country: EPIC_COUNTRY, locale: EPIC_LOCALE, count: EPIC_PAGE_SIZE, start: 0, category: EPIC_BASE_GAME_CATEGORY, keywords: query },
      `search:${query}`,
    );
    return parseEpicSearch(raw).map(toEpicCandidate);
  },

  async fetch(externalId: string): Promise<StoreSnapshot> {
    const { namespace, offerId } = parseEpicExternalId(externalId);
    const raw = await graphql(EPIC_OFFER_QUERY, { country: EPIC_COUNTRY, locale: EPIC_LOCALE, namespace, offerId }, externalId);
    return parseEpicOffer(raw, externalId);
  },

  /**
   * 카탈로그를 출시일 내림차순으로 훑는다.
   * limit 은 상한일 뿐이고 워크플로는 카탈로그보다 큰 값(EPIC_SEED_TOP)을 넘겨 한 바퀴를 다 돌게 한다 —
   * 이미 아는 것을 걸러내는 일은 호출부(sync/store-targets)가 하므로, 여기서 신작 N개만 돌려주면
   * 매 실행이 같은 목록을 내고 나머지 카탈로그는 영원히 안 들어온다.
   * 한 바퀴가 약 175 요청(1초 간격 ≈ 3분)이라 하루 3회 실행에도 부담이 크지 않다.
   */
  async discover(limit: number): Promise<SearchCandidate[]> {
    const out: SearchCandidate[] = [];
    const seen = new Set<string>();
    for (let page = 0; page < EPIC_DISCOVERY_MAX_PAGES && out.length < limit; page++) {
      const raw = await graphql(
        EPIC_SEARCH_QUERY,
        {
          country: EPIC_COUNTRY,
          locale: EPIC_LOCALE,
          count: EPIC_PAGE_SIZE,
          start: page * EPIC_PAGE_SIZE,
          category: EPIC_BASE_GAME_CATEGORY,
          sortBy: "releaseDate",
          sortDir: "DESC",
        },
        `discover:${page}`,
      );
      const offers = parseEpicSearch(raw);
      if (offers.length === 0) break; // 카탈로그 끝
      for (const offer of offers) {
        const candidate = toEpicCandidate(offer);
        if (seen.has(candidate.externalId)) continue;
        seen.add(candidate.externalId);
        out.push(candidate);
      }
      await sleep(epicAdapter.minIntervalMs);
    }
    return out;
  },
};
