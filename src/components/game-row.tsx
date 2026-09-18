// 목록의 리스트 보기 — 한 게임이 한 줄이다.
//
// 카드와 같은 값을 보여 주되 배치가 다르다. 카드는 커버를 크게 세워 "무슨 게임인지" 를 먼저 말하고,
// 이 줄은 좌우 폭을 다 써서 "무엇이 얼마인지" 를 한 화면에 서너 배 더 담는다.
// 커버, 할인 배지, 취소선 같은 낱개 규칙은 game-card 와 같은 것을 쓴다(CoverImage, SaleBadge).
//
// 값을 오른쪽 끝에 세로로 모으는 이유: 여러 줄을 훑을 때 눈이 한 줄을 따라가지 않고 기둥을 따라 내려간다.
// 가격이 제목 길이에 따라 들쭉날쭉하면 그 기둥이 생기지 않는다.
import Link from "next/link";
import { formatPrice } from "@/lib/currency";
import { formatDate, formatDiscount } from "@/lib/format";
import type { GameSummary } from "@/server/services/games";
import { CoverImage } from "@/components/game-card";
import { PlatformBadges } from "@/components/platform-badges";
import { SaleBadge } from "@/components/sale-badge";
import { cardClass } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";

/**
 * releaseText: 날짜 칸을 부르는 쪽이 정한 문구로 갈아 끼운다.
 * 출시예정 화면이 쓴다 — 그 화면의 날짜는 대표 가격 행이 아니라 **게임이 아는 가장 이른 날짜**라
 * (PlayStation 이 출시일을 주지 않아 게임 단위로 묶는다) best.releaseDate 와 다른 값이다.
 */
export function GameRow({
  game,
  variant = "discount",
  releaseText,
}: {
  game: GameSummary;
  variant?: "discount" | "release";
  releaseText?: string;
}) {
  const title = game.titleKo ?? game.titleEn;
  const best = game.best;
  const hasDiscount = Boolean(best?.discountPct && best.discountPct > 0);
  // 카드와 같은 이유로 기본값을 둔다 — 캐시에 담긴 옛 모양 DTO 에는 이 배열이 없을 수 있다
  const genres = game.genres ?? [];
  const releaseLabel = releaseText ?? (best?.releaseDate ? `${formatDate(best.releaseDate)} 출시` : null);

  return (
    <Link
      href={`/games/${game.slug}`}
      className={cardClass("lift press group flex items-center gap-3 p-2.5 outline-none transition-colors duration-base hover:border-line-strong focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:gap-3.5 sm:p-3")}
      aria-label={`${title} 상세 보기`}
    >
      {/* 커버는 줄 높이를 정하는 자리다. 카드와 같은 460:215 를 쓰되 폭만 줄인다 —
          비율이 달라지면 같은 그림이 목록에서 잘려 보인다 */}
      <div className="relative aspect-[460/215] w-[92px] shrink-0 overflow-hidden rounded-[8px] bg-surface-3 sm:w-[132px]">
        <CoverImage src={game.coverUrl} alt={`${title} 커버`} sizes="(max-width: 640px) 92px, 132px" />
      </div>

      {/* min-w-0: 없으면 잘리지 않는 긴 제목이 칸을 밀어 값 기둥을 화면 밖으로 내보낸다 */}
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <Clamp className="text-[14px] font-bold leading-snug tracking-[-0.01em] text-ink sm:text-[15px]">{title}</Clamp>
        {game.titleKo && <Clamp className="text-[11.5px] text-dim">{game.titleEn}</Clamp>}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <PlatformBadges platforms={game.platforms} />
          {/* 좁은 화면에서는 장르를 접는다 — 플랫폼 배지와 한 줄을 다투면 둘 다 못 읽는다 */}
          {genres.length > 0 && <Clamp className="hidden text-[11.5px] text-mut sm:block">{genres.join(", ")}</Clamp>}
        </div>
      </div>

      {variant === "release" && releaseLabel ? (
        <p className="shrink-0 text-right text-[12.5px] text-mut sm:text-[13px]">{releaseLabel}</p>
      ) : (
        best && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {hasDiscount && (
              <span className="rounded-[6px] bg-acc px-1.5 py-[2px] text-[11px] font-bold text-on-ink">
                {formatDiscount(best.discountPct)}
              </span>
            )}
            <p className="flex items-baseline justify-end gap-1.5">
              <span className="text-[15px] font-bold tracking-[-0.02em] text-ink sm:text-[17px]">
                {formatPrice(best.currentPrice, best.currency)}
              </span>
            </p>
            {hasDiscount && best.listPrice !== null && (
              <span className="text-[11.5px] text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span>
            )}
            {hasDiscount && <SaleBadge discountName={best.discountName} discountEndsAt={best.discountEndsAt} />}
          </div>
        )
      )}
    </Link>
  );
}
