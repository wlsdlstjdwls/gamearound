// 플랫폼 카드 한 장 — 목업 v2.0 "플랫폼별 가격 비교"(2026-10-26).
//
// 목업 카드의 순서를 그대로 쌓는다: 이름 - 사실 줄(출시일, 메타크리틱, 지원 기종) - 구분선 - 정가, 현재 가격 - 구매하기.
// 전 타일(2026-09-30)은 값을 맨 위에 크게 두고 출시일, 버전, 유저 점수를 "i" 말풍선에 숨겼다. 목업은 그 사실들을
// 줄로 펴 두고 값을 카드 바닥 쪽에 세운다 — 카드 넷을 나란히 놓고 같은 높이의 같은 줄을 가로로 견주게 하려는 배치다.
// 그래서 줄은 값이 없을 때도 자리를 함부로 비우지 않는다(지원 기종처럼 짝이 없는 플랫폼만 줄을 뺀다).
//
// 에디션 줄(목업 "얼티밋 에디션")은 없다 — 스토어 행 하나가 어느 판인지 우리는 따로 모르고, 에디션은 아래
// "에디션" 마디가 판별로 말한다. 모르는 값을 "기본판" 이라 적으면 PS 처럼 기본 상품이 에디션인 스토어에서 거짓이 된다.
import { formatPrice } from "@/lib/currency";
import { platformLabel } from "@/lib/format";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { GAME_MESSAGES, PREORDER_LABEL } from "@/lib/games/messages";
import { isPreorder } from "@/lib/games/preorder";
import { countText, scoreToStars } from "@/lib/user-score";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { DiscountBadge } from "@/components/ui/discount";
import { PendingNote } from "@/components/ui/pending-note";
import { ClockIcon, StoreIcon } from "@/components/ui/icons";
import { Tag } from "@/components/ui/tag";
import { SubscriptionChips } from "@/components/subscription-badges";
import { brandNameOf, generationOf, type PlatformPriceItem } from "@/components/platform-prices/order";
import { PickableTile } from "@/components/game-detail/platform-pick";
import { brandKeyOf } from "@/lib/platform";

/** 스토어로 나가는 버튼의 말(기획서 v2.0 S-05 "구매하기") */
const STORE_CTA = "구매하기";
/** 링크가 아직 없는 카드의 버튼 자리에 서는 말. 버튼 모양은 그대로 두고 눌리지만 않는다(기획서 v2.0 S-07) */
const STORE_LINK_MISSING = "스토어 링크 준비 중";

/** 카드 껍데기. 최저가 카드만 브랜드 테두리와 연한 면(목업 .pc.fc) — 목록 카드의 "최저" 와 같은 색 문법이다 */
const TILE = "relative flex min-w-0 scroll-mt-24 flex-col gap-2.5 rounded-[var(--radius-md)] p-4 sm:p-5";

/** 이름표 - 값 한 줄(목업 .row). 값은 줄바꿈하지 않는다 — 날짜가 접히면 같은 줄의 높이가 카드마다 달라진다 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <dt className="shrink-0 text-mut">{label}</dt>
      <dd className="min-w-0 truncate text-right text-ink">{children}</dd>
    </div>
  );
}

function CardHead({ name, children }: { name: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <h3 className="truncate text-[16px] font-bold text-ink sm:text-[17px]">{name}</h3>
      {children}
    </div>
  );
}

/** 유저 점수 줄 — 스토어마다 재는 방식이 달라(긍정 비율, 별점) 그 스토어 카드 안에서 말한다 */
function userScoreText(p: PlatformPriceItem): string | null {
  if (!p.userScore) return null;
  const { value, kind, count } = p.userScore;
  const score = kind === "star_average" ? `평균 ${scoreToStars(value)}점` : `긍정 ${Math.round(value)}%`;
  return count > 0 ? `${score} | ${countText(count)}` : score;
}

export function PriceTile({
  p,
  id,
  isBest,
  release,
  skipUserScore,
  addons,
}: {
  p: PlatformPriceItem;
  /** 히어로의 플랫폼 이름이 눌러 내려올 자리. 묶음의 첫 장만 받는다 */
  id?: string;
  isBest: boolean;
  release: string | null;
  /** 히어로 평점 칸이 이미 인용한 스토어 — 같은 숫자를 한 화면에 두 번 적지 않는다 */
  skipUserScore: boolean;
  addons: React.ReactNode;
}) {
  const hasDiscount = Boolean(p.discountPct && p.discountPct > 0);
  // 무료면 "최저가" 를 세우지 않는다(2026-09-22, 사용자 지정) — 0원은 비교의 대상이 아니다
  const showBest = isBest && p.currentPrice !== 0;
  const generation = generationOf(p.platform);
  const userScore = skipUserScore ? null : userScoreText(p);
  return (
    // 고를 수 있는 카드(game-detail/platform-pick). 최저가는 이제 면을 칠하지 않고 딱지로만 말한다(2026-10-27) —
    // 연파랑 면이 할인 배지를 묻었고(사용자), 파랑 고리는 "지금 고른 카드" 가 쓴다. 처음 고른 카드가 최저가 카드다
    <PickableTile brand={brandKeyOf(p.platform)} label={brandNameOf(p)} id={id} className={cn(TILE, "bg-surface shadow-hair")}>
      <CardHead name={brandNameOf(p)}>
        {/* 스토어마다 따로 본다 — PS 는 예약 중이어도 스팀은 이미 팔 수 있다(lib/games/preorder) */}
        {isPreorder(p) && <Tag>{PREORDER_LABEL}</Tag>}
        {showBest && <span className="ml-auto shrink-0 rounded-full bg-acc px-2 py-[3px] text-[11px] font-bold leading-none text-on-ink">최저가</span>}
      </CardHead>

      <dl className="flex flex-col gap-1.5">
        <Row label={D.releaseRow}>{release ?? D.releaseUnknown}</Row>
        {p.metacriticScore !== null && (
          <Row label={D.metacriticRow}>
            <span className="rounded-[var(--radius-xs)] bg-acc px-2 py-[1px] text-[12.5px] font-bold text-on-ink">{Math.round(p.metacriticScore)}</span>
          </Row>
        )}
        {generation && <Row label={D.hardwareRow}>{generation}</Row>}
        {p.currentVersion && <Row label={D.versionRow}>{p.currentVersion}</Row>}
        {userScore && <Row label={D.userScoreRow}>{userScore}</Row>}
      </dl>

      {/* 값 묶음 — 목업 .pr. mt-auto 로 바닥에 붙여 줄 수가 다른 카드끼리도 값과 버튼의 높이가 맞는다 */}
      <dl className="mt-auto flex flex-col gap-1 border-t border-line pt-2.5">
        <Row label={D.listPriceRow}>
          {p.listPrice === null ? (
            <span className="text-dim">-</span>
          ) : (
            <span className={hasDiscount ? "text-dim-2 line-through" : undefined}>{formatPrice(p.listPrice, p.currency)}</span>
          )}
        </Row>
        <div className="flex items-center justify-between gap-2">
          <dt className="shrink-0 text-[13px] text-mut">{D.currentPriceRow}</dt>
          <dd className="flex min-w-0 items-center justify-end gap-1.5 whitespace-nowrap">
            {/* 값을 아직 못 받았으면 "-" 대신 말로 한다(2026-10-07) — 큰 "-" 는 0원으로도 고장으로도 읽혔다 */}
            {p.currentPrice === null ? (
              <PendingNote icon={<ClockIcon size={14} />}>{GAME_MESSAGES.pricePending}</PendingNote>
            ) : (
              <span className="text-[22px] font-extrabold tracking-[-0.035em] text-acc sm:text-[24px]">{formatPrice(p.currentPrice, p.currency)}</span>
            )}
            {/* 목록 카드와 같은 채운 배지(ui/discount). 연파랑 알약은 최저가 카드의 연파랑 면에 묻혔다(2026-10-27 사용자) */}
            {hasDiscount && <DiscountBadge pct={p.discountPct} size="sm" />}
          </dd>
        </div>
      </dl>

      {/* 구독 칩 — 넘치면 잘려도 된다(구독 여부는 칩 자체가 말한다) */}
      {p.subscriptions.length > 0 && (
        <div className="flex min-w-0 overflow-hidden">
          <SubscriptionChips subscriptions={p.subscriptions} />
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {addons}
        {/* 링크가 없어도 버튼 자리는 지킨다(2026-09-22, 사용자 지정) — 같은 자리 같은 모양, 눌리지만 않는다.
            목업은 카드마다 구매 버튼을 채운 면으로 둔다. 최저가는 테두리가 이미 말하므로 버튼으로 또 가르지 않는다 */}
        {p.storeUrl ? (
          <a
            href={p.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: "accent", size: "row", className: "min-w-0 flex-1" })}
          >
            {STORE_CTA}
            <span className="sr-only"> {platformLabel(p)} (새 창에서 열림)</span>
          </a>
        ) : (
          <span aria-disabled="true" className={buttonClass({ variant: "soft", size: "row", className: "pointer-events-none min-w-0 flex-1 opacity-45" })}>
            {STORE_LINK_MISSING}
          </span>
        )}
      </div>
    </PickableTile>
  );
}

/** 이 게임 행이 없는 플랫폼 = 흐린 카드 한 장(목업 .pc.no "미지원"). 말은 GAME_MESSAGES.storeAbsent 주석 */
export function AbsentTile({ id, label }: { id?: string; label: string }) {
  return (
    // 2026-10-28 사용자 "비워져 있을 때 너무 비어 보인다": 맨 밑 한 줄만 있어 카드 대부분이 빈 칸이었다.
    // 가운데에 아이콘과 두 줄(무엇이 없나, 생기면 어떻게 되나)을 세운다. 흐림(opacity)은 걷었다 — 글자까지 흐려 읽기 힘들었다
    <li id={id} className={cn(TILE, "border border-dashed border-line-strong bg-surface-2/50")}>
      <CardHead name={label} />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-3 text-center">
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-dim shadow-hair">
          <StoreIcon size={20} />
        </span>
        <p className="text-[14px] font-bold text-mut">{GAME_MESSAGES.storeAbsent}</p>
        <p className="max-w-[200px] text-[12.5px] leading-[1.55] text-dim">{GAME_MESSAGES.storeAbsentNote}</p>
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
  const generation = generationOf(p.platform);
  return (
    <li id={id} className={cn(TILE, "bg-surface shadow-hair")}>
      <CardHead name={brandNameOf(p)} />
      <p className="text-[13.5px] font-bold text-acc">{D.upcomingTag}</p>
      <dl className="flex flex-col gap-1.5">
        <Row label={D.releaseRow}>{release ?? D.releaseUnknown}</Row>
        {generation && <Row label={D.hardwareRow}>{generation}</Row>}
      </dl>
      {action && <div className="mt-auto flex pt-1">{action}</div>}
    </li>
  );
}
