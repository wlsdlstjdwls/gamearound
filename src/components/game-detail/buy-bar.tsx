"use client";
// 좁은 화면(650 이하, 바닥 탭바가 서는 폭) 상세의 바닥 구매 띠 — 최저가 한 줄 + 구매하기(2026-10-27 사용자 검수).
// 휴대폰에서 가격 비교 카드는 화면 3분의 1 아래에서 시작해, "어디서 얼마에?" 라는 이 화면의 첫 물음에 답하려면 한참 내려가야 했다.
//
// 탭바 바로 위에 붙는다(덮지 않는다) — 탭바는 서비스 전체 길이라 상세 하나 때문에 가리면 안 된다.
// 가격 비교 마디가 화면에 들어와 있는 동안은 숨는다: 같은 값과 같은 단추가 카드에 그대로 서 있어 두 번 말할 이유가 없다.
// 판정은 game-headbar 처럼 IntersectionObserver 하나다(스크롤마다 재지 않는다). 넓은 화면에서는 아예 그리지 않는다(tab:hidden) —
// 그 폭에서는 가격 카드가 첫 화면 안에 선다.
import { useEffect, useState } from "react";
import { DiscountBadge } from "@/components/ui/discount";
import { buttonClass } from "@/components/ui/button";
import { PRICES_SECTION_ID } from "@/components/game-detail/constants";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";

export function BuyBar({
  label,
  price,
  listPrice,
  discountPct,
  storeUrl,
  free,
}: {
  /** 띠 왼쪽 위 작은 말 — "최저가 | Steam" 또는 견줄 카드가 없으면 플랫폼 이름만 */
  label: string;
  /** 서식을 입힌 값(lib/currency). 띠는 글자만 받는다 */
  price: string;
  listPrice: string | null;
  discountPct: number | null;
  /** 그 플랫폼 스토어 주소. 없으면 단추가 가격 비교 마디로 내려간다 — 눌리지 않는 단추를 띠에 세우지 않는다 */
  storeUrl: string | null;
  free: boolean;
}) {
  // 처음 그림은 "보인다" — 휴대폰 첫 화면에서는 가격 마디가 화면 밖이라 곧 그대로 맞는다. 넓은 화면은 CSS 가 숨긴다
  const [on, setOn] = useState(true);

  useEffect(() => {
    const el = document.getElementById(PRICES_SECTION_ID);
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOn(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* 띠가 덮을 만큼 문서 바닥을 비운다 — 안 비우면 푸터 마지막 줄이 띠 밑에 깔린다 */}
      <div aria-hidden className="h-[var(--buybar-h)] tab:hidden" />
      <div
        data-on={on}
        inert={!on}
        className="buybar fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-30 h-[var(--buybar-h)] border-t border-line bg-surface shadow-[var(--elev-card)] tab:hidden"
      >
        <div className="flex h-full items-center gap-3 px-4">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
            <span className="truncate text-[11.5px] font-bold text-mut">{label}</span>
            <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
              {listPrice && <span className="text-[11.5px] text-dim-2 line-through">{listPrice}</span>}
              <span className="text-[18px] font-extrabold tracking-[-0.03em] text-acc">{price}</span>
              <DiscountBadge pct={discountPct} size="sm" />
            </span>
          </div>
          {storeUrl ? (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: "accent", size: "row", className: "shrink-0 px-5" })}>
              {free ? D.buyBarFree : D.buyBarCta}
              <span className="sr-only"> (새 창에서 열림)</span>
            </a>
          ) : (
            <a href={`#${PRICES_SECTION_ID}`} className={buttonClass({ variant: "soft", size: "row", className: "shrink-0 px-5" })}>
              {D.buyBarCompare}
            </a>
          )}
        </div>
      </div>
    </>
  );
}
