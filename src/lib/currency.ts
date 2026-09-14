// 통화 표시, 비교 규칙. 가격은 언제나 "통화의 최소 단위 정수"다(KRW=원, USD=센트).
import type { Currency } from "@/server/db/schema";

/**
 * 화면의 기준 통화. 최저가, 정렬, 플랫폼 간 비교는 이 통화를 쓰는 가격끼리만 한다 —
 * 환율로 맞추지 않는 이유는 환산가가 실제 결제액과 어긋나기 때문이다(schema 의 currencyEnum 주석).
 */
export const DISPLAY_CURRENCY: Currency = "KRW";

/** 통화별 소수 자릿수. 최소 단위 정수를 사람이 읽는 금액으로 되돌릴 때 쓴다 */
const DECIMALS: Record<Currency, number> = { KRW: 0, USD: 2 };
const SYMBOL: Record<Currency, string> = { KRW: "₩", USD: "$" };

/** 12345 → "₩12,345", (699, "USD") → "$6.99". 값이 없으면 "-", 0 은 "무료" */
export function formatPrice(price: number | null | undefined, currency: Currency = DISPLAY_CURRENCY): string {
  if (price === null || price === undefined) return "-";
  if (price === 0) return "무료";
  const decimals = DECIMALS[currency];
  const amount = price / 10 ** decimals;
  return `${SYMBOL[currency]}${amount.toLocaleString("ko-KR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** 가격이 붙는 것들의 공통 모양 — 플랫폼 행, DTO, 가격 계열이 모두 이 두 필드를 갖는다 */
export type Priced = { currentPrice: number | null; currency: Currency };

/**
 * 한 통화만 남긴다. 통화가 섞이면 비교도 한 축의 그래프도 뜻을 잃는다(₩44,990 과 $6.99).
 * 기준 통화가 하나라도 있으면 그것만, 없으면 첫 항목의 통화로 맞춘다.
 */
export function sameCurrency<T extends { currency: Currency }>(list: T[]): { kept: T[]; dropped: T[]; currency: Currency } {
  const currency = list.find((p) => p.currency === DISPLAY_CURRENCY)?.currency ?? list[0]?.currency ?? DISPLAY_CURRENCY;
  return { kept: list.filter((p) => p.currency === currency), dropped: list.filter((p) => p.currency !== currency), currency };
}

/** 현재가가 가장 싼 항목. 통화가 섞여 있으면 sameCurrency 로 추린 뒤 고른다 */
export function cheapestOf<T extends Priced>(list: T[]): T | null {
  const priced = list.filter((p) => p.currentPrice !== null);
  if (priced.length === 0) return null;
  const { kept } = sameCurrency(priced);
  return kept.reduce((a, b) => ((b.currentPrice as number) < (a.currentPrice as number) ? b : a));
}
