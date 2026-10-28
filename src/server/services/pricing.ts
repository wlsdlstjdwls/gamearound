// 이 사람이 지금 낼 값(2026-10-28). 요금 설정(services/settings)과 결제 기록으로 사는 사람의 처지(첫 결제인가)를 정해
// lib/pricing/quote 에 넘긴다. 요금 화면, 결제 화면, 주문 만들기, 멤버십 첫 청구가 모두 이 길로 값을 받는다.
//
// "첫 결제" 는 갈래마다 따로 센다: 상품(부스트, 고정, 묶음)을 결제한 적이 있어도 멤버십은 처음일 수 있다.
// 환불된 결제(canceled)도 낸 것으로 센다 — 결제, 환불, 재결제로 첫 결제 값을 되풀이하지 못하게.
import "server-only";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { payments } from "@/server/db/schema";
import { getPricingSettings } from "@/server/services/settings";
import { priceBook, quote, type PriceBook, type Quote } from "@/lib/pricing/quote";
import type { PricedKey } from "@/lib/pricing/settings";

const PAID_STATUSES = ["paid", "canceled"] as const;

/** 이 갈래를 결제한 적이 있나. 비로그인(userId null)은 있다고 친다 — 첫 결제 값을 약속하지 않는다 */
export async function hasPaid(userId: string | null, kind: "products" | "membership"): Promise<boolean> {
  if (!userId) return true;
  const [row] = await getDb()
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.userId, userId), kind === "membership" ? isNotNull(payments.membershipId) : isNull(payments.membershipId), inArray(payments.status, [...PAID_STATUSES])))
    .limit(1);
  return Boolean(row);
}

/** 화면이 쓰는 값 묶음 */
export async function getPriceBook(userId: string | null): Promise<PriceBook> {
  const [settings, productsPaid, membershipPaid] = await Promise.all([getPricingSettings(), hasPaid(userId, "products"), hasPaid(userId, "membership")]);
  return priceBook(settings, { productsPaid, membershipPaid }, new Date());
}

/** 주문 하나의 값(서버가 주문 줄에 적는 값). first: 멤버십이면 첫 달 청구인가 */
export async function quoteFor(userId: string, key: PricedKey, first = true): Promise<Quote> {
  const settings = await getPricingSettings();
  const everPaid = await hasPaid(userId, key === "membership" ? "membership" : "products");
  return quote(settings, key, { everPaid }, new Date(), first);
}
