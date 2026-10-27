// 토스페이먼츠 승인 API(결제위젯, 2026-10-27 사용자 결정). 결제창이 성공 주소로 돌려보낸 뒤 서버가 이 승인을 불러야 돈이 실제로 빠진다 —
// 승인 전에는 카드사 인증만 끝난 상태다. 승인 요청은 10분 안에 해야 한다(토스 문서).
//
// adapters/http 의 createHttpClient 를 쓰지 않는 이유는 메일, 텔레그램과 같다: 그쪽은 수집 소스에 매인 클라이언트다(크롤러 UA, 재시도).
// 승인은 재시도하면 안 된다 — 같은 승인이 두 번 가면 두 번째가 ALREADY_PROCESSED_PAYMENT 로 실패하고, 시간 초과를 재시도로 덮으면 결과를 모른다.
import "server-only";

export const TOSS_API_BASE = "https://api.tosspayments.com/v1";
export const TOSS_SECRET_KEY_ENV = "TOSS_SECRET_KEY";
/**
 * 정기결제(빌링) 비밀 키. 결제위젯 키와 따로 둔다 — 빌링은 "API 개별 연동" 키로만 열린다(2026-10-27 실측: 문서 공개 위젯 키로
 * 빌링키 발급을 부르면 NOT_FOUND_MERCHANT). 그 키로 청구한 결제는 취소도 그 키로 해야 한다(상점이 다르다)
 */
export const TOSS_BILLING_SECRET_KEY_ENV = "TOSS_BILLING_SECRET_KEY";
export type TossSecretEnv = typeof TOSS_SECRET_KEY_ENV | typeof TOSS_BILLING_SECRET_KEY_ENV;
/** 브라우저에 내려가는 결제위젯 클라이언트 키(공개해도 되는 키). 비밀 키는 서버만 읽는다 */
const TOSS_CLIENT_KEY_ENV = "NEXT_PUBLIC_TOSS_CLIENT_KEY";
/** 승인 응답 기다림. 토스 승인은 카드사까지 다녀와 몇 초 걸릴 수 있다 — 넉넉히 두되 함수 시간 한도보다 한참 짧게 */
export const TOSS_TIMEOUT_MS = 30_000;

export class TossError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type TossConfirmed = { paymentKey: string; status: string; method: string | null; approvedAt: string | null; receiptUrl: string | null; totalAmount: number };

export function tossClientKey(): string {
  return process.env[TOSS_CLIENT_KEY_ENV]?.trim() ?? "";
}

export function tossConfigured(): boolean {
  return Boolean(process.env[TOSS_SECRET_KEY_ENV]?.trim());
}

/** 비밀 키 뒤에 콜론을 붙여 base64 로 — 토스의 Basic 인증 꼴(사용자 이름만 있고 비밀번호가 없다) */
export function authHeader(env: TossSecretEnv = TOSS_SECRET_KEY_ENV): string {
  const key = process.env[env]?.trim();
  // 문구는 사람에게 보인다(결제 내역, 알림함) — 환경변수 이름은 코드(NOT_CONFIGURED)로만 남긴다
  if (!key) throw new TossError("NOT_CONFIGURED", "결제를 준비하고 있어요. 조금 뒤에 다시 시도해 주세요");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

/** 승인. 실패하면 토스가 준 코드와 문구로 TossError 를 던진다 — 문구는 사람에게 그대로 보여 줘도 되는 말이다 */
export async function confirmTossPayment(input: { paymentKey: string; orderId: string; amount: number }): Promise<TossConfirmed> {
  const res = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(TOSS_TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !body) throw new TossError(String(body?.code ?? `HTTP_${res.status}`), String(body?.message ?? "결제 승인에 실패했어요"));
  const receipt = body.receipt as { url?: string } | null | undefined;
  return {
    paymentKey: String(body.paymentKey),
    status: String(body.status),
    method: typeof body.method === "string" ? body.method : null,
    approvedAt: typeof body.approvedAt === "string" ? body.approvedAt : null,
    receiptUrl: receipt?.url ?? null,
    totalAmount: Number(body.totalAmount),
  };
}

/**
 * 결제 취소(환불). amount 를 주면 그만큼만(일할 환불), 없으면 남은 전액. 승인과 달리 멱등 키를 붙인다 —
 * 시간 초과 뒤 관리자가 다시 눌러도 토스가 같은 요청으로 보고 두 번 돌려주지 않는다(토스 문서: Idempotency-Key, 15일 보관).
 */
export async function cancelTossPayment(input: { paymentKey: string; reason: string; amount?: number; idempotencyKey: string; secretEnv?: TossSecretEnv }): Promise<{ status: string }> {
  const res = await fetch(`${TOSS_API_BASE}/payments/${encodeURIComponent(input.paymentKey)}/cancel`, {
    method: "POST",
    headers: { Authorization: authHeader(input.secretEnv), "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify(input.amount === undefined ? { cancelReason: input.reason } : { cancelReason: input.reason, cancelAmount: input.amount }),
    signal: AbortSignal.timeout(TOSS_TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !body) throw new TossError(String(body?.code ?? `HTTP_${res.status}`), String(body?.message ?? "환불에 실패했어요"));
  return { status: String(body.status) };
}
