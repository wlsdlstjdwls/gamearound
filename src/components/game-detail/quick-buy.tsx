// 휴대폰 제목 밑 최저가 한 줄 — 값과 스토어 이름(2026-11-20 사용자 점검 "가격과 구매 단추가 한참 아래").
//
// 히어로가 한 기둥인 폭(md 아래)에서는 그림, 제목, 소개, 평점, 버튼, 플레이타임이 쌓여 가격 카드가 첫 화면 세 장 아래(390px 실측 약 1,400px)에 섰다.
// 상세에 오는 사람의 첫 물음이 "지금 얼마, 어디서" 라 그 답만 제목 밑으로 올린다. 아래 가격 카드는 그대로 둔다 — 비교와 구매는 거기서 한다.
// 넓은 화면은 서지 않는다: 히어로 바로 아래 가격 카드가 첫 화면 안에 든다.
//
// 구매 단추는 두지 않는다(같은 날 사용자 "구매하기 버튼이 굳이 따로 필요한가"). 같은 스토어로 가는 단추가 아래 카드에 이미 있다 —
// 줄 전체가 그 가격 카드(PRICES_SECTION_ID)로 내려 주는 화면 안 링크다. 채운 파랑은 카드의 그 한 행이 다시 맡는다(platform-prices/tile 의 buyButtonClass).
// 행은 그 카드 행과 같다(platform-prices/order 의 primaryBuyRow) — 위 값과 아래 강조가 다른 스토어를 말하면 안 된다.
// 새로 묻지 않는다 — 화면이 이미 받은 행에서 고른다(Neon 왕복은 비싸다). 값 있고 링크 있는 행이 없으면 줄을 세우지 않는다.
import { PRICES_SECTION_ID } from "@/components/game-detail/constants";
import { DiscountBadge } from "@/components/ui/discount";
import { ChevronDownIcon } from "@/components/ui/icons";
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
    <a
      href={`#${PRICES_SECTION_ID}`}
      aria-label={`${D.quickBuyLabel} ${store} ${formatPrice(p.currentPrice, p.currency)}, ${D.quickBuyAria}`}
      className="press flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface px-4 py-3 shadow-hair transition-colors duration-base hover:bg-surface-2 md:hidden"
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[12.5px] font-semibold text-mut">
          {D.quickBuyLabel} | {store}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <b className="text-[20px] font-extrabold tracking-[-0.03em] text-ink tabular-nums">{formatPrice(p.currentPrice, p.currency)}</b>
          <DiscountBadge pct={p.discountPct} size="sm" />
        </span>
      </span>
      <span aria-hidden className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-mut">
        {D.quickBuyMore}
        <ChevronDownIcon size={15} />
      </span>
    </a>
  );
}
