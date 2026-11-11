// 게임 목록(전체 게임, 할인 게임)의 가로형 카드 — 목업 v2.0 목록 카드(.gc) 모양.
//
// 홈 카드(game-card)와 따로 둔 이유: 목업은 홈 줄과 목록 격자의 카드 모양이 다르다. 홈은 커버가 주인인 세로 카드이고,
// 목록은 작은 정사각 그림 옆에 이름과 기기가 서고 그 아래 장르, 값이 칸막이로 갈린 3단 카드다(사용자: "목업이랑 모든 화면 최대한 동일하게").
// 한 화면에 24장을 훑는 자리라 커버보다 이름, 값이 먼저 읽혀야 한다.
//
// 그림은 스토어 가로 커버(460:215)를 정사각 칸 가운데에 맞춰 양옆을 잘라 쓴다 — 세로 아트는 결손이 많아(portraits 백필 메모) 쓰지 않는다.
// 정사각 칸에 object-cover 로 바로 넣지 않는 이유: 닌텐도 한국 그림은 원본이 위아래 흰 띠를 두른 정사각이라(265x265, 실측)
// 칸에 그대로 들어가 흰 띠가 보였다. 가로 커버 상자(높이 72, 폭 154)에 먼저 담으면 그 띠가 잘리고, 스팀 그림도 72px 폭이 아니라
// 상자 폭으로 받아 흐려지지 않는다.
// 할인율 배지는 값 바로 앞이다(game-card 의 DiscountStamp 주석, 2026-09-22 사용자 지정) — 목업은 값 뒤지만 그 결정을 지킨다.
import { Fragment } from "react";
import Link from "next/link";
import { CoverImage, DiscountStamp, type CardHighlight } from "@/components/game-card";
import { HistoricLowBadge } from "@/components/ui/discount";
import { SaleBadge } from "@/components/sale-badge";
import { Tag } from "@/components/ui/tag";
import { Clamp } from "@/components/ui/tooltip";
import { WishHeart } from "@/components/wish-heart";
import { formatPrice } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { PREORDER_LABEL } from "@/lib/games/messages";
import { isPreorder } from "@/lib/games/preorder";
import { DEVICE_LABEL, devicesOf } from "@/lib/platform";
import { cn } from "@/lib/cn";
import type { GameSummary } from "@/server/services/games";

/**
 * 카드 껍데기. 뼈대(game-card-skeleton 의 GameListCardSkeleton)가 같은 값을 써야 본문이 올 때 격자가 밀리지 않는다.
 *
 * **좁은 화면(sm 미만)은 두 칸 격자다**(2026-11-02 모바일 점검). 목업의 3단(이름 | 장르 | 값, 칸막이 둘)을 한 열에 그대로 쌓으면
 * 카드 한 장이 200px 남짓이라 390 화면에 3.5장만 들어왔다. 좁은 화면에서는 그림을 왼쪽 칸에 세우고 이름, 기기, 장르, 값을
 * 오른쪽 칸에 칸막이 없이 잇는다(한 장 120px 안팎). 묶음 div 는 `max-sm:contents` 로 풀려 격자 칸이 된다 — 마크업은 하나다.
 * sm 부터는 목업 3단 그대로다.
 */
export const LIST_CARD_SHELL = "card-panel grid h-full grid-cols-[64px_minmax(0,1fr)] content-start gap-x-3 p-3 sm:flex sm:flex-col sm:gap-x-0 sm:p-3.5";
/** 정사각 그림 한 변(목업 72px, 좁은 화면 64px). 좁은 화면에서는 오른쪽 칸 줄 셋을 다 차지한다 */
export const LIST_THUMB_CLASS = "relative size-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-3 shadow-hair max-sm:row-span-3 sm:size-[72px]";
/** 칸막이 — 이름 묶음, 장르, 값 사이. 좁은 화면에서는 걷는다 */
const DIVIDER = "sm:border-t sm:border-line";
/** 좁은 화면에서 오른쪽 칸에 서는 줄 */
const RIGHT_CELL = "max-sm:col-start-2";

/**
 * 기기 이름 줄(목업 "PC, PlayStation, Xbox, Switch"). 스토어(Steam, Epic)와 세대(PS5, PS4)는 기기 하나로 접는다(lib/platform 의 DEVICES).
 * 홈 카드(game-card)의 기기 배지와 같은 갈래다 — 두 카드가 같은 게임을 다른 이름으로 부르지 않게.
 * 캐시에 담긴 옛 모양 DTO 에는 platforms 가 없을 수 있어 빈 배열로 받는다(game-card 주석)
 */
function deviceNames(game: GameSummary): string {
  return devicesOf(game.platforms ?? []).map((d) => DEVICE_LABEL[d]).join(", ");
}

export function GameListCard({ game, variant = "discount", highlight }: { game: GameSummary; variant?: "discount" | "release"; highlight?: CardHighlight }) {
  const title = game.titleKo ?? game.titleEn;
  const best = game.best;
  const hasDiscount = Boolean(best?.discountPct && best.discountPct > 0);
  const genres = game.genres ?? [];
  const tags = game.tags ?? [];
  const preorder = best ? isPreorder(best) : false;
  const devices = deviceNames(game);
  // 남은 기간은 끝나는 시각을 알 때만 선다(SaleBadge inline) — 시각 없는 할인까지 세면 빈 칸이 남았다
  const showSale = variant !== "release" && hasDiscount && Boolean(best?.discountEndsAt);
  // 장르, 꼬리표, 남은 기간이 다 없으면 가운데 칸을 걷는다 — 칸막이 두 줄 사이 빈 띠가 고장처럼 보였다(2026-11-11 목록, GTA VI 등)
  const hasMiddle = genres.length > 0 || tags.length > 0 || showSale;

  return (
    <div className={cn(LIST_CARD_SHELL, "group relative")}>
      <div className="flex min-w-0 gap-3 max-sm:contents sm:pb-3 sm:pr-9">
        <span className={LIST_THUMB_CLASS}>
          <span className="absolute inset-y-0 left-1/2 block aspect-[460/215] h-full -translate-x-1/2">
            <CoverImage src={game.coverUrl} alt={`${title} 커버`} sizes="160px" />
          </span>
        </span>
        <div className={cn(RIGHT_CELL, "flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5 max-sm:pr-8 sm:gap-1")}>
          {/* 카드 전체를 덮는 것은 제목 링크의 ::after 다(game-card 와 같은 수법) — 찜 하트만 z-10 으로 그 위에 뜬다 */}
          <Link
            href={`/games/${game.slug}`}
            className="outline-none after:absolute after:inset-0 after:rounded-[var(--radius-panel)] focus-visible:after:ring-2 focus-visible:after:ring-ink focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-bg"
          >
            <Clamp lines={2} className="text-[15px] font-bold leading-[1.35] tracking-[-0.015em] text-ink transition-colors duration-fast group-hover:text-acc">
              {title}
            </Clamp>
          </Link>
          {devices && (
            <span className="text-[12px] leading-[1.45] text-acc">
              <Clamp lines={2}>{devices}</Clamp>
            </span>
          )}
        </div>
      </div>
      <WishHeart slug={game.slug} title={title} className="absolute right-3 top-3 z-10 size-8 shadow-none" />

      {/* 남은 할인 기간은 장르 줄 오른쪽 끝이다 — 값 줄에 두면 할인율, 값, 정가 뒤에 못 붙고 혼자 다음 줄로 떨어져 카드마다 키가 갈렸다 */}
      {hasMiddle && (
      <div className={cn(DIVIDER, RIGHT_CELL, "flex items-center gap-2 py-1 text-[12.5px] text-mut sm:min-h-[40px] sm:py-2.5")}>
        {/* 판매 형태 꼬리표(무료 플레이, 앞서 해보기)는 장르 글자 앞에 선다(game-card 와 같다) */}
        {tags.map((t) => (
          <Tag key={t} small tone="info">
            {t}
          </Tag>
        ))}
        <span className="min-w-0 flex-1">
          {genres.length > 0 && (
            <Clamp text={genres.join(", ")}>
              {genres.map((g, i) => (
                <Fragment key={g}>
                  {i > 0 ? ", " : null}
                  <span className={g === highlight?.genre ? "font-semibold text-acc" : undefined}>{g}</span>
                </Fragment>
              ))}
            </Clamp>
          )}
        </span>
        {showSale && <SaleBadge variant="inline" discountName={null} discountEndsAt={best?.discountEndsAt} />}
      </div>
      )}

      {/* 값 줄은 카드 바닥에 붙는다 — 같은 줄 카드끼리 값이 한 높이에 서서 가로로 견줄 수 있다. 값을 모르면 세우지 않는다(game-card 주석) */}
      <div className={cn(DIVIDER, RIGHT_CELL, "mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-1 sm:pt-3")}>
        {best && best.currentPrice !== null && (
          <>
            {preorder && <Tag>{PREORDER_LABEL}</Tag>}
            {hasDiscount && <DiscountStamp pct={best.discountPct} />}
            <span className="text-[19px] font-extrabold tracking-[-0.03em] text-ink">{formatPrice(best.currentPrice, best.currency)}</span>
            {hasDiscount && best.listPrice !== null && <span className="text-[12px] text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span>}
            <HistoricLowBadge show={hasDiscount && best.historicLow} size="sm" />
          </>
        )}
        {variant === "release" && best?.releaseDate && <span className="ml-auto text-[12px] text-dim">{formatDate(best.releaseDate)} 출시</span>}
      </div>
    </div>
  );
}
