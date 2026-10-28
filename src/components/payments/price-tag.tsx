// 값 한 덩어리 — 그은 값, 할인율 딱지, 프로모션 딱지, 큰 값(2026-10-28). 요금 카드, 멤버십 화면이 같은 모양으로 쓴다.
// 긋는 값은 근거가 있는 값만 받는다: 상품 정가(설정 값), 묶음이면 낱개 정가 합. 그을 값이 이번 값보다 크지 않으면 긋지 않는다.
import { Tag } from "@/components/ui/tag";
import { formatPrice } from "@/lib/currency";
import { BUNDLE_MESSAGES as B } from "@/lib/payments/messages";
import { PLANS_MESSAGES as M } from "@/lib/payments/plans-messages";
import { discountRate, type Quote } from "@/lib/pricing/quote";

export const PRICE_BIG = "text-[28px] font-black leading-none tabular-nums text-ink";

type Props = {
  quote: Quote;
  /** 그을 값. 없으면 정가(quote.regular) */
  list?: number;
  /** 큰 값 앞 작은 말(매달, 첫 달) */
  prefix?: string;
  /** 큰 값 아래 줄(아끼는 금액, 다음 달부터 값, 하루 값) */
  children?: React.ReactNode;
};

export function PriceTag({ quote, list = quote.regular, prefix, children }: Props) {
  const struck = list > quote.amount;
  return (
    <div className="flex flex-col gap-1">
      {(struck || quote.promoLabel) && (
        <span className="flex flex-wrap items-center gap-2">
          {struck && (
            <s className="text-[15px] font-medium tabular-nums text-dim">
              <span className="sr-only">{B.listPrice} </span>
              {formatPrice(list)}
            </s>
          )}
          {struck && <Tag tone="hot">{M.rate(discountRate(list, quote.amount))}</Tag>}
          {quote.promoLabel && <Tag tone="plum">{quote.promoLabel}</Tag>}
        </span>
      )}
      <span className={PRICE_BIG}>
        {prefix && <span className="mr-1 text-[13px] font-semibold text-mut">{prefix}</span>}
        {formatPrice(quote.amount)}
      </span>
      {children}
    </div>
  );
}
