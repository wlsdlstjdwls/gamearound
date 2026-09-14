// PlayStation Store 응답 파서 — 목록(콘셉트 격자), 콘셉트 상세, 검색.
// 형식 검증은 zod 로 하고, 실패는 재시도해도 같은 결과라 retryable=false 로 올린다.
import { z } from "zod";
import { AdapterError, type SearchCandidate, type StoreSnapshot } from "../types";
import type { Platform } from "@/server/db/schema";
import {
  PSSTORE_CONCEPT_URL,
  PSSTORE_LANGUAGE_SUFFIX,
  PSSTORE_PS4_TITLE_ID,
  PSSTORE_PS5_TITLE_ID,
} from "./constants";

const productRefSchema = z.object({ id: z.string() });

const gridSchema = z.object({
  data: z.object({
    categoryGridRetrieve: z.object({
      concepts: z
        .array(z.object({ id: z.string(), name: z.string().nullish() }))
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
});

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
            webctas: z.array(z.object({ price: priceSchema.nullish() })).nullish(),
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

/** 목록 응답 → 후보. 콘셉트(게임) 단위라 에디션 중복이 없다 */
export function parsePsstoreGrid(raw: unknown): SearchCandidate[] {
  const parsed = gridSchema.safeParse(raw);
  if (!parsed.success) fail("목록", parsed.error);
  const concepts = parsed.data!.data.categoryGridRetrieve.concepts ?? [];
  const out: SearchCandidate[] = [];
  const seen = new Set<string>();
  for (const c of concepts) {
    const title = psstoreCleanTitle(c.name);
    // 제목이 없으면 흡수 판단(제목 역매칭)을 못 한다 — 중복 등록을 만드느니 건너뛴다
    if (!title || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push({ externalId: c.id, title, url: `${PSSTORE_CONCEPT_URL}/${c.id}` });
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

/** 콘셉트 상세 → 스냅샷. 가격이 붙은 첫 구매 버튼을 쓴다(무료 배포판, 구독 버튼은 가격이 없다) */
export function parsePsstoreConcept(raw: unknown, conceptId: string): StoreSnapshot {
  const parsed = conceptSchema.safeParse(raw);
  if (!parsed.success) fail("콘셉트", parsed.error);
  const concept = parsed.data!.data.conceptRetrieve;
  if (!concept) throw new AdapterError(`PlayStation 게임 없음: ${conceptId}`, "psstore", false);

  const dp = concept.defaultProduct;
  const price = (dp?.webctas ?? []).map((c) => c.price).find((p) => p && p.basePriceValue != null) ?? null;
  const listPrice = price?.basePriceValue ?? null;
  const currentPrice = price?.discountedValue ?? listPrice;
  const discountPct =
    listPrice != null && currentPrice != null && listPrice > 0 && currentPrice < listPrice
      ? Math.round(((listPrice - currentPrice) / listPrice) * 100)
      : 0;

  const titleEn = dp?.invariantName?.trim() || null;
  const titleKo = psstoreCleanTitle(dp?.name);
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
    // 이미지는 콘셉트 상세에 없다(목록 응답에만 있고, 후보는 이미지를 나르지 않는다) — 커버는 다른 소스에서 채워진다
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
