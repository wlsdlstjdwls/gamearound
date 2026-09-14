// 게임 카드(홈/목록) + 커버 이미지 공용 컴포넌트
import Image from "next/image";
import Link from "next/link";
import { formatDate, formatDiscount, formatKrw, PLATFORM_LABEL } from "@/lib/format";
import type { GameSummary } from "@/server/services/games";
import { SaleBadge } from "@/components/sale-badge";
import { cardClass } from "@/components/ui/page";

// next.config.ts images.remotePatterns 에 등록된 호스트만 최적화. 그 외는 unoptimized 로 원본 사용(런타임 오류 방지)
const OPTIMIZABLE_HOSTS = ["cdn.akamai.steamstatic.com", "shared.akamai.steamstatic.com", "cdn.cloudflare.steamstatic.com"];

function isOptimizable(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") return false;
    return OPTIMIZABLE_HOSTS.includes(hostname) || hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** 커버 이미지. coverUrl 없으면 빈 플레이스홀더(이모지 금지 — 회색 면으로만 비운다). 부모가 relative + 크기 지정 */
export function CoverImage({
  src,
  alt,
  sizes = "(max-width: 640px) 50vw, 25vw",
  priority = false,
}: {
  src: string | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) {
    return <div role="img" aria-label={`${alt} (커버 이미지 없음)`} className="h-full w-full bg-surface-3" />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimizable(src)}
      className="object-cover"
    />
  );
}

export function GameCard({ game, variant = "discount" }: { game: GameSummary; variant?: "discount" | "release" }) {
  const title = game.titleKo ?? game.titleEn;
  const best = game.best;
  const hasDiscount = Boolean(best?.discountPct && best.discountPct > 0);
  const platformText = best ? PLATFORM_LABEL[best.platform] ?? best.platform : "플랫폼 정보 없음";

  return (
    <Link
      href={`/games/${game.slug}`}
      className={cardClass("lift press group flex h-full flex-col overflow-hidden outline-none transition-colors duration-base hover:border-line-strong focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg")}
      aria-label={`${title} 상세 보기`}
    >
      <div className="relative aspect-[460/215] w-full bg-surface-3">
        <CoverImage src={game.coverUrl} alt={`${title} 커버`} />
        {hasDiscount && best && (
          <span className="absolute left-2.5 top-2.5 rounded-[6px] bg-ink px-2 py-[3px] text-[11.5px] font-bold text-on-ink">
            {formatDiscount(best.discountPct)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-[7px] p-[15px]">
        <p className="line-clamp-2 text-[14.5px] font-bold leading-snug tracking-[-0.01em] text-ink">{title}</p>
        <p className="line-clamp-1 text-[11.5px] text-dim">
          {platformText}
          {game.platformCount > 1 && ` 외 ${game.platformCount - 1}`}
          {game.titleKo && ` · ${game.titleEn}`}
        </p>

        {variant === "release" && best?.releaseDate ? (
          <p className="mt-auto text-[13px] text-mut">{formatDate(best.releaseDate)} 출시</p>
        ) : (
          best && (
            <div className="mt-auto flex flex-col gap-1">
              <p className="flex items-baseline gap-1.5">
                <span className="text-[19px] font-bold tracking-[-0.02em] text-ink">{formatKrw(best.currentPrice)}</span>
                {hasDiscount && best.listPrice !== null && (
                  <span className="text-[12px] text-dim-2 line-through">{formatKrw(best.listPrice)}</span>
                )}
              </p>
              {hasDiscount && <SaleBadge discountName={best.discountName} discountEndsAt={best.discountEndsAt} />}
            </div>
          )
        )}
      </div>
    </Link>
  );
}
