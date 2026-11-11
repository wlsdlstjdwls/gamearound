// 합친 카드 한 장 — 같은 갈래의 값 카드 여럿을 한 카드에 줄로 세운다. 처음은 PC(Steam, Epic, 2026-11-11 사용자 "Steam, Epic 하나로 못 합치나"),
// 같은 날 PlayStation(PS5, PS4)과 Nintendo(Switch, Switch 2)도 같은 꼴로 합쳤다(사용자 "PS5, PS4를 카드 하나로"). 줄 이름은 스토어(Steam) 또는 세대(PS5)다.
//
// 왜: 둘 다 같은 PC 에서 하는 같은 게임이라 출시일, 평점 같은 사실 줄이 두 카드에 똑같이 되풀이됐고, 카드가 다섯 장이면
// 넓은 화면 네 칸 격자에서 마지막 한 장이 둘째 줄로 떨어졌다. 비교할 것은 "어느 스토어가 싼가" 하나라 한 카드 안에 값 줄로 두면 바로 견준다.
//
// 합치는 때는 둘 다 값 카드일 때뿐이다(prices.tsx). 한쪽만 팔거나 한쪽이 출시 전이면 예전처럼 따로 선다 — 출시 카드는 알림 단추가 따로 있다.
// 고르기(game-detail/platform-pick)는 그 갈래 전부다(order 의 mergePickKey) — 그래프는 줄마다의 선을 함께, 할인 예측은 묶은 기록을 함께 본다.
import { formatPrice } from "@/lib/currency";
import { platformLabel } from "@/lib/format";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { GAME_MESSAGES, PREORDER_LABEL } from "@/lib/games/messages";
import { isPreorder } from "@/lib/games/preorder";
import { brandKeyOf } from "@/lib/platform";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { DiscountBadge, HistoricLowBadge } from "@/components/ui/discount";
import { PendingNote } from "@/components/ui/pending-note";
import { ClockIcon } from "@/components/ui/icons";
import { Tag } from "@/components/ui/tag";
import { SubscriptionChips } from "@/components/subscription-badges";
import { PickableTile } from "@/components/game-detail/platform-pick";
import { brandNameOf, byPrice, generationOf, type PlatformPriceItem } from "@/components/platform-prices/order";
import { CardHead, Row, STORE_CTA, STORE_LINK_MISSING, TILE, userScoreText } from "@/components/platform-prices/tile";

/**
 * 스토어마다 서는 구매 단추는 스토어 이름만 적는다. "Steam에서 구매" 는 네 칸 격자의 반쪽 단추에서 잘렸다(2026-11-11 실측).
 * 무엇을 하는 단추인지는 카드의 다른 단추(구매하기)와 같은 채운 모양이 말하고, 낭독기에는 뒤에 "에서 구매" 를 붙인다
 */
const STORE_CTA_SR = "에서 구매";

/** 카드 안 줄 이름 — 세대 묶음(PS5, PS4)은 세대, PC 는 스토어(Steam, Epic). 카드 머리가 이미 "PlayStation" 이라 줄까지 같은 말이면 가를 수 없다 */
function lineName(p: PlatformPriceItem): string {
  return generationOf(p.platform) ?? brandNameOf(p);
}

/** 스토어 한 줄 — 이름, (할인이면 정가 취소선), 지금 값, 할인율. 더 싼 줄만 값을 브랜드 색으로 칠한다 */
function StoreLine({ p, cheapest }: { p: PlatformPriceItem; cheapest: boolean }) {
  const hasDiscount = Boolean(p.discountPct && p.discountPct > 0);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <dt className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-bold text-ink">
          <span className="truncate">{lineName(p)}</span>
          {isPreorder(p) && <Tag>{PREORDER_LABEL}</Tag>}
        </dt>
        <dd className="flex min-w-0 items-center justify-end gap-1.5 whitespace-nowrap">
          {p.currentPrice === null ? (
            <PendingNote icon={<ClockIcon size={14} />}>{GAME_MESSAGES.pricePending}</PendingNote>
          ) : (
            <>
              {hasDiscount && p.listPrice !== null && <span className="text-[12px] text-dim-2 line-through">{formatPrice(p.listPrice, p.currency)}</span>}
              <span className={cn("text-[18px] font-extrabold tracking-[-0.03em] sm:text-[19px]", cheapest ? "text-acc" : "text-ink")}>{formatPrice(p.currentPrice, p.currency)}</span>
            </>
          )}
          {hasDiscount && <DiscountBadge pct={p.discountPct} size="sm" />}
        </dd>
      </div>
      {hasDiscount && p.historicLow && (
        <div className="flex justify-end">
          <HistoricLowBadge show size="sm" />
        </div>
      )}
    </div>
  );
}

export function MergedTile({
  label,
  pickKey,
  rows,
  id,
  secondId,
  isBest,
  release,
  quotedUserScorePlatform,
  addons,
}: {
  /** 카드 머리 이름(PC, PlayStation, Nintendo 일본) */
  label: string;
  /** 이 카드를 고르면 쓰는 고른 값(order 의 mergePickKey) */
  pickKey: string;
  /** 같은 갈래 값 카드 둘 이상(순서 상관없다 — 안에서 싼 순으로 세운다) */
  rows: PlatformPriceItem[];
  /** 히어로의 플랫폼 이름이 눌러 내려올 자리. 두 스토어 이름이 다 이 카드로 와야 해서 하나는 카드에, 하나는 안쪽 표지에 단다 */
  id?: string;
  secondId?: string;
  /** 이 카드의 스토어 하나가 화면 전체 최저가다 */
  isBest: boolean;
  release: string | null;
  quotedUserScorePlatform: PlatformPriceItem["platform"] | null;
  addons: React.ReactNode;
}) {
  const ordered = [...rows].sort(byPrice);
  const cheapest = ordered[0];
  // 더 싼 스토어를 칠하는 것은 값이 정말 다를 때뿐이다. 같으면(둘 다 79,000원) 어느 쪽도 "싸다" 가 아니다
  const priced = ordered.filter((p) => p.currentPrice !== null && p.currency === cheapest.currency);
  const lowest = priced.length > 0 ? Math.min(...priced.map((p) => p.currentPrice!)) : null;
  const strictlyCheaper = (p: PlatformPriceItem) => lowest !== null && p.currentPrice === lowest && priced.some((q) => q.currentPrice! > lowest);
  const atLowest = (p: PlatformPriceItem) => lowest !== null && p.currentPrice === lowest;
  const showBest = isBest && cheapest.currentPrice !== 0;
  // 유저 점수는 히어로 평점 칸이 이미 인용한 스토어 것을 빼고 남는 첫 스토어 것 하나 — 스토어마다 재는 방식이 달라 섞지 않는다
  const scored = ordered.find((p) => p.platform !== quotedUserScorePlatform && userScoreText(p));
  const userScore = scored ? `${userScoreText(scored)} | ${lineName(scored)}` : null;
  // 같은 상품 주소를 가리키는 줄(PS5, PS4 겸용 상품)은 단추 하나 — 같은 곳으로 가는 단추 둘은 고르게만 한다
  const buttons = ordered.filter((p, i) => !p.storeUrl || ordered.findIndex((q) => q.storeUrl === p.storeUrl) === i);
  // 구독은 스토어마다 따로 든다(Steam 은 없고 Epic 도 드물다). 같은 구독이 둘에 다 들었으면 칩 하나
  const subscriptions = [...new Map(ordered.flatMap((p) => p.subscriptions).map((s) => [s.key, s])).values()];
  return (
    <PickableTile brand={pickKey} also={rows.map((r) => brandKeyOf(r.platform))} label={label} id={id} className={cn(TILE, "bg-surface shadow-hair")}>
      {secondId && <span id={secondId} className="absolute -top-24" aria-hidden />}
      <CardHead name={label}>
        {showBest && <span className="ml-auto shrink-0 rounded-full bg-acc px-2 py-[3px] text-[11px] font-bold leading-none text-on-ink">최저가</span>}
      </CardHead>

      <dl className="flex flex-col gap-1.5">
        <Row label={D.releaseRow}>{release ?? D.releaseUnknown}</Row>
        {userScore && <Row label={D.userScoreRow}>{userScore}</Row>}
      </dl>

      {/* 스토어 줄 — 싼 순. 값 묶음 자리(mt-auto)라 옆 카드의 값과 같은 높이에서 시작한다 */}
      <dl className="mt-auto flex flex-col gap-2 border-t border-line pt-2.5">
        {ordered.map((p) => (
          <StoreLine key={p.platform} p={p} cheapest={strictlyCheaper(p)} />
        ))}
      </dl>

      {subscriptions.length > 0 && (
        <div className="flex min-w-0 overflow-hidden">
          <SubscriptionChips subscriptions={subscriptions} />
        </div>
      )}

      {addons && <div className="flex pt-1">{addons}</div>}
      <div className="flex items-center gap-2 pt-1">
        {buttons.map((p) =>
          p.storeUrl ? (
            <a
              key={p.platform}
              href={p.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: atLowest(p) ? "accent" : "soft", size: "row", className: "min-w-0 flex-1" })}
            >
              <span className="truncate">{buttons.length === 1 ? STORE_CTA : lineName(p)}</span>
              <span className="sr-only">{STORE_CTA_SR} {platformLabel(p)} (새 창에서 열림)</span>
            </a>
          ) : (
            <span key={p.platform} aria-disabled="true" className={buttonClass({ variant: "soft", size: "row", className: "pointer-events-none min-w-0 flex-1 opacity-45" })}>
              <span className="truncate">{STORE_LINK_MISSING}</span>
            </span>
          ),
        )}
      </div>
    </PickableTile>
  );
}
