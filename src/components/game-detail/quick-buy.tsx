// 휴대폰 제목 밑 최저가 한 줄 — 값, 스토어 이름, 그 스토어로 가는 구매 단추(2026-11-20 사용자 점검 "가격과 구매 단추가 한참 아래").
//
// 히어로가 한 기둥인 폭(md 아래)에서는 그림, 제목, 소개, 평점, 버튼, 플레이타임이 쌓여 가격 카드가 첫 화면 세 장 아래(390px 실측 약 1,400px)에 섰다.
// 상세에 오는 사람의 첫 물음이 "지금 얼마, 어디서" 라 그 답만 제목 밑으로 올린다. 아래 가격 카드는 그대로 둔다 — 비교는 거기서 한다.
// 넓은 화면은 서지 않는다: 히어로 바로 아래 가격 카드가 첫 화면 안에 든다.
//
// 행은 가격 카드의 채운 구매 단추와 같은 행이다(platform-prices/order 의 primaryBuyRow) — 둘이 다른 스토어를 가리키면 안 된다.
// 그 폭에서는 카드 쪽 단추가 옅어져(platform-prices/tile 의 buyButtonClass) 채운 파랑은 이 단추 하나다.
// 새로 묻지 않는다 — 화면이 이미 받은 행에서 고른다(Neon 왕복은 비싸다). 값 있고 링크 있는 행이 없으면 줄을 세우지 않는다.
import { buttonClass } from "@/components/ui/button";
import { DiscountBadge } from "@/components/ui/discount";
import { STORE_CTA } from "@/components/platform-prices/tile";
import { primaryBuyRow } from "@/components/platform-prices/order";
import { formatPrice } from "@/lib/currency";
import { platformLabel } from "@/lib/format";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import type { PlatformDto } from "@/server/services/games";

export function QuickBuy({ platforms }: { platforms: PlatformDto[] }) {
  const p = primaryBuyRow(platforms);
  if (!p || p.currentPrice === null || !p.storeUrl) return null;
  const store = platformLabel(p);
  return (
    <div role="group" aria-label={D.quickBuyAria} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface px-4 py-3 shadow-hair md:hidden">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[12.5px] font-semibold text-mut">
          {D.quickBuyLabel} | {store}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <b className="text-[20px] font-extrabold tracking-[-0.03em] text-ink tabular-nums">{formatPrice(p.currentPrice, p.currency)}</b>
          <DiscountBadge pct={p.discountPct} size="sm" />
        </span>
      </div>
      <a href={p.storeUrl} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: "accent", size: "md", className: "shrink-0" })}>
        {STORE_CTA}
        <span className="sr-only"> {store} (새 창에서 열림)</span>
      </a>
    </div>
  );
}
