"use client";
// 광고 구매 판의 "이것만 / 같이 사기"(2026-10-27 사용자 확정: 인디 게임 부스트, 홍보 글 고정 각 6,900원, 같이 사면 9,900원).
// 고르면 값과 결제 위젯 금액이 그 자리에서 바뀐다. 같이 사기는 짝이 될 내 공개 글(인디 게임 화면이면 홍보 글, 홍보 고정 화면이면 인디 게임)을 고른다.
// 짝이 없으면 같이 사기 칸을 잠그고 까닭을 적는다 — 칸을 아예 숨기면 묶음 할인이 있는 줄도 모른다.
// 묶음은 할인으로 보이게 한다(2026-10-27 사용자): 낱개 둘의 합을 긋고 묶음 값과 "N원 할인" 딱지를 나란히 둔다.
// 2026-10-28(사용자: 비싼 것 먼저, 정가 긋고 할인 강조): 같이 사기를 앞에 두고 짝이 있으면 처음부터 골라 둔다(기본값이 가장 많이 남는다).
// 할인은 율(28%)과 금액(3,900원 아껴요)을 함께 말한다 — 율은 크기를, 금액은 손에 쥐는 몫을 읽힌다. "이것만" 을 고르면 아끼는 몫을 한 줄로 다시 보인다.
// 묶음 주문의 주 대상은 늘 인디 게임이다(lib/payments/products) — 홍보 고정 화면에서는 이 화면의 글이 둘째가 된다.
import { useState } from "react";
import { BoostCheckout } from "@/components/payments/boost-checkout";
import { ChoiceCard } from "@/components/ui/choice-card";
import { FormSelect } from "@/components/ui/select";
import { formatPrice } from "@/lib/currency";
import { cn } from "@/lib/cn";
import { BUNDLE_MESSAGES as B, PAYMENT_MESSAGES as M } from "@/lib/payments/messages";
import { PLANS_MESSAGES as PL } from "@/lib/payments/plans-messages";
import { PRODUCTS, type PlanChoice, type ProductKey } from "@/lib/payments/products";
import { discountRate, type Quote } from "@/lib/pricing/quote";
import { Tag } from "@/components/ui/tag";

type Props = {
  /** 이 화면의 낱개 상품 */
  product: Extract<ProductKey, "boost_indie_7d" | "pin_promo_7d">;
  targetId: string;
  /** 같이 사기의 짝 후보 */
  pairs: Array<{ id: string; title: string }>;
  /** 결제 위젯을 그릴 수 있나(키가 있나). 아니면 값만 보이고 준비 중 안내는 바깥이 단다 */
  checkout: { clientKey: string; customerKey: string } | null;
  /** 요금 안내 카드에서 고르고 온 쪽. 없으면 짝이 있을 때 같이 사기 */
  initialPlan?: PlanChoice | null;
  /**
   * 이 사람에게 매긴 값(services/pricing, 프로모션 포함)과 요금 설정의 이름. 서버가 주문 줄에 적는 값과 같은 함수로 낸 값이다 —
   * 결제창 금액이 주문과 다르면 승인하지 않으므로 둘이 갈리면 결제가 막힌다
   */
  prices: { single: Quote; bundle: Quote; bundleList: number; bundleOnSale: boolean; singleName: string; bundleName: string };
};

/** 그은 값 */
function ListPrice({ value, className }: { value: number; className?: string }) {
  return (
    <s className={cn("font-medium tabular-nums text-dim", className)}>
      <span className="sr-only">{B.listPrice} </span>
      {formatPrice(value)}
    </s>
  );
}

export function PlanPicker({ product, targetId, pairs, checkout, initialPlan = null, prices }: Props) {
  const canBundle = pairs.length > 0 && prices.bundleOnSale;
  const [plan, setPlan] = useState<PlanChoice>(!canBundle ? "single" : (initialPlan ?? "bundle"));
  const [pairId, setPairId] = useState(pairs[0]?.id ?? "");
  const isIndie = product === "boost_indie_7d";
  const bundle = plan === "bundle" && pairId !== "";
  const key: ProductKey = bundle ? "bundle_7d" : product;
  const chosen = bundle ? prices.bundle : prices.single;
  const amount = chosen.amount;
  const saving = Math.max(0, prices.bundleList - prices.bundle.amount);
  const rate = discountRate(prices.bundleList, prices.bundle.amount);
  // 묶음 주 대상은 인디 게임 — 홍보 고정 화면이면 고른 짝이 주 대상이고 이 화면의 글이 둘째다
  const [mainId, extraId] = !bundle ? [targetId, null] : isIndie ? [targetId, pairId] : [pairId, targetId];

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-semibold text-mut">{B.legend}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {prices.bundleOnSale && (
            <ChoiceCard
              name="plan"
              value="bundle"
              checked={plan === "bundle"}
              onChange={() => setPlan("bundle")}
              disabled={pairs.length === 0}
              label={
                <span className="flex flex-wrap items-baseline gap-x-1.5">
                  {prices.bundleName}
                  {saving > 0 && <ListPrice value={prices.bundleList} />}
                  {formatPrice(prices.bundle.amount)}
                  {rate > 0 && <Tag tone="hot">{PL.rate(rate)}</Tag>}
                  {prices.bundle.promoLabel && <Tag tone="plum">{prices.bundle.promoLabel}</Tag>}
                </span>
              }
              note={isIndie ? B.bundleNoteIndie : B.bundleNotePin}
            />
          )}
          <ChoiceCard
            name="plan"
            value="single"
            checked={plan === "single"}
            onChange={() => setPlan("single")}
            label={
              <span className="flex flex-wrap items-baseline gap-x-1.5">
                {prices.singleName}
                {prices.single.amount < prices.single.regular && <ListPrice value={prices.single.regular} />}
                {formatPrice(prices.single.amount)}
                {prices.single.promoLabel && <Tag tone="plum">{prices.single.promoLabel}</Tag>}
              </span>
            }
            note={PRODUCTS[product].name}
          />
        </div>
        {prices.bundleOnSale && pairs.length === 0 && <p className="text-[12.5px] text-dim">{isIndie ? B.noPromo : B.noIndie}</p>}
        {canBundle && plan === "single" && saving > 0 && <p className="text-[12.5px] font-semibold text-danger">{B.bundleHint(prices.bundleName, formatPrice(saving))}</p>}
      </fieldset>

      {plan === "bundle" && pairs.length > 0 && (
        <FormSelect name="pair" label={isIndie ? B.pickPromo : B.pickIndie} size="md" value={pairId} onChange={setPairId} options={pairs.map((p) => ({ value: p.id, label: p.title }))} />
      )}

      <div className="flex items-end justify-between border-t border-line pt-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-[14px] text-mut">{M.price}</span>
          {bundle && saving > 0 && <span className="text-[12.5px] font-semibold text-danger">{PL.saving(formatPrice(saving))}</span>}
        </span>
        <span className="flex items-baseline gap-2">
          {chosen.promoLabel && <Tag tone="plum">{chosen.promoLabel}</Tag>}
          {bundle && rate > 0 && <Tag tone="hot">{PL.rate(rate)}</Tag>}
          {bundle && saving > 0 && <ListPrice value={prices.bundleList} className="text-[14px]" />}
          {!bundle && chosen.amount < chosen.regular && <ListPrice value={chosen.regular} className="text-[14px]" />}
          <span key={amount} className="animate-pop text-[22px] font-black tabular-nums text-ink">
            {formatPrice(amount)}
          </span>
        </span>
      </div>

      {checkout && (
        <>
          {checkout.clientKey.startsWith("test_") && <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">{M.testMode}</p>}
          <BoostCheckout product={key} targetId={mainId} extraTargetId={extraId} clientKey={checkout.clientKey} customerKey={checkout.customerKey} amount={amount} />
        </>
      )}
    </div>
  );
}
