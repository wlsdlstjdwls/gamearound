// 글 상세의 관련 게임 카드(기획서 v2.0 S-15 "관련 게임"). 리뷰, 공략을 읽다가 "그래서 지금 얼마지?" 로 넘어가는 다리다 —
// 이름 칩 하나였을 때는 눌러 봐야 값이 나왔다. 커버, 최저가 스토어, 값, 할인율을 한 판에 두고 판 전체가 게임 상세로 간다.
// 본문 위에 둔다: 글이 무엇에 대한 것인지 먼저 알아야 본문이 읽힌다(목업 postv 의 "관련 게임" 줄을 키웠다).
// 누를 면은 제목 링크의 ::after 다(게임 카드와 같은 구조) — 찜 하트만 그 위에 뜬다.
import Link from "next/link";
import { CoverImage } from "@/components/game-card";
import { DiscountBadge } from "@/components/ui/discount";
import { Clamp } from "@/components/ui/tooltip";
import { WishHeart } from "@/components/wish-heart";
import { formatPrice } from "@/lib/currency";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { PLATFORM_LABEL } from "@/lib/format";
import { gamePath } from "@/lib/routes";
import type { GameSummary } from "@/server/services/games";

export function PostGameCard({ game }: { game: GameSummary }) {
  const title = game.titleKo ?? game.titleEn;
  const best = game.best;
  const priced = best !== null && best.currentPrice !== null;
  const discounted = priced && (best.discountPct ?? 0) > 0;
  return (
    <section aria-label={M.relatedGame} className="cover-zoom group relative flex items-center gap-3.5 rounded-[var(--radius-md)] bg-surface-2 p-2.5 shadow-hair transition-colors hover:bg-acc-soft sm:gap-4 sm:p-3">
      <span className="cover-glint relative aspect-[460/215] w-[112px] shrink-0 overflow-hidden rounded-[var(--radius-inset)] bg-surface-3 shadow-hair sm:w-[168px]">
        <span className="cover-zoom-img absolute inset-0 block">
          <CoverImage src={game.coverUrl} alt={M.relatedGameCover(title)} sizes="168px" />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 pr-9">
        <span className="text-[12px] font-semibold text-dim">{M.relatedGame}</span>
        <Link
          href={gamePath(game.slug)}
          className="outline-none after:absolute after:inset-0 after:rounded-[var(--radius-md)] focus-visible:after:ring-2 focus-visible:after:ring-ink focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-bg"
        >
          <Clamp lines={1} className="text-[15.5px] font-bold tracking-[-0.02em] text-ink transition-colors duration-fast group-hover:text-acc">
            {title}
          </Clamp>
        </Link>
        {priced ? (
          <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            {discounted && <DiscountBadge pct={best.discountPct} size="sm" />}
            <span className="text-[17px] font-extrabold tracking-[-0.03em] text-ink">{formatPrice(best.currentPrice, best.currency)}</span>
            {discounted && best.listPrice !== null && <span className="text-[12.5px] text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span>}
            <span className="text-[12.5px] text-dim">{PLATFORM_LABEL[best.platform] ?? best.platform}</span>
          </span>
        ) : (
          <span className="text-[13px] text-dim">{M.relatedGameNoPrice}</span>
        )}
        <span className="text-[12.5px] font-semibold text-acc">{M.relatedGameCta}</span>
      </span>
      <WishHeart slug={game.slug} title={title} className="absolute right-2.5 top-2.5 z-10" />
    </section>
  );
}
