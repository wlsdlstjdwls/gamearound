// PlayStation Store 응답 파서 — 목록(콘셉트 격자), 콘셉트 상세, 검색.
// 형식 검증은 zod 로 하고, 실패는 재시도해도 같은 결과라 retryable=false 로 올린다.
import { z } from "zod";
import { isCurrencyItemTitle } from "@/lib/games/content-kind";
import { AdapterError, type SearchCandidate, type StoreSnapshot } from "../types";
import type { Platform } from "@/server/db/schema";
import {
  PSSTORE_CONCEPT_URL,
  PSSTORE_COVER_ROLE,
  PSSTORE_COVER_WIDTH,
  PSSTORE_INCLUSION_CTA,
  PSSTORE_LANGUAGE_SUFFIX,
  PSSTORE_PORTRAIT_ROLE,
  PSSTORE_PRODUCT_URL,
  PSSTORE_PORTRAIT_WIDTH,
  PSSTORE_PS4_TITLE_ID,
  PSSTORE_PS5_TITLE_ID,
  PSSTORE_UPSELL_APPLICABILITY,
} from "./constants";

const productRefSchema = z.object({ id: z.string() });

/** 역할별 대표 이미지. 영상(type="VIDEO")도 같은 배열에 섞여 온다 */
const mediaSchema = z.object({ role: z.string().nullish(), type: z.string().nullish(), url: z.string().nullish() });

const gridSchema = z.object({
  data: z.object({
    categoryGridRetrieve: z.object({
      concepts: z
        .array(z.object({ id: z.string(), name: z.string().nullish(), media: z.array(mediaSchema).nullish() }))
        .nullish(),
    }),
  }),
});

/** 가격은 최소 단위 정수(basePriceValue)와 표시 문자열이 같이 온다. 우리는 정수만 쓴다 */
const priceSchema = z.object({
  basePriceValue: z.number().nullish(),
  discountedValue: z.number().nullish(),
  currencyCode: z.string().nullish(),
  /** 할인 종료 시각(epoch ms 문자열). 할인이 아니어도 값이 있을 수 있어 할인일 때만 읽는다 */
  endTime: z.string().nullish(),
  isFree: z.boolean().nullish(),
  /**
   * 이 가격이 "누구에게" 해당하는지. "APPLICABLE" 이면 지금 살 수 있는 값이고,
   * "UPSELL" 이면 구독에 가입해야 받는 값이다 — 아래 PSSTORE_UPSELL_APPLICABILITY 참고.
   */
  applicability: z.string().nullish(),
});

/**
 * 구매/업셀 버튼 하나. type 이 무슨 버튼인지 말하고, price 가 그 버튼의 값을 담는다.
 * 구독 포함 여부는 type 으로만 가른다 — PSSTORE_INCLUSION_CTA 주석 참고.
 */
const ctaSchema = z.object({ type: z.string().nullish(), price: priceSchema.nullish() });

const conceptSchema = z.object({
  data: z.object({
    conceptRetrieve: z
      .object({
        id: z.string(),
        releaseDate: z.object({ value: z.string().nullish() }).nullish(),
        products: z.array(productRefSchema).nullish(),
        defaultProduct: z
          .object({
            id: z.string(),
            name: z.string().nullish(),
            invariantName: z.string().nullish(),
            webctas: z.array(ctaSchema).nullish(),
          })
          .nullish(),
      })
      .nullish(),
  }),
});

const searchSchema = z.object({
  data: z.object({
    universalSearch: z.object({
      results: z.array(z.object({ id: z.string(), name: z.string().nullish() })).nullish(),
    }),
  }),
});

const productSchema = z.object({
  data: z.object({
    productRetrieve: z
      .object({
        id: z.string(),
        invariantName: z.string().nullish(),
        name: z.string().nullish(),
        concept: z.object({ id: z.string() }).nullish(),
        // DLC 를 스냅샷으로 읽을 때만 쓰인다. 검색 경로는 concept.id 만 보고 지나간다
        webctas: z.array(ctaSchema).nullish(),
      })
      .nullish(),
  }),
});

const fail = (what: string, e: z.ZodError): never => {
  throw new AdapterError(`PlayStation ${what} 응답 형식 오류: ${e.message}`, "psstore", false);
};

/** 지원 언어 표기를 뗀 제목. "PRAGMATA (한국어, 영어)" → "PRAGMATA" */
export function psstoreCleanTitle(name: string | null | undefined): string | null {
  const cleaned = (name ?? "").replace(PSSTORE_LANGUAGE_SUFFIX, "").trim();
  return cleaned || null;
}

type Media = z.infer<typeof mediaSchema>;

/** 역할 하나를 골라 폭을 지정한 주소로 돌려준다. 원본은 3840×2160(800KB)이라 그대로 쓰지 않는다 */
export function psstoreImageUrl(media: Media[] | null | undefined, role: string, width: number): string | null {
  const hit = (media ?? []).find((m) => m.type === "IMAGE" && m.role === role && m.url);
  if (!hit?.url) return null;
  // 주소에 이미 질의가 붙어 오는 경우는 없었지만, 붙어 와도 우리 폭이 이기게 둔다
  return `${hit.url.split("?")[0]}?w=${width}`;
}

/** 목록 응답 → 후보. 콘셉트(게임) 단위라 에디션 중복이 없다 */
export function parsePsstoreGrid(raw: unknown, firstRank?: number): SearchCandidate[] {
  const parsed = gridSchema.safeParse(raw);
  if (!parsed.success) fail("목록", parsed.error);
  const concepts = parsed.data!.data.categoryGridRetrieve.concepts ?? [];
  const out: SearchCandidate[] = [];
  const seen = new Set<string>();
  // 순번은 **입력 위치**로 센다(steam 의 parseTopSellerCandidates 와 같은 이유).
  // 아래에서 제목 없는 콘셉트를 건너뛰므로, out.length 로 세면 걸린 수만큼 뒤가 위로 올라간다
  for (const [i, c] of concepts.entries()) {
    const title = psstoreCleanTitle(c.name);
    // 제목이 없으면 흡수 판단(제목 역매칭)을 못 한다 — 중복 등록을 만드느니 건너뛴다
    if (!title || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push({
      externalId: c.id,
      title,
      url: `${PSSTORE_CONCEPT_URL}/${c.id}`,
      // 상세에는 이미지가 없다 — 여기서 안 들고 가면 PS 단독 게임은 커버가 영영 빈다
      coverUrl: psstoreImageUrl(c.media, PSSTORE_COVER_ROLE, PSSTORE_COVER_WIDTH),
      portraitUrl: psstoreImageUrl(c.media, PSSTORE_PORTRAIT_ROLE, PSSTORE_PORTRAIT_WIDTH),
      ...(firstRank === undefined ? {} : { rank: firstRank + i }),
    });
  }
  return out;
}

/**
 * 콘셉트가 어느 기기 판인지. 한 콘셉트가 PS4, PS5 판을 다 갖는 경우가 많은데
 * 스냅샷은 플랫폼 하나만 담을 수 있어 새 세대를 고른다 — 가격은 두 판이 사실상 같고,
 * 구세대만 있는 게임은 CUSA 만 있으므로 ps4 로 잡힌다.
 */
export function psstorePlatform(productIds: string[]): Platform {
  if (productIds.some((id) => PSSTORE_PS5_TITLE_ID.test(id))) return "ps5";
  if (productIds.some((id) => PSSTORE_PS4_TITLE_ID.test(id))) return "ps4";
  return "ps5";
}

/** epoch ms 문자열 → ISO datetime. 값이 없거나 숫자가 아니면 null */
export function psstoreEpochToIso(v: string | null | undefined): string | null {
  if (!v) return null;
  const ms = Number(v);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
}

/**
 * 구매 버튼의 가격만 고른다.
 *
 * PS 는 같은 게임에 버튼을 여럿 준다. PlayStation Plus 스페셜 카탈로그에 든 게임은
 * "UPSELL_PS_PLUS_GAME_CATALOG" 버튼이 **먼저** 오고, 그 가격이 basePrice=정가, discounted=0("포함")이다.
 * 첫 가격을 그냥 쓰면 사이버펑크 2077 이 54,800원 → 0원, 100% 할인으로 찍힌다(2026-09-14 실측).
 * 실제 구매가는 뒤에 오는 "ADD_TO_CART"(applicability=APPLICABLE) 쪽에 있다 — 같은 날 21,920원.
 *
 * 가입자만 0원인 값을 할인으로 적으면 가격 알림 서비스가 제일 하면 안 되는 일을 한다.
 * 구독 포함 여부는 별도 축(game_subscriptions)이 다룰 일이지 여기 가격 자리가 아니다.
 */
function pickPurchasePrice(webctas: Array<{ price?: z.infer<typeof priceSchema> | null }> | null | undefined) {
  const priced = (webctas ?? []).map((c) => c.price).filter((p) => p && p.basePriceValue != null);
  return priced.find((p) => p!.applicability !== PSSTORE_UPSELL_APPLICABILITY) ?? null;
}

/**
 * 버린 UPSELL 버튼에서 "구독 포함"만 건져 구독 키로 돌려준다.
 * 가격 자리에서 쓸모없다고 버린 값이 구독 축에서는 유일한 근거다 — PS 는 구독 카탈로그 API 가 없다.
 */
export function psstoreSubscriptionKeys(webctas: Array<z.infer<typeof ctaSchema>> | null | undefined): string[] {
  const keys = new Set<string>();
  for (const cta of webctas ?? []) {
    const key = cta.type ? PSSTORE_INCLUSION_CTA[cta.type] : undefined;
    if (key) keys.add(key);
  }
  return [...keys];
}

/** 콘셉트 상세 → 스냅샷. 가격은 구매 버튼만 쓰고, 구독 가입가 버튼은 구독 축으로 보낸다 */
export function parsePsstoreConcept(raw: unknown, conceptId: string): StoreSnapshot {
  const parsed = conceptSchema.safeParse(raw);
  if (!parsed.success) fail("콘셉트", parsed.error);
  const concept = parsed.data!.data.conceptRetrieve;
  if (!concept) throw new AdapterError(`PlayStation 게임 없음: ${conceptId}`, "psstore", false);

  const dp = concept.defaultProduct;
  const price = pickPurchasePrice(dp?.webctas);
  const listPrice = price?.basePriceValue ?? null;
  // 구매 버튼이 없으면(구독 전용) 살 수 있는 값이 없다 — 0 이 아니라 "모름"이다
  const currentPrice = price ? price.discountedValue ?? listPrice : null;
  const discountPct =
    listPrice != null && currentPrice != null && listPrice > 0 && currentPrice < listPrice
      ? Math.round(((listPrice - currentPrice) / listPrice) * 100)
      : 0;

  const titleKo = psstoreCleanTitle(dp?.name);
  // invariantName(영문 불변명)이 우선이지만 **한국어판 SKU 에는 이 값이 null 로 온다**
  // (2026-09-15 실측: 무쌍OROCHI3 Ultimate, 영웅전설 여의 궤적, God of War III Remastered, 나유타의 궤적).
  // 없다고 meta 를 통째로 버리면 게임 생성이 불가능해지고, 그 콘셉트는 발견될 때마다 같은 자리에서
  // 죽으면서 시드 몫만 먹는다(sync_logs 의 psstore 가 매 실행 partial 인 이유였다).
  // name 은 "무쌍OROCHI3 Ultimate (한국어판)" 꼴이라 psstoreCleanTitle 이 괄호를 떼면 쓸 만한 제목이 된다.
  const titleEn = dp?.invariantName?.trim() || titleKo;
  const productIds = [...(concept.products ?? []).map((p) => p.id), ...(dp ? [dp.id] : [])];

  return {
    platform: psstorePlatform(productIds),
    storeExternalId: concept.id,
    storeUrl: `${PSSTORE_CONCEPT_URL}/${concept.id}`,
    listPrice,
    currentPrice,
    discountPct: price ? discountPct : null,
    // 종료 시각은 할인 중일 때만 의미가 있다 — 상시 판매 구간의 값을 "할인 종료"로 오해하지 않게
    discountEndsAt: discountPct > 0 ? psstoreEpochToIso(price?.endTime) : null,
    releaseDate: concept.releaseDate?.value ? concept.releaseDate.value.slice(0, 10) : null,
    // 콘셉트는 보통 본편이지만 재화 상품도 자기 콘셉트를 갖는다(실측: "디아블로 IV — 500 백금화",
    // "Battlefield V — Battlefield 화폐 6000"). PS 는 콘셉트에 분류 값을 주지 않아 제목으로만 가른다
    // (lib/games/content-kind — 숫자를 함께 요구해서 "CoA: 아틀란의 크리스탈" 같은 본편은 안 걸린다)
    contentType: isCurrencyItemTitle(titleKo) || isCurrencyItemTitle(titleEn) ? "dlc" : undefined,
    subscriptionKeys: psstoreSubscriptionKeys(dp?.webctas),
    // 이미지는 콘셉트 상세에 없다 — 발견 단계(parsePsstoreGrid)가 들고 온 값을 반영 단계에서 얹는다
    meta: titleEn ? { titleEn, titleKo: titleKo && titleKo !== titleEn ? titleKo : null } : undefined,
  };
}

/** 검색 응답 → 상품 id 목록. 콘셉트 id 는 여기 없어 상세를 한 번 더 봐야 한다 */
export function parsePsstoreSearch(raw: unknown): Array<{ productId: string; title: string | null }> {
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) fail("검색", parsed.error);
  return (parsed.data!.data.universalSearch.results ?? []).map((r) => ({
    productId: r.id,
    title: psstoreCleanTitle(r.name),
  }));
}

/** 상품 상세 → 그 상품이 속한 콘셉트 후보 */
export function parsePsstoreProduct(raw: unknown): SearchCandidate | null {
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) fail("상품", parsed.error);
  const p = parsed.data!.data.productRetrieve;
  const conceptId = p?.concept?.id;
  if (!p || !conceptId) return null;
  const title = p.invariantName?.trim() || psstoreCleanTitle(p.name);
  if (!title) return null;
  return { externalId: conceptId, title, url: `${PSSTORE_CONCEPT_URL}/${conceptId}` };
}

/**
 * 상품 상세 → DLC 스냅샷.
 *
 * 왜 콘셉트가 아니라 상품인가: DLC 는 콘셉트를 갖지 않는다. 애드온 목록이 주는 것도 상품 id 고,
 * 그 상품의 concept.id 가 곧 부모 게임이다 — 부모 연결이 응답 안에 이미 들어 있다.
 *
 * 구독 키는 채우지 않는다(undefined). PS Plus 포함은 본편에 붙는 이야기이고,
 * 여기서 빈 배열을 주면 "이 DLC 는 어느 구독에도 안 들었다"는 단언이 돼 구독 축을 건드린다.
 */
export function parsePsstoreDlc(raw: unknown, productId: string): StoreSnapshot {
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) fail("DLC 상품", parsed.error);
  const p = parsed.data!.data.productRetrieve;
  if (!p) throw new AdapterError(`PlayStation 상품 없음: ${productId}`, "psstore", false);

  const price = pickPurchasePrice(p.webctas);
  const listPrice = price?.basePriceValue ?? null;
  const currentPrice = price ? price.discountedValue ?? listPrice : null;
  const discountPct =
    listPrice != null && currentPrice != null && listPrice > 0 && currentPrice < listPrice
      ? Math.round(((listPrice - currentPrice) / listPrice) * 100)
      : 0;

  const titleEn = p.invariantName?.trim() || null;
  const titleKo = psstoreCleanTitle(p.name);

  return {
    platform: psstorePlatform([p.id]),
    storeExternalId: p.id,
    storeUrl: `${PSSTORE_PRODUCT_URL}/${p.id}`,
    listPrice,
    currentPrice,
    discountPct: price ? discountPct : null,
    discountEndsAt: discountPct > 0 ? psstoreEpochToIso(price?.endTime) : null,
    contentType: "dlc",
    parentExternalId: p.concept?.id ?? null,
    meta: titleEn ? { titleEn, titleKo: titleKo && titleKo !== titleEn ? titleKo : null } : undefined,
  };
}
