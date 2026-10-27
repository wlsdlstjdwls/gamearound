// 토스 SDK v2 스크립트를 화면에 한 번만 붙인다(결제위젯 boost-checkout, 정기결제 카드 등록 billing-start 가 같이 쓴다).
// npm 꾸러미 대신 토스가 내주는 스크립트를 결제 화면에서만 붙인다: 다른 화면은 쓰지 않아 전체 번들에 넣을 까닭이 없다.

/** 토스 SDK v2 스크립트(공식 문서의 표준 주소). 결제위젯, 결제창, 카드 등록이 이 하나에 들어 있다 */
const TOSS_SDK_SRC = "https://js.tosspayments.com/v2/standard";

/** 그려진 위젯 칸. 같은 자리에 다시 그리기 전에 치워야 한다 */
export type Rendered = { destroy(): Promise<void> | void };
export type Widgets = {
  setAmount(a: { currency: "KRW"; value: number }): Promise<void>;
  renderPaymentMethods(o: { selector: string; variantKey: string }): Promise<Rendered>;
  renderAgreement(o: { selector: string; variantKey: string }): Promise<Rendered>;
  requestPayment(o: Record<string, unknown>): Promise<void>;
};
export type TossPaymentsInstance = {
  widgets(o: { customerKey: string }): Widgets;
  payment(o: { customerKey: string }): { requestBillingAuth(o: { method: "CARD"; successUrl: string; failUrl: string; customerEmail?: string; customerName?: string }): Promise<void> };
};
type TossPaymentsFn = (clientKey: string) => TossPaymentsInstance;

let sdkPromise: Promise<TossPaymentsFn> | null = null;

export function loadTossSdk(): Promise<TossPaymentsFn> {
  const w = window as unknown as { TossPayments?: TossPaymentsFn };
  if (w.TossPayments) return Promise.resolve(w.TossPayments);
  sdkPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TOSS_SDK_SRC;
    s.onload = () => (w.TossPayments ? resolve(w.TossPayments) : reject(new Error("sdk")));
    s.onerror = () => {
      sdkPromise = null;
      reject(new Error("sdk"));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

/** 사람이 창을 스스로 닫았나 — 그때는 말을 붙이지 않는다 */
export function isUserCancel(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === "USER_CANCEL";
}
