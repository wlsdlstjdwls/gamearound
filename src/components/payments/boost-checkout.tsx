"use client";
// 광고 결제 — 토스페이먼츠 결제위젯(2026-10-27). 화면에 결제 수단과 약관 동의를 그리고, 단추를 누르면 주문을 만든 뒤 결제를 요청한다.
// 결제가 끝나면 토스가 성공, 실패 주소로 페이지를 넘긴다(api/payments/toss).
//
// 결제창(API 개별 연동)이 아니라 결제위젯인 이유: 결제창 키는 토스 가입 뒤에만 나오고, 결제위젯은 문서의 공개 테스트 키로
// 가입 전에도 끝까지 시험할 수 있다(2026-10-27 실측: 결제창 샘플 키는 샌드박스에서 401). 승인 API 는 둘이 같다.
// 약관 동의는 위젯이 그리는 칸이 맡는다 — 우리 체크박스를 따로 두면 같은 동의를 두 번 받는다.
//
// SDK 는 npm 꾸러미 대신 토스가 내주는 스크립트를 이 화면에서만 붙인다: 다른 화면은 쓰지 않아 전체 번들에 넣을 까닭이 없다.
// 돌아올 주소는 지금 열린 주소의 origin 으로 만든다 — 로컬, 미리 보기, 운영이 저마다 맞다.
import { useEffect, useRef, useState, useTransition } from "react";
import { createBoostOrderAction } from "@/app/(user)/payments/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { PAYMENT_MESSAGES as M } from "@/lib/payments/messages";
import type { ProductKey } from "@/lib/payments/products";
import { TOSS_FAIL_PATH, TOSS_SUCCESS_PATH } from "@/lib/routes";

/** 토스 SDK v2 스크립트(공식 문서의 표준 주소). 결제위젯도 이 하나에 들어 있다 */
const TOSS_SDK_SRC = "https://js.tosspayments.com/v2/standard";
/** 위젯이 그려질 자리의 id. 한 화면에 결제 칸이 하나뿐이라 고정 값이다 */
const METHODS_ID = "toss-payment-methods";
const AGREEMENT_ID = "toss-agreement";

type Widgets = {
  setAmount(a: { currency: "KRW"; value: number }): Promise<void>;
  renderPaymentMethods(o: { selector: string; variantKey: string }): Promise<Rendered>;
  renderAgreement(o: { selector: string; variantKey: string }): Promise<Rendered>;
  requestPayment(o: Record<string, unknown>): Promise<void>;
};
/** 그려진 위젯 칸. 같은 자리에 다시 그리기 전에 치워야 한다 */
type Rendered = { destroy(): Promise<void> | void };
type TossPaymentsFn = (clientKey: string) => { widgets(o: { customerKey: string }): Widgets };

let sdkPromise: Promise<TossPaymentsFn> | null = null;
function loadSdk(): Promise<TossPaymentsFn> {
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

type Props = { product: ProductKey; targetId: string; clientKey: string; customerKey: string; amount: number };

export function BoostCheckout({ product, targetId, clientKey, customerKey, amount }: Props) {
  const widgets = useRef<Widgets | null>(null);
  /** 그리기를 한 줄로 세운다 — 앞 효과가 그리기를 끝내고 치운 뒤에 다음 효과가 그린다 */
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    // 개발 모드는 효과를 두 번 돌린다(StrictMode). 첫 번의 칸을 치우지 않으면 두 번째 그리기가 "이미 그렸다" 로 실패한다
    const drawn: Rendered[] = [];
    const run = async () => {
      if (!alive) return;
      try {
        const TossPayments = await loadSdk();
        const w = TossPayments(clientKey).widgets({ customerKey });
        // 금액을 먼저 정해야 위젯이 그 금액에 맞는 결제 수단을 그린다(토스 문서 순서)
        await w.setAmount({ currency: "KRW", value: amount });
        const parts = await Promise.all([w.renderPaymentMethods({ selector: `#${METHODS_ID}`, variantKey: "DEFAULT" }), w.renderAgreement({ selector: `#${AGREEMENT_ID}`, variantKey: "AGREEMENT" })]);
        drawn.push(...parts);
        if (!alive) return;
        widgets.current = w;
        setReady(true);
      } catch {
        if (alive) setError(M.sdkFailed);
      }
    };
    queue.current = queue.current.then(run);
    return () => {
      alive = false;
      widgets.current = null;
      queue.current = queue.current.then(async () => {
        await Promise.all(drawn.map((p) => p.destroy())).catch(() => {});
      });
    };
  }, [clientKey, customerKey, amount]);

  const pay = () =>
    start(async () => {
      const w = widgets.current;
      if (!w) return;
      setError(null);
      const order = await createBoostOrderAction(product, targetId).catch(() => ({ ok: false as const, error: M.failed }));
      if (!order.ok) return setError(order.error);
      try {
        await w.requestPayment({
          orderId: order.orderId,
          orderName: order.orderName,
          successUrl: `${window.location.origin}${TOSS_SUCCESS_PATH}`,
          failUrl: `${window.location.origin}${TOSS_FAIL_PATH}`,
        });
      } catch (e) {
        // 결제창을 닫으면 SDK 가 USER_CANCEL 로 던진다 — 사람이 스스로 닫은 것이라 말을 붙이지 않는다.
        // 주문 줄은 대기로 남고 다시 누르면 새 주문이 생긴다. 그 밖(약관 미동의 등)은 토스 문구를 그대로 보여 준다
        const err = e as { code?: string; message?: string } | null;
        if (err?.code === "USER_CANCEL") return;
        setError(err?.message ?? M.sdkFailed);
      }
    });

  return (
    <div className="flex flex-col gap-3">
      {/* 위젯이 스스로 높이를 정해 그린다. 그리기 전에는 빈 칸이라 최소 높이로 자리만 잡는다 */}
      <div id={METHODS_ID} className="min-h-24" />
      <div id={AGREEMENT_ID} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <Button size="lg" fullWidth loading={pending} disabled={!ready} onClick={pay}>
        {M.pay}
      </Button>
    </div>
  );
}
