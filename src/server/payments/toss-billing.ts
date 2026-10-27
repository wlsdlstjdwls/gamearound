// 토스페이먼츠 정기결제(빌링, 2026-10-27, 기획서 8장 "월 정기결제 빌링키"). 카드 등록 창이 authKey 를 주면 빌링키로 바꾸고,
// 그 빌링키로 매달 우리가 먼저 청구한다(사람이 결제창을 다시 열지 않는다).
//
// 승인(toss.ts)과 같이 재시도하지 않는다: 청구는 돈이 빠지는 쓰기다. 시간 초과 뒤 그냥 다시 부르면 두 번 빠질 수 있어
// 주문 번호를 멱등 키로 붙인다 — 같은 주문으로 다시 부르면 토스가 첫 결과를 돌려준다.
import "server-only";
import { authHeader, TOSS_API_BASE, TOSS_BILLING_SECRET_KEY_ENV, TOSS_TIMEOUT_MS, TossError } from "@/server/payments/toss";

/** 카드 등록 창에 쓰는 클라이언트 키(API 개별 연동). 결제위젯 클라이언트 키와 다르다 */
const TOSS_BILLING_CLIENT_KEY_ENV = "NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY";

export function tossBillingClientKey(): string {
  return process.env[TOSS_BILLING_CLIENT_KEY_ENV]?.trim() ?? "";
}

export function tossBillingConfigured(): boolean {
  return Boolean(tossBillingClientKey() && process.env[TOSS_BILLING_SECRET_KEY_ENV]?.trim());
}

async function post(path: string, body: unknown, idempotencyKey?: string): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { Authorization: authHeader(TOSS_BILLING_SECRET_KEY_ENV), "Content-Type": "application/json" };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch(`${TOSS_API_BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(TOSS_TIMEOUT_MS) });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json) throw new TossError(String(json?.code ?? `HTTP_${res.status}`), String(json?.message ?? "결제하지 못했어요"));
  return json;
}

export type IssuedBillingKey = { billingKey: string; cardLabel: string | null };

/** 카드 등록 창이 성공 주소로 준 authKey 를 빌링키로. customerKey 는 등록 창에 넘긴 값과 같아야 한다 */
export async function issueBillingKey(authKey: string, customerKey: string): Promise<IssuedBillingKey> {
  const body = await post("/billing/authorizations/issue", { authKey, customerKey });
  const card = body.card as { number?: string } | undefined;
  const company = typeof body.cardCompany === "string" ? body.cardCompany : null;
  const label = [company, card?.number ?? null].filter(Boolean).join(" ");
  return { billingKey: String(body.billingKey), cardLabel: label || null };
}

export type BillingCharged = { paymentKey: string; method: string | null; approvedAt: string | null; receiptUrl: string | null };

/** 빌링키로 청구. 실패하면 토스 코드와 문구로 TossError — 문구는 사람에게 보여 줘도 되는 말이다 */
export async function chargeBilling(input: { billingKey: string; customerKey: string; amount: number; orderId: string; orderName: string }): Promise<BillingCharged> {
  const body = await post(
    `/billing/${encodeURIComponent(input.billingKey)}`,
    { customerKey: input.customerKey, amount: input.amount, orderId: input.orderId, orderName: input.orderName },
    `charge-${input.orderId}`,
  );
  const receipt = body.receipt as { url?: string } | null | undefined;
  return {
    paymentKey: String(body.paymentKey),
    method: typeof body.method === "string" ? body.method : null,
    approvedAt: typeof body.approvedAt === "string" ? body.approvedAt : null,
    receiptUrl: receipt?.url ?? null,
  };
}
