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
import { SaleBadge } from "@/components/sale-badge";
import { Tag } from "@/components/ui/tag";
import { Clamp } from "@/components/ui/tooltip";
import { WishHeart } from "@/components/wish-heart";
import { formatPrice } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { PREORDER_LABEL } from "@/lib/games/messages";
import { isPreorder } from "@/lib/games/preorder";
import { brandKeyOf, PLATFORM_BRANDS, type PlatformBrand } from "@/lib/platform";
import { PLATFORM_LABEL } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { GameSummary } from "@/server/services/games";

/** 카드 껍데기. 뼈대(game-card-skeleton 의 GameListCardSkeleton)가 같은 값을 써야 본문이 올 때 격자가 밀리지 않는다 */
export const LIST_CARD_SHELL = "card-panel flex h-full flex-col p-3.5";
/** 정사각 그림 한 변(목업 72px) */
export const LIST_THUMB_CLASS = "relative size-[72px] shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-3 shadow-hair";
/** 칸막이 — 이름 묶음, 장르, 값 사이 */
const DIVIDER = "border-t border-line";

/** 기기 이름 줄(목업 "PC, PlayStation, Xbox, Switch"). 같은 기기의 세대는 한 이름으로 묶는다(upcoming-row 와 같은 규칙) */
function deviceNames(game: GameSummary): string {
  const keys = [...new Set(game.platforms.map(brandKeyOf))];
  return keys.map((k) => (k in PLATFORM_BRANDS ? PLATFORM_BRANDS[k as PlatformBrand].label : (PLATFORM_LABEL[k] ?? k))).join(", ");
}

export function GameListCard({ game, variant = "discount", highlight }: { game: GameSummary; variant?: "discount" | "release"; highlight?: CardHighlight }) {
  const title = game.titleKo ?? game.titleEn;
  const best = game.best;
  const hasDiscount = Boolean(best?.discountPct && best.discountPct > 0);
  const genres = game.genres ?? [];
  const preorder = best ? isPreorder(best) : false;
  const devices = deviceNames(game);

  return (
    <div className={cn(LIST_CARD_SHELL, "group relative")}>
      <div className="flex min-w-0 gap-3 pb-3 pr-9">
        <span className={LIST_THUMB_CLASS}>
          <span className="absolute inset-y-0 left-1/2 block aspect-[460/215] h-full -translate-x-1/2">
            <CoverImage src={game.coverUrl} alt={`${title} 커버`} sizes="160px" />
          </span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
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
      <div className={cn(DIVIDER, "flex min-h-[40px] items-center gap-2 py-2.5 text-[12.5px] text-mut")}>
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
        {variant !== "release" && hasDiscount && <SaleBadge variant="inline" discountName={null} discountEndsAt={best?.discountEndsAt} />}
      </div>

      {/* 값 줄은 카드 바닥에 붙는다 — 같은 줄 카드끼리 값이 한 높이에 서서 가로로 견줄 수 있다. 값을 모르면 세우지 않는다(game-card 주석) */}
      <div className={cn(DIVIDER, "mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-1 pt-3")}>
        {best && best.currentPrice !== null && (
          <>
            {preorder && <Tag>{PREORDER_LABEL}</Tag>}
            {hasDiscount && <DiscountStamp pct={best.discountPct} />}
            <span className="text-[19px] font-extrabold tracking-[-0.03em] text-ink">{formatPrice(best.currentPrice, best.currency)}</span>
            {hasDiscount && best.listPrice !== null && <span className="text-[12px] text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span>}
          </>
        )}
        {variant === "release" && best?.releaseDate && <span className="ml-auto text-[12px] text-dim">{formatDate(best.releaseDate)} 출시</span>}
      </div>
    </div>
  );
}
