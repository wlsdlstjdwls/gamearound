"use client";
// 광고 구매 판의 상품 고르기(2026-10-27 처음엔 "이것만 / 같이 사기" 둘). 고르면 값과 결제 위젯 금액이 그 자리에서 바뀐다.
// 2026-10-29 상품이 관리자가 만드는 목록이 되면서(lib/pricing/settings) 칸 수가 정해지지 않았다 — 이 글의 자리를 품은 판매 중 상품마다 칸 하나다.
// 묶음(자리 둘)은 짝이 될 내 공개 글(인디 게임 화면이면 홍보 글, 홍보 고정 화면이면 인디 게임)을 같이 고른다.
// 짝이 없으면 묶음 칸을 잠그고 까닭을 적는다 — 칸을 아예 숨기면 묶음 할인이 있는 줄도 모른다.
// 묶음은 할인으로 보이게 한다(2026-10-27 사용자): 같은 기간 낱개 둘의 합을 긋고 묶음 값과 할인율 딱지를 나란히 둔다.
// 2026-10-28(사용자: 비싼 것 먼저, 정가 긋고 할인 강조): 묶음을 앞에 두고 짝이 있으면 처음부터 골라 둔다(기본값이 가장 많이 남는다).
// 묶음 주문의 주 대상은 늘 인디 게임이다(lib/payments/products) — 홍보 고정 화면에서는 이 화면의 글이 둘째가 된다.
import { useState } from "react";
import { BoostCheckout } from "@/components/payments/boost-checkout";
import { ChoiceCard } from "@/components/ui/choice-card";
import { FormSelect } from "@/components/ui/select";
import { formatPrice } from "@/lib/currency";
import { DEFAULT_TONES } from "@/lib/pricing/copy-tones";
import { ToneBadge } from "@/components/payments/copy-tone";
import { cn } from "@/lib/cn";
import { BUNDLE_MESSAGES as B, PAYMENT_MESSAGES as M } from "@/lib/payments/messages";
import { PLANS_MESSAGES as PL } from "@/lib/payments/plans-messages";
import type { PlanChoice } from "@/lib/payments/products";
import { discountRate, type Quote } from "@/lib/pricing/quote";
import type { PromoTargetKind } from "@/server/db/schema";
import { Tag } from "@/components/ui/tag";

/**
 * 고르기 칸 하나. 값은 이 사람에게 매긴 값(프로모션 포함)이다 — 서버가 주문 줄에 적는 값과 같은 함수로 냈다.
 * 결제창 금액이 주문과 다르면 승인하지 않으므로 둘이 갈리면 결제가 막힌다
 */
export type PlanOption = { id: string; name: string; days: number; bundle: boolean; quote: Quote; /** 묶음의 그을 값(같은 기간 낱개 둘 정가 합). 낱개, 짝 낱개 없음은 0 */ list: number };

type Props = {
  /** 이 화면의 글 갈래 */
  kind: PromoTargetKind;
  targetId: string;
  /** 묶음의 짝 후보 */
  pairs: Array<{ id: string; title: string }>;
  /** 결제 위젯을 그릴 수 있나(키가 있나). 아니면 값만 보이고 준비 중 안내는 바깥이 단다 */
  checkout: { clientKey: string; customerKey: string } | null;
  /** 요금 안내 카드에서 고르고 온 갈래. 없으면 짝이 있을 때 묶음 */
  initialPlan?: PlanChoice | null;
  /** 묶음 먼저 줄 세운 상품들(boost-purchase) */
  options: PlanOption[];
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

/** 이 칸이 긋는 값과 아끼는 몫. 묶음은 낱개 합, 낱개는 프로모션 전 정가 */
function strikeOf(o: PlanOption): number {
  const base = o.bundle ? o.list : o.quote.regular;
  return base > o.quote.amount ? base : 0;
}

function firstChoice(options: PlanOption[], canBundle: boolean, initialPlan: PlanChoice | null): string {
  const bundle = options.find((o) => o.bundle);
  const single = options.find((o) => !o.bundle);
  const want = initialPlan === "single" || !canBundle ? single : (bundle ?? single);
  return (want ?? single ?? options[0])?.id ?? "";
}

export function PlanPicker({ kind, targetId, pairs, checkout, initialPlan = null, options }: Props) {
  const hasPairs = pairs.length > 0;
  const [picked, setPicked] = useState(() => firstChoice(options, hasPairs, initialPlan));
  const [pairId, setPairId] = useState(pairs[0]?.id ?? "");
  const isIndie = kind === "indie_post";
  const chosen = options.find((o) => o.id === picked) ?? options[0];
  if (!chosen) return null;
  const bundle = chosen.bundle && pairId !== "";
  const strike = strikeOf(chosen);
  const rate = chosen.bundle ? discountRate(chosen.list, chosen.quote.amount) : 0;
  // 낱개를 골랐을 때 같은 기간 묶음이 더 남으면 한 줄로 다시 권한다
  const better = !chosen.bundle && hasPairs ? options.find((o) => o.bundle && o.days === chosen.days && o.list > o.quote.amount) : undefined;
  // 묶음 주 대상은 인디 게임 — 홍보 고정 화면이면 고른 짝이 주 대상이고 이 화면의 글이 둘째다
  const [mainId, extraId] = !bundle ? [targetId, null] : isIndie ? [targetId, pairId] : [pairId, targetId];

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-semibold text-mut">{B.legend}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((o) => {
            const s = strikeOf(o);
            const r = o.bundle ? discountRate(o.list, o.quote.amount) : 0;
            return (
              <ChoiceCard
                key={o.id}
                name="plan"
                value={o.id}
                checked={chosen.id === o.id}
                onChange={() => setPicked(o.id)}
                disabled={o.bundle && !hasPairs}
                label={
                  <span className="flex flex-wrap items-baseline gap-x-1.5">
                    {o.name}
                    {s > 0 && <ListPrice value={s} />}
                    {formatPrice(o.quote.amount)}
                    {r > 0 && <Tag tone="hot">{PL.rate(r)}</Tag>}
                    {o.quote.promoLabel && <ToneBadge tone={o.quote.promoTone ?? DEFAULT_TONES.promo}>{o.quote.promoLabel}</ToneBadge>}
                  </span>
                }
                note={o.bundle ? (isIndie ? B.bundleNoteIndie(o.days) : B.bundleNotePin(o.days)) : B.singleNote(o.days)}
              />
            );
          })}
        </div>
        {options.some((o) => o.bundle) && !hasPairs && <p className="text-[12.5px] text-dim">{isIndie ? B.noPromo : B.noIndie}</p>}
        {better && <p className="text-[12.5px] font-semibold text-danger">{B.bundleHint(better.name, formatPrice(better.list - better.quote.amount))}</p>}
      </fieldset>

      {chosen.bundle && hasPairs && (
        <FormSelect name="pair" label={isIndie ? B.pickPromo : B.pickIndie} size="md" value={pairId} onChange={setPairId} options={pairs.map((p) => ({ value: p.id, label: p.title }))} />
      )}

      <div className="flex items-end justify-between border-t border-line pt-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-[14px] text-mut">{M.price}</span>
          {chosen.bundle && strike > 0 && <span className="text-[12.5px] font-semibold text-danger">{PL.saving(formatPrice(strike - chosen.quote.amount))}</span>}
        </span>
        <span className="flex items-baseline gap-2">
          {chosen.quote.promoLabel && <ToneBadge tone={chosen.quote.promoTone ?? DEFAULT_TONES.promo}>{chosen.quote.promoLabel}</ToneBadge>}
          {rate > 0 && <Tag tone="hot">{PL.rate(rate)}</Tag>}
          {strike > 0 && <ListPrice value={strike} className="text-[14px]" />}
          <span key={chosen.quote.amount} className="animate-pop text-[22px] font-black tabular-nums text-ink">
            {formatPrice(chosen.quote.amount)}
          </span>
        </span>
      </div>

      {/* 짝 없는 묶음만 남은 경우 결제를 세우지 않는다 — 서버가 짝 없는 묶음 주문을 받지 않는다 */}
      {checkout && (!chosen.bundle || bundle) && (
        <>
          {checkout.clientKey.startsWith("test_") && <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">{M.testMode}</p>}
          <BoostCheckout product={chosen.id} targetId={mainId} extraTargetId={extraId} clientKey={checkout.clientKey} customerKey={checkout.customerKey} amount={chosen.quote.amount} />
        </>
      )}
    </div>
  );
}
