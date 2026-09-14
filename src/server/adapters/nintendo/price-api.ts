// 닌텐도 공식 가격 API(api.ec.nintendo.com) — 한국, 일본이 같이 쓴다. country 만 다르다.
//
// 이 경로가 상품 HTML 파싱보다 나은 점 셋(2026-09-14 실측):
//   1. 할인 시작, 종료 시각을 준다. HTML 에는 그 값이 없어 닌텐도만 할인 기간이 비어 있었다
//   2. 한 요청에 50건이라 요청 간격(4초) 제약을 가격 갱신에서 떼어 낸다 — 32건이 478ms
//   3. sales_status 로 "안 파는 상품" 과 "파싱 실패" 가 구분된다
// 대신 제목, 이미지 같은 게임 마스터는 안 준다. 그건 여전히 상품 HTML(KR), 검색 JSON(JP)이 맡는다.
import { z } from "zod";
import type { Currency } from "@/server/db/schema";
import { EC_PRICE_URL } from "./constants";

/** 값을 신뢰할 수 있는 판매 상태. 나머지(not_found, sales_termination, unreleased)는 가격이 없다 */
const SELLABLE = new Set(["onsale", "preorder"]);

const amountSchema = z.object({
  raw_value: z.string(),
  currency: z.string(),
  start_datetime: z.string().optional(),
  end_datetime: z.string().optional(),
});

const priceResponseSchema = z.object({
  country: z.string(),
  prices: z.array(
    z.object({
      title_id: z.union([z.number(), z.string()]),
      sales_status: z.string(),
      regular_price: amountSchema.optional(),
      discount_price: amountSchema.optional(),
    }),
  ),
});

export interface EcPrice {
  listPrice: number | null;
  currentPrice: number | null;
  currency: Currency;
  discountPct: number | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
}

/** "64800" → 64800. 최소 단위 정수라 그대로 읽는다(KRW, JPY 둘 다 소수가 없다) */
function amount(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function ecPriceUrl(country: string, lang: string, nsuids: string[]): string {
  const u = new URL(EC_PRICE_URL);
  u.searchParams.set("country", country);
  u.searchParams.set("lang", lang);
  u.searchParams.set("ids", nsuids.join(","));
  return u.toString();
}

/**
 * 응답 → nsuid 별 가격. 팔지 않는 상품은 Map 에 넣지 않는다 —
 * 호출부(sync/store-fetch)가 "배치 응답에 없음" 으로 기록하고 넘어간다.
 */
export function parseEcPrices(raw: unknown, currency: Currency): Map<string, EcPrice> {
  const parsed = priceResponseSchema.parse(raw);
  const out = new Map<string, EcPrice>();
  for (const p of parsed.prices) {
    if (!SELLABLE.has(p.sales_status)) continue;
    const listPrice = amount(p.regular_price?.raw_value);
    const discounted = amount(p.discount_price?.raw_value);
    const currentPrice = discounted ?? listPrice;
    if (currentPrice === null) continue; // 파는 중인데 값이 없다 = 우리가 쓸 것이 없다
    const discountPct =
      discounted !== null && listPrice !== null && listPrice > 0 && discounted < listPrice
        ? Math.round(((listPrice - discounted) / listPrice) * 100)
        : 0;
    out.set(String(p.title_id), {
      listPrice,
      currentPrice,
      currency,
      discountPct,
      // 할인이 아닐 때 기간을 비우는 일은 sync/platform-writer 가 한다(할인 메타는 null 로 덮어써야 한다)
      discountStartsAt: p.discount_price?.start_datetime ?? null,
      discountEndsAt: p.discount_price?.end_datetime ?? null,
    });
  }
  return out;
}
