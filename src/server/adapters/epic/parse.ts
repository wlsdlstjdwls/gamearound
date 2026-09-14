// Epic 응답 파서 — 스키마 검증과 순수 변환만. 네트워크도 DB 도 여기서 만지지 않는다.
// 형식 검증은 zod 로 하고, 실패는 재시도해도 같은 결과라 retryable=false 로 올린다.
import { z } from "zod";
import { AdapterError, type SearchCandidate, type StoreSnapshot } from "../types";
import { EPIC_STORE_BASE_URL } from "./constants";

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
