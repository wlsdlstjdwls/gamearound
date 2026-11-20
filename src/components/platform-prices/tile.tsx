// 플랫폼 카드 한 장 — 목업 v2.0 "플랫폼별 가격 비교"(2026-10-26), 2026-11-16 줄 맞춤 개편.
//
// 줄 순서(2026-11-16 사용자 지정): 이름 - 출시일 - 지원 기종 - (구분선) - 정가 - 현재가 - 구독(게임패스 등) - 구매하기.
// **카드끼리 같은 줄이 같은 높이에 선다**(사용자 "플랫폼끼리의 오와 열을 맞춰야 됨"). 카드마다 제 세로 쌓기였을 때는
// 할인 배지, 역대 최저가 줄, 구독 칩 유무에 따라 줄이 카드마다 밀려 가로로 견줄 수가 없었다. 지금은 격자(prices.tsx 의 GRID)가
// 일곱 줄을 갖고 카드는 그 줄을 빌려 쓴다(CSS subgrid, TILE). 한 카드의 어느 줄이 길어지면 같은 띠 카드들의 그 줄이 함께 길어진다.
// 그래서 값이 없는 줄도 비우지 않고 "-" 나 "없음" 으로 자리를 지킨다.
//
// 걷은 것(2026-11-16 사용자): 버전 줄, 유저 점수 줄, 카드 안 추가 콘텐츠 단추(추가 콘텐츠는 플랫폼이 아니라 게임에 딸려 상세의 제 마디로 갔다).
//
// 에디션 줄(목업 "얼티밋 에디션")은 없다 — 스토어 행 하나가 어느 판인지 우리는 따로 모르고, 에디션은 아래
// "에디션" 마디가 판별로 말한다. 모르는 값을 "기본판" 이라 적으면 PS 처럼 기본 상품이 에디션인 스토어에서 거짓이 된다.
import { formatPrice } from "@/lib/currency";
import { platformLabel } from "@/lib/format";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { GAME_MESSAGES, PREORDER_LABEL } from "@/lib/games/messages";
import { isPreorder } from "@/lib/games/preorder";
import { brandKeyOf, DEVICE_LABEL, devicesOf } from "@/lib/platform";
import { cn } from "@/lib/cn";
import { RIPPLE_DELAYS_MS } from "@/lib/motion";
import { buttonClass } from "@/components/ui/button";
import { DiscountBadge, HistoricLowBadge } from "@/components/ui/discount";
import { PendingNote } from "@/components/ui/pending-note";
import { ClockIcon, StoreIcon } from "@/components/ui/icons";
import { Tag } from "@/components/ui/tag";
import { SubscriptionChips } from "@/components/subscription-badges";
import { brandNameOf, generationOf, type PlatformPriceItem } from "@/components/platform-prices/order";
import { PickableTile } from "@/components/game-detail/platform-pick";

/** 스토어로 나가는 버튼의 말(기획서 v2.0 S-05 "구매하기") */
export const STORE_CTA = "구매하기";
/** 링크가 아직 없는 카드의 버튼 자리에 서는 말. 버튼 모양은 그대로 두고 눌리지만 않는다(기획서 v2.0 S-07) */
export const STORE_LINK_MISSING = "스토어 링크 준비 중";

/**
 * 카드 껍데기 — 격자 일곱 줄을 빌려 쓰는 subgrid(머리 주석). row-span 값과 카드 안 줄 수가 늘 같아야 한다.
 * 줄: 1 이름, 2 출시일, 3 지원 기종, 4 정가, 5 현재가, 6 구독, 7 구매 단추
 */
export const TILE = "relative row-span-7 grid min-w-0 scroll-mt-24 grid-rows-subgrid gap-y-2 rounded-[var(--radius-md)] p-4 sm:p-5";
/** 값 묶음 첫 줄(정가) 위 구분선 */
export const PRICE_DIVIDER = "border-t border-line pt-2.5";
/** 칸에 값이 없을 때 */
export const NONE = "-";

/** 이름표 - 값 한 줄(목업 .row). 값은 줄바꿈하지 않는다 — 날짜가 접히면 같은 줄의 높이가 카드마다 달라진다 */
export function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-[13px]", className)}>
      <dt className="shrink-0 text-mut">{label}</dt>
      <dd className="min-w-0 truncate text-right text-ink">{children}</dd>
    </div>
  );
}

export function CardHead({ name, children }: { name: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <h3 className="truncate text-[16px] font-bold text-ink sm:text-[17px]">{name}</h3>
      {children}
    </div>
  );
}

/**
 * 최저가 딱지 — 채운 면 대신 테두리 한 줄(2026-11-16 색 줄이기). 카드 안에서 값 다음으로 눈이 가야 할 말이라 남긴다.
 * 테두리와 글자는 먹색이다(2026-11-20 사용자 점검 "파랑이 많다") — 파랑은 누르는 것의 색인데 이 딱지는 눌리지 않는다.
 */
export function BestMark() {
  return <span className="ml-auto shrink-0 rounded-full px-2 py-[3px] text-[12px] font-bold leading-none text-ink-2 ring-1 ring-line-strong ring-inset">최저가</span>;
}

/**
 * 카드의 구매 단추 모양. 평소에는 모두 같은 옅은 단추이고, 지금 고른 카드(platform-pick 의 PickableTile, li[data-picked])의 단추만 채운 파랑이다.
 * 2026-11-20 사용자 "구매하기 버튼은 왜 색상을 다르게 해, 다르게 할 거면 선택되어 있는 카드만 다르게 해주던가".
 * 그날 낮에는 가장 싼 행 하나만 채웠는데 그 기준이 화면에 안 보여 단추 색이 제멋대로 갈린 것처럼 읽혔다. 고른 카드는 파랑 고리가 이미 서 있어 기준이 보인다.
 * 고름은 클라이언트 상태라 서버가 클래스를 못 정한다 — 카드 li 의 data-picked 를 CSS 로 읽는다(soft 위에 accent 값을 덮는다)
 */
const PICKED_FILL =
  "[li[data-picked]_&]:border-acc [li[data-picked]_&]:bg-acc [li[data-picked]_&]:text-on-ink [li[data-picked]_&]:shadow-1 [li[data-picked]_&]:hover:border-acc-hover [li[data-picked]_&]:hover:bg-acc-hover [li[data-picked]_&]:hover:text-on-ink";
export function buyButtonClass(className?: string): string {
  return buttonClass({ variant: "soft", size: "row", className: cn(PICKED_FILL, className) });
}

/** 지원 기종 줄 — 세대(PS5, Switch 2)를 알면 세대, 아니면 기기 갈래(PC) */
export function hardwareText(platforms: readonly PlatformPriceItem["platform"][]): string {
  const names = platforms.map((p) => generationOf(p) ?? devicesOf([p]).map((d) => DEVICE_LABEL[d]).join(", "));
  return [...new Set(names)].join(", ") || NONE;
}

/** 구독 줄(6) — 칩이 없으면 "없음" 으로 자리를 지킨다 */
export function SubscriptionRow({ subscriptions }: { subscriptions: PlatformPriceItem["subscriptions"] }) {
  return (
    // 구독이 여럿이면 칩이 줄마다 쌓이므로(subscription-badges) 이름표는 첫 칩 높이에 맞춰 위에 선다
    <div className="flex min-w-0 items-start justify-between gap-3 text-[13px]">
      <span className="shrink-0 pt-0.5 text-mut">{D.subscriptionRow}</span>
      {subscriptions.length > 0 ? (
        <span className="flex min-w-0 justify-end overflow-hidden">
          <SubscriptionChips subscriptions={subscriptions} />
        </span>
      ) : (
        <span className="text-dim">{D.subscriptionNone}</span>
      )}
    </div>
  );
}

/** 구매 단추 줄(7). 링크가 없어도 단추 자리는 지킨다(2026-09-22, 사용자 지정) — 같은 자리 같은 모양, 눌리지만 않는다 */
function BuyButton({ p }: { p: PlatformPriceItem }) {
  return p.storeUrl ? (
    <a href={p.storeUrl} target="_blank" rel="noopener noreferrer" className={buyButtonClass("min-w-0 flex-1")}>
      {STORE_CTA}
      <span className="sr-only"> {platformLabel(p)} (새 창에서 열림)</span>
    </a>
  ) : (
    <span aria-disabled="true" className={buttonClass({ variant: "soft", size: "row", className: "pointer-events-none min-w-0 flex-1 opacity-45" })}>
      {STORE_LINK_MISSING}
    </span>
  );
}

export function PriceTile({
  p,
  id,
  isBest,
  release,
}: {
  p: PlatformPriceItem;
  /** 히어로의 플랫폼 이름이 눌러 내려올 자리. 묶음의 첫 장만 받는다 */
  id?: string;
  isBest: boolean;
  release: string | null;
}) {
  const hasDiscount = Boolean(p.discountPct && p.discountPct > 0);
  // 무료면 "최저가" 를 세우지 않는다(2026-09-22, 사용자 지정) — 0원은 비교의 대상이 아니다
  const showBest = isBest && p.currentPrice !== 0;
  return (
    // 고를 수 있는 카드(game-detail/platform-pick). 최저가는 면을 칠하지 않고 딱지로만 말한다(2026-10-27)
    <PickableTile brand={brandKeyOf(p.platform)} label={brandNameOf(p)} id={id} className={cn(TILE, "bg-surface shadow-hair")}>
      <CardHead name={brandNameOf(p)}>
        {/* 스토어마다 따로 본다 — PS 는 예약 중이어도 스팀은 이미 팔 수 있다(lib/games/preorder) */}
        {isPreorder(p) && <Tag>{PREORDER_LABEL}</Tag>}
        {showBest && <BestMark />}
      </CardHead>

      {/* dl 은 contents — 줄 하나하나가 격자의 줄(subgrid)에 바로 앉아야 해서 감싸는 상자를 지운다 */}
      <dl className="contents">
        <Row label={D.releaseRow}>{release ?? D.releaseUnknown}</Row>
        <Row label={D.hardwareRow}>{hardwareText([p.platform])}</Row>
        <Row label={D.listPriceRow} className={PRICE_DIVIDER}>
          {/* 정가가 비어도 할인이 아니면 지금 값이 곧 정가다 — "-" 옆에 현재 가격만 서면 고장으로 읽혔다(2026-11-11 엘든 링 PS4 카드) */}
          {p.listPrice === null && p.currentPrice !== null && !hasDiscount ? (
            <span>{formatPrice(p.currentPrice, p.currency)}</span>
          ) : p.listPrice === null ? (
            <span className="text-dim">{NONE}</span>
          ) : (
            <span className={hasDiscount ? "text-dim-2 line-through" : undefined}>{formatPrice(p.listPrice, p.currency)}</span>
          )}
        </Row>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <dt className="shrink-0 text-[13px] text-mut">{D.currentPriceRow}</dt>
            <dd className="flex min-w-0 items-center justify-end gap-1.5 whitespace-nowrap">
              {/* 값을 아직 못 받았으면 "-" 대신 말로 한다(2026-10-07) — 큰 "-" 는 0원으로도 고장으로도 읽혔다 */}
              {p.currentPrice === null ? (
                <PendingNote icon={<ClockIcon size={14} />}>{GAME_MESSAGES.pricePending}</PendingNote>
              ) : (
                <span className="text-[22px] font-extrabold tracking-[-0.035em] text-ink sm:text-[24px]">{formatPrice(p.currentPrice, p.currency)}</span>
              )}
              {hasDiscount && <DiscountBadge pct={p.discountPct} size="sm" />}
            </dd>
          </div>
          {/* 역대 최저가는 값 줄 아래 — 값 줄에 같이 세우면 네 칸 폭에서 "현재 가격" 이름표를 덮었다(2026-11-11) */}
          {hasDiscount && p.historicLow && (
            <div className="flex justify-end">
              <HistoricLowBadge show size="sm" />
            </div>
          )}
        </div>
      </dl>

      <SubscriptionRow subscriptions={p.subscriptions} />

      <div className="flex items-end pt-1">
        <BuyButton p={p} />
      </div>
    </PickableTile>
  );
}

/** 이 게임 행이 없는 플랫폼 = 흐린 카드 한 장(목업 .pc.no "미지원"). 말은 GAME_MESSAGES.storeAbsent 주석 */
export function AbsentTile({ id, label, className }: { id?: string; label: string; className?: string }) {
  return (
    // 2026-10-28 사용자 "비워져 있을 때 너무 비어 보인다": 가운데에 아이콘과 "서비스하지 않습니다" 한 줄을 세운다
    <li id={id} className={cn(TILE, "border border-dashed border-line-strong bg-surface-2/50", className)}>
      <CardHead name={label} />
      {/* 남은 여섯 줄을 통째로 쓴다(TILE 의 줄 수) */}
      <div className="row-span-6 flex flex-col items-center justify-center gap-2 py-3 text-center">
        {/* 2026-11-18 사용자 "너무 밋밋하다, 모션 넣을까": 빈 상태(empty-state)와 같은 결의 물결 + 떠 있는 아이콘. 색은 회색 —
            없는 자리를 파랑으로 칠하면 눈길을 뺏는다(같은 날 "파란색 남발"). 모션 축소는 전역 킬스위치가 끈다 */}
        <span aria-hidden className="relative grid size-16 place-items-center">
          {RIPPLE_DELAYS_MS.map((delay) => (
            <span key={delay} className="soon-ripple absolute inset-1 rounded-full bg-line" style={{ "--stagger": `${delay}ms` } as React.CSSProperties} />
          ))}
          <span className="soon-float relative flex h-11 w-11 items-center justify-center rounded-full bg-surface text-dim shadow-hair">
            <StoreIcon size={20} />
          </span>
        </span>
        <p className="text-[14px] font-bold text-mut">{GAME_MESSAGES.storeAbsent}</p>
      </div>
    </li>
  );
}

/**
 * 출시 전 플랫폼의 카드(목업 g.up) — 값 대신 출시일과 출시 알림. 게임 전체가 출시 전일 때뿐 아니라, 다른 기기로는 이미 나왔고
 * 이 기기로는 아직인 행(값 없음 + 그 행 출시일이 미래)에도 선다(2026-10-27). 알림 버튼은 서버가 그려 넘긴다
 * (가격 알림 팝업 M-02 를 그 플랫폼만 고른 채로 연다 — 출시 뒤 첫 값이 붙으면 그 알림이 울린다).
 */
export function UpcomingTile({ p, id, release, action }: { p: PlatformPriceItem; id?: string; release: string | null; action?: React.ReactNode }) {
  return (
    <li id={id} className={cn(TILE, "bg-surface shadow-hair")}>
      <CardHead name={brandNameOf(p)}>
        <span className="ml-auto shrink-0 text-[12.5px] font-bold text-acc">{D.upcomingTag}</span>
      </CardHead>
      <dl className="contents">
        <Row label={D.releaseRow}>{release ?? D.releaseUnknown}</Row>
        <Row label={D.hardwareRow}>{hardwareText([p.platform])}</Row>
      </dl>
      {/* 값 세 줄과 단추 줄(4~7)을 통째로 쓴다. 단추는 바닥에 붙어 옆 카드의 구매하기와 같은 높이에 선다 */}
      <div className={cn(PRICE_DIVIDER, "row-span-4 flex items-end")}>{action}</div>
    </li>
  );
}
