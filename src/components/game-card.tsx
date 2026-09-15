// 게임 카드(홈/목록) + 커버 이미지 공용 컴포넌트
import { formatPrice } from "@/lib/currency";
import Link from "next/link";
import { formatDate, formatDiscount } from "@/lib/format";
import type { GameSummary } from "@/server/services/games";
import { PlatformBadges } from "@/components/platform-badges";
import { SaleBadge } from "@/components/sale-badge";
import { FadeImage } from "@/components/ui/fade-image";
import { ImageFallback } from "@/components/ui/image-fallback";
import { cardClass } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";

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

/**
 * 커버 이미지. 부모가 relative + 크기를 정한다.
 * 주소가 없을 때와 불러오다 실패했을 때 같은 자리를 쓴다 — 스토어가 이미지를 내리는 일이 잦은데
 * 그때 엑박이 뜨면 우리가 고장 난 것처럼 보인다(ImageFallback 주석).
 */
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
  const fallback = <ImageFallback label={`${alt} (이미지 없음)`} />;
  if (!src) return fallback;
  // alt 을 spread 에 섞지 않는다 — jsx-a11y 가 정적으로 못 읽어 경고를 낸다
  const props = { src, fill: true as const, sizes, unoptimized: !isOptimizable(src), className: "object-cover" };
  return <FadeImage {...props} alt={alt} priority={priority} fallback={fallback} />;
}

export function GameCard({ game, variant = "discount" }: { game: GameSummary; variant?: "discount" | "release" }) {
  const title = game.titleKo ?? game.titleEn;
  const best = game.best;
  const hasDiscount = Boolean(best?.discountPct && best.discountPct > 0);
  // 캐시에 담긴 옛 모양 DTO 에는 이 배열이 없을 수 있다 — 카드 한 장이 화면 전체를 죽이지 않게 받아 준다
  // (판 올리는 자리는 lib/cache 의 DTO_CACHE_VERSION. 여기 기본값은 그 사이를 버티는 몫이다)
  const genres = game.genres ?? [];

  return (
    <Link
      href={`/games/${game.slug}`}
      className={cardClass("lift press group flex h-full flex-col overflow-hidden outline-none transition-colors duration-base hover:border-line-strong focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg")}
      aria-label={`${title} 상세 보기`}
    >
      <div className="relative aspect-[460/215] w-full bg-surface-3">
        <CoverImage src={game.coverUrl} alt={`${title} 커버`} />
        {hasDiscount && best && (
          // 잉크 검정이었는데, 커버 이미지의 절반 이상이 어두워 배지가 그림 속으로 사라졌다(2026-09-15 실측).
          // 이 숫자가 목록에서 가장 먼저 읽혀야 할 값이라 브랜드 색으로 세운다 — 흰 글자 대비 7.6:1 이고,
          // 게임 커버에 잘 나오지 않는 색이라 어떤 그림 위에서도 배지가 배지로 읽힌다.
          <span className="absolute left-2.5 top-2.5 rounded-[6px] bg-acc px-2 py-[3px] text-[11.5px] font-bold text-on-ink">
            {formatDiscount(best.discountPct)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-[7px] p-[15px]">
        <Clamp lines={2} className="text-[14.5px] font-bold leading-snug tracking-[-0.01em] text-ink">
          {title}
        </Clamp>
        {game.titleKo && <Clamp className="text-[11.5px] text-dim">{game.titleEn}</Clamp>}
        <PlatformBadges platforms={game.platforms} />
        {genres.length > 0 && (
          // 칩이 아니라 한 줄 글로 둔다 — 카드에 테두리 덩어리가 두 줄이 되면 격자가 시끄럽고,
          // 장르는 고르는 값이 아니라 읽는 값이다(고르는 자리는 목록 왼쪽 필터 기둥이다).
          <Clamp className="text-[11.5px] text-mut">{genres.join(", ")}</Clamp>
        )}

        {variant === "release" && best?.releaseDate ? (
          <p className="mt-auto text-[13px] text-mut">{formatDate(best.releaseDate)} 출시</p>
        ) : (
          best && (
            <div className="mt-auto flex flex-col gap-1">
              <p className="flex items-baseline gap-1.5">
                <span className="text-[19px] font-bold tracking-[-0.02em] text-ink">{formatPrice(best.currentPrice, best.currency)}</span>
                {hasDiscount && best.listPrice !== null && (
                  <span className="text-[12px] text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span>
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
