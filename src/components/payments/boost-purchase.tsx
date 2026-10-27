// 노출 자리 구매 판(2026-10-27) — 인디 게임 부스트(/indie/mine/[id]/boost), 홍보 글 고정(/board/mine/[id]/pin)이 같이 쓴다.
// 무엇을 사는지(자리, 기간, 광고 표시, 돌아가며 보임)를 먼저 말하고, 값, 결제 수단과 약관 동의(위젯), 결제 단추를 둔다.
// 공개 전 글은 살 수 없다고 말하고 단추를 세우지 않는다.
// 테스트 키(test_)로 돌면 "실제로 돈이 나가지 않아요" 를 단다 — 운영 키로 바꾸기 전까지 누구도 진짜 결제로 착각하지 않게.
import { BoostCheckout } from "@/components/payments/boost-checkout";
import { FormMessage } from "@/components/ui/form-message";
import { sectionCardClass } from "@/components/ui/page";
import { formatPrice } from "@/lib/currency";
import { formatDateTime } from "@/lib/format";
import { PAYMENT_MESSAGES as M, PRODUCT_COPY } from "@/lib/payments/messages";
import { PRODUCTS, type ProductKey } from "@/lib/payments/products";
import type { BoostTargetDto } from "@/server/services/payments";
import { tossClientKey, tossConfigured } from "@/server/payments/toss";

export function BoostPurchase({ product, target, customerKey }: { product: ProductKey; target: BoostTargetDto; customerKey: string }) {
  const p = PRODUCTS[product];
  const clientKey = tossClientKey();
  const ready = Boolean(clientKey) && tossConfigured();

  return (
    <section className={sectionCardClass("flex flex-col gap-4")}>
      <div className="flex flex-col gap-1">
        <span className="text-[12.5px] text-dim">{p.name}</span>
        <h2 className="text-[18px] font-bold text-ink">{target.title}</h2>
      </div>
      <ul className="flex flex-col gap-1.5 text-[13.5px] leading-[1.6] text-ink-2">
        {PRODUCT_COPY[product].points.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-acc" />
            {line}
          </li>
        ))}
      </ul>
      {target.boostedUntil && <FormMessage tone="info">{M.currentBoost(formatDateTime(target.boostedUntil))}</FormMessage>}
      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-[14px] text-mut">{M.price}</span>
        <span className="text-[22px] font-black tabular-nums text-ink">{formatPrice(p.amount)}</span>
      </div>
      {!target.live ? (
        <FormMessage tone="error">{M.notLive}</FormMessage>
      ) : !ready ? (
        <FormMessage tone="info">{M.notConfigured}</FormMessage>
      ) : (
        <>
          {clientKey.startsWith("test_") && <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">{M.testMode}</p>}
          <BoostCheckout product={product} targetId={target.id} clientKey={clientKey} customerKey={customerKey} amount={p.amount} />
        </>
      )}
    </section>
  );
}
