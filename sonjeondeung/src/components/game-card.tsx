// 게임 카드(홈/검색 목록) + 커버 이미지 공용 컴포넌트
import Image from "next/image";
import Link from "next/link";
import { formatDate, formatDiscount, formatKrw, PLATFORM_LABEL } from "@/lib/format";
import type { GameSummary } from "@/server/services/games";

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

/** 커버 이미지. coverUrl 없으면 placeholder. 부모가 relative + 크기 지정 */
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
    return (
      <div
        role="img"
        aria-label={`${alt} (커버 이미지 없음)`}
        className="flex h-full w-full items-center justify-center bg-slate-800 text-3xl text-slate-600"
      >
        🎮
      </div>
    );
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

  return (
    <Link
      href={`/games/${game.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 transition hover:border-amber-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      aria-label={`${title} 상세 보기`}
    >
      <div className="relative aspect-[460/215] w-full bg-slate-800">
        <CoverImage src={game.coverUrl} alt={`${title} 커버`} />
        {hasDiscount && best && (
          <span className="absolute left-2 top-2 rounded-md bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-slate-950">
            {formatDiscount(best.discountPct)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-100 group-hover:text-amber-300">{title}</p>
        {game.titleKo && <p className="line-clamp-1 text-xs text-slate-500">{game.titleEn}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1 text-xs text-slate-400">
          <span>
            {best ? PLATFORM_LABEL[best.platform] ?? best.platform : "플랫폼 정보 없음"}
            {game.platformCount > 1 && <span className="text-slate-500"> 외 {game.platformCount - 1}</span>}
          </span>
          {variant === "release" && best?.releaseDate ? (
            <span className="text-slate-300">{formatDate(best.releaseDate)}</span>
          ) : (
            best && (
              <span className="text-right">
                {hasDiscount && best.listPrice !== null && (
                  <span className="mr-1 text-slate-500 line-through">{formatKrw(best.listPrice)}</span>
                )}
                <span className="font-semibold text-slate-100">{formatKrw(best.currentPrice)}</span>
              </span>
            )
          )}
        </div>
      </div>
    </Link>
  );
}
