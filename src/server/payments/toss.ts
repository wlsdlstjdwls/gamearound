// 토스페이먼츠 승인 API(결제위젯, 2026-10-27 사용자 결정). 결제창이 성공 주소로 돌려보낸 뒤 서버가 이 승인을 불러야 돈이 실제로 빠진다 —
// 승인 전에는 카드사 인증만 끝난 상태다. 승인 요청은 10분 안에 해야 한다(토스 문서).
//
// adapters/http 의 createHttpClient 를 쓰지 않는 이유는 메일, 텔레그램과 같다: 그쪽은 수집 소스에 매인 클라이언트다(크롤러 UA, 재시도).
// 승인은 재시도하면 안 된다 — 같은 승인이 두 번 가면 두 번째가 ALREADY_PROCESSED_PAYMENT 로 실패하고, 시간 초과를 재시도로 덮으면 결과를 모른다.
import "server-only";

export const TOSS_API_BASE = "https://api.tosspayments.com/v1";
export const TOSS_SECRET_KEY_ENV = "TOSS_SECRET_KEY";
/** 승인 응답 기다림. 토스 승인은 카드사까지 다녀와 몇 초 걸릴 수 있다 — 넉넉히 두되 함수 시간 한도보다 한참 짧게 */
const TOSS_TIMEOUT_MS = 30_000;

export class TossError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type TossConfirmed = { paymentKey: string; status: string; method: string | null; approvedAt: string | null; receiptUrl: string | null; totalAmount: number };

export function tossConfigured(): boolean {
  return Boolean(process.env[TOSS_SECRET_KEY_ENV]?.trim());
}

/** 비밀 키 뒤에 콜론을 붙여 base64 로 — 토스의 Basic 인증 꼴(사용자 이름만 있고 비밀번호가 없다) */
function authHeader(): string {
  const key = process.env[TOSS_SECRET_KEY_ENV]?.trim();
  if (!key) throw new TossError("NOT_CONFIGURED", `${TOSS_SECRET_KEY_ENV} 없음`);
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
