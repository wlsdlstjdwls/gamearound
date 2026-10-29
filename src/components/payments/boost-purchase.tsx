// 노출 자리 구매 판(2026-10-27) — 인디 게임 부스트(/indie/mine/[id]/boost), 홍보 글 고정(/board/mine/[id]/pin)이 같이 쓴다.
// 무엇을 사는지(자리, 기간, 광고 표시, 돌아가며 보임)를 먼저 말하고, 값, 결제 수단과 약관 동의(위젯), 결제 단추를 둔다.
// 공개 전 글은 살 수 없다고 말하고 단추를 세우지 않는다.
// 메이커 멤버십 이용권이 남아 있으면 결제보다 위에 "이용권으로 걸기" 를 둔다 — 이미 낸 돈으로 먼저 쓰게.
// 값과 "이것만 / 같이 사기" 고르기, 결제 위젯은 components/payments/plan-picker 가 맡는다(고르면 그 자리에서 값이 바뀌어야 해서 클라이언트다).
// 2026-10-29 상품이 관리자가 만드는 목록이 되면서(lib/pricing/settings) 이 판은 "이 글의 자리를 품은 판매 중 상품" 을 모두 고르기 칸으로 세운다.
// 자리 하나짜리는 낱개, 자리 둘은 묶음(짝 글을 같이 고른다). 묶음의 그을 값은 같은 기간 낱개 둘의 정가 합이다(quote 의 bundleListPrice).
// 테스트 키(test_)로 돌면 "실제로 돈이 나가지 않아요" 를 단다 — 운영 키로 바꾸기 전까지 누구도 진짜 결제로 착각하지 않게.
import { PlanPicker } from "@/components/payments/plan-picker";
import { UseCreditButton } from "@/components/membership/use-credit-button";
import { MEMBERSHIP_MESSAGES as MM } from "@/lib/membership/messages";
import { FormMessage } from "@/components/ui/form-message";
import { sectionCardClass } from "@/components/ui/page";
import { formatDateTime } from "@/lib/format";
import { PAYMENT_MESSAGES as M, PRODUCT_COPY } from "@/lib/payments/messages";
import { TARGET_SLOT, type PlanChoice } from "@/lib/payments/products";
import { bundleListPrice, quote } from "@/lib/pricing/quote";
import { isBundleProduct } from "@/lib/pricing/settings";
import type { PromoTargetKind } from "@/server/db/schema";
import type { BoostTargetDto } from "@/server/services/payments";
import type { PlanOption } from "@/components/payments/plan-picker";
import { tossClientKey, tossConfigured } from "@/server/payments/toss";
import { hasPaid } from "@/server/services/pricing";
import { getPricingSettings } from "@/server/services/settings";

/** credits: 지금 쓸 수 있는 멤버십 이용권(없으면 0). pairs: 같이 사기의 짝 후보(services/payments 의 listMyLiveTargets). initialPlan: 요금 안내에서 고르고 온 쪽 */
export async function BoostPurchase({ kind, target, customerKey, credits = 0, pairs, initialPlan = null }: { kind: PromoTargetKind; target: BoostTargetDto; customerKey: string; credits?: number; pairs: Array<{ id: string; title: string }>; initialPlan?: PlanChoice | null }) {
  const copy = PRODUCT_COPY[kind];
  const clientKey = tossClientKey();
  // 값은 요금 설정과 프로모션으로 이 사람에게 매긴 값 — 주문 만들기(services/pricing 의 quoteFor)와 같은 함수(quote)로 정한다
  const [settings, everPaid] = await Promise.all([getPricingSettings(), hasPaid(customerKey, "products")]);
  const now = new Date();
  const options: PlanOption[] = settings.products
    .filter((p) => p.active && p.slots.includes(TARGET_SLOT[kind]))
    .map((p) => ({ id: p.id, name: p.name, days: p.days, bundle: isBundleProduct(p), quote: quote(settings, p.id, { everPaid }, now), list: isBundleProduct(p) ? bundleListPrice(settings, p) : 0 }))
    // 묶음 먼저(2026-10-28 사용자 "비싼 것 먼저"), 같은 갈래 안은 관리자 목록 순서
    .sort((a, b) => Number(b.bundle) - Number(a.bundle));
  const ready = Boolean(clientKey) && tossConfigured();

  return (
    <section className={sectionCardClass("flex flex-col gap-4")}>
      <div className="flex flex-col gap-1">
        <span className="text-[12.5px] text-dim">{copy.title}</span>
        <h2 className="text-[18px] font-bold text-ink">{target.title}</h2>
      </div>
      <ul className="flex flex-col gap-1.5 text-[13.5px] leading-[1.6] text-ink-2">
        {copy.points.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-acc" />
            {line}
          </li>
        ))}
      </ul>
      {target.boostedUntil && <FormMessage tone="info">{M.currentBoost(formatDateTime(target.boostedUntil))}</FormMessage>}
      {target.live && credits > 0 && (
        <>
          <UseCreditButton kind={kind} targetId={target.id} credits={credits} />
          <p className="text-center text-[12.5px] text-dim">{MM.orPay}</p>
        </>
      )}
      {!target.live ? (
        <FormMessage tone="error">{M.notLive}</FormMessage>
      ) : options.length === 0 ? (
        <FormMessage tone="info">{M.notOnSale}</FormMessage>
      ) : (
        <>
          <PlanPicker kind={kind} targetId={target.id} pairs={pairs} initialPlan={initialPlan} options={options} checkout={ready ? { clientKey, customerKey } : null} />
          {!ready && <FormMessage tone="info">{M.notConfigured}</FormMessage>}
        </>
      )}
    </section>
  );
}
