// 게임 카드(홈/목록) + 커버 이미지 공용 컴포넌트
//
// 리디자인(2026-09-21): 카드에서 테두리와 흰 판을 걷어냈다. 커버가 카드의 주역이고,
// 글자는 그 아래 배경 위에 그대로 앉는다. 강조는 카드당 하나뿐이다 —
// 커버 왼쪽 아래 모서리를 뚫고 나오는 할인 스탬프. 나머지는 전부 회색 글자다.
import { Fragment } from "react";
import { formatPrice } from "@/lib/currency";
import Link from "next/link";
import { formatDate, formatDiscount, PLATFORM_LABEL } from "@/lib/format";
import { parsePlatformValues } from "@/lib/games-query";
import { expandPlatformValues } from "@/lib/platform";
import { PlatformBadges } from "@/components/platform-badges";
import type { Platform } from "@/server/db/schema";
import type { GameSummary } from "@/server/services/games";
import { SaleBadge } from "@/components/sale-badge";
import { FadeImage } from "@/components/ui/fade-image";
import { ImageFallback } from "@/components/ui/image-fallback";
import { Clamp } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

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

/**
 * 할인 스탬프 — 커버 왼쪽 아래를 뚫고 나온 도장.
 *
 * 카드 하나에 색을 가진 것은 이것뿐이다. 목록을 훑을 때 가장 먼저 답해야 하는 질문이
 * "얼마나 싸졌나" 라서, 그 값만 면을 갖고 나머지는 전부 회색 글자로 물러난다.
 * 모서리 밖으로 내보내는 이유: 커버 안에 있으면 그림의 일부로 읽히고, 어두운 커버에서는 묻힌다.
 *
 * 글자색이 --on-ink 인 이유: --acc 는 라이트에서 짙은 보라, 다크에서 밝은 보라다. 흰색으로 못 박으면
 * 다크에서 밝은 보라 위에 흰 글자가 얹혀 대비가 2점대로 떨어진다(실측). --on-ink 는 테마마다
 * 반대쪽으로 뒤집히는 값이라 두 테마에서 모두 도장 글자가 읽힌다.
 */
export function DiscountStamp({ pct, size = "card" }: { pct: number | null; size?: "card" | "hero" }) {
  if (!pct || pct <= 0) return null;
  const hero = size === "hero";
  return (
    <span
      className={cn(
        "stamp absolute inline-flex items-baseline gap-px rounded-[var(--radius-inset)] bg-acc font-extrabold leading-none tracking-[-0.05em] text-on-ink shadow-[0_6px_18px_-6px_var(--acc-glow)]",
        hero ? "-bottom-4 -left-2.5 px-[15px] pb-[7px] pt-2 text-[28px] sm:text-[34px]" : "-bottom-3.5 -left-2 px-3 pb-[5px] pt-1.5 text-[24px]",
      )}
    >
      {/* 숫자와 % 를 따로 쓰는 이유: 같은 크기면 "%"가 숫자만큼 자리를 먹어 값이 작아 보인다 */}
      {formatDiscount(pct).replace("%", "")}
      <span className={hero ? "text-[19px] font-bold" : "text-[14px] font-bold"}>%</span>
    </span>
  );
}

/**
 * 지금 걸어 둔 조건. 카드 안에서 그 값만 브랜드 색으로 올라온다(2026-09-21).
 * 홈처럼 거르지 않는 화면은 넘기지 않는다 — 아무것도 강조되지 않는다.
 */
export type CardHighlight = { platforms?: Platform[]; genre?: string | null };

/**
 * 목록 조건 → 카드 강조값. 첫 장(games/page)과 스크롤로 이어 붙이는 장(games/actions)이
 * 같은 값을 써야 경계에서 색이 갈리지 않아 여기 한 곳에서 만든다.
 * 갈래("PC")를 고르면 그 안의 스토어 배지가 전부 선다 — 조회가 거르는 범위와 같은 범위다.
 */
export function highlightFromFilter(filter: { platform?: string; genre?: string }): CardHighlight {
  return { platforms: expandPlatformValues(parsePlatformValues(filter.platform)), genre: filter.genre ?? null };
}

export function GameCard({
  game,
  variant = "discount",
  highlight,
  releaseText,
}: {
  game: GameSummary;
  variant?: "discount" | "release";
  highlight?: CardHighlight;
  /**
   * 날짜 칸을 부르는 쪽이 정한 문구로 갈아 끼운다(GameRow 와 같은 계약).
   * 출시예정 화면이 쓴다 — 그 화면의 날짜는 대표 가격 행이 아니라 **게임이 아는 가장 이른 날짜**라
   * (PlayStation 이 출시일을 주지 않아 게임 단위로 묶는다) best.releaseDate 와 다른 값이다.
   */
  releaseText?: string;
}) {
  const title = game.titleKo ?? game.titleEn;
  const best = game.best;
  const hasDiscount = Boolean(best?.discountPct && best.discountPct > 0);
  // 캐시에 담긴 옛 모양 DTO 에는 이 배열이 없을 수 있다 — 카드 한 장이 화면 전체를 죽이지 않게 받아 준다
  // (판 올리는 자리는 lib/cache 의 DTO_CACHE_VERSION. 여기 기본값은 그 사이를 버티는 몫이다)
  const genres = game.genres ?? [];
  // 부제 줄 — 원제와 장르. 둘 다 "이게 무슨 게임인지" 를 말하는 값이라 한 줄에 묶는다.
  // 고른 장르 하나만 색이 달라야 해서 조각으로 쪼갠다 — 말풍선에 쓸 글자는 따로 만들어 Clamp 에 준다
  const originalTitle = game.titleKo ? game.titleEn : null;
  const subtitleText = [originalTitle, genres.length > 0 ? genres.join(", ") : null].filter(Boolean).join(" | ");
  const storeLabel = best ? PLATFORM_LABEL[best.platform] ?? best.platform : null;
  const releaseLabel = releaseText ?? (best?.releaseDate ? `${formatDate(best.releaseDate)} 출시` : "");

  return (
    <Link
      href={`/games/${game.slug}`}
      className="cover-zoom group flex h-full flex-col gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
      aria-label={`${title} 상세 보기`}
    >
      {/* 스탬프가 모서리 밖으로 나가므로 커버의 overflow 와 카드의 relative 를 갈라 둔다 —
          한 상자가 둘을 겸하면 도장이 잘린다 */}
      <span className="relative block">
        <span className="relative block aspect-[460/215] w-full overflow-hidden rounded-[var(--radius-cover)] bg-surface-3">
          <span className="cover-zoom-img absolute inset-0 block">
            <CoverImage src={game.coverUrl} alt={`${title} 커버`} />
          </span>
        </span>
        {hasDiscount && best && <DiscountStamp pct={best.discountPct} />}
      </span>

      <span className="flex flex-1 flex-col gap-1 pt-3">
        {/* 제목과 값이 같은 기준선에 선다 — 목록을 내려 읽을 때 왼쪽은 이름, 오른쪽은 값의 기둥이 된다 */}
        <span className="flex items-baseline justify-between gap-2.5">
          <Clamp className="text-[16px] font-extrabold tracking-[-0.03em] text-ink transition-colors duration-fast group-hover:text-acc">
            {title}
          </Clamp>
          {variant !== "release" && best && (
            <span className="flex shrink-0 items-baseline gap-1.5">
              <span className="text-[17px] font-extrabold tracking-[-0.03em] text-ink">{formatPrice(best.currentPrice, best.currency)}</span>
              {hasDiscount && best.listPrice !== null && (
                <span className="text-[11.5px] text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span>
              )}
            </span>
          )}
        </span>

        <span className="flex items-baseline justify-between gap-2.5 text-[12.5px] text-mut">
          {subtitleText ? (
            <Clamp text={subtitleText}>
              {originalTitle}
              {originalTitle && genres.length > 0 ? " | " : null}
              {genres.map((g, i) => (
                // 쉼표는 색을 입힌 조각 **밖에** 둔다 — 안에 넣으면 고른 장르 앞의 구분자까지 보라가 된다
                <Fragment key={g}>
                  {i > 0 ? ", " : null}
                  <span className={g === highlight?.genre ? "font-semibold text-acc" : undefined}>{g}</span>
                </Fragment>
              ))}
            </Clamp>
          ) : (
            <span />
          )}
          {variant !== "release" && hasDiscount && <SaleBadge variant="inline" discountName={null} discountEndsAt={best?.discountEndsAt} />}
        </span>

        {/* 마지막 줄 — 어느 기기로 할 수 있나(배지), 그리고 이 값이 어디 값인가(회색 글자).
            플랫폼을 쉼표로 이은 글자에서 배지로 바꿨다(2026-09-21): 목록에서 던지는 질문은
            "내 기기에 있나" 라서 글자 줄을 끝까지 읽는 것보다 모양으로 훑는 편이 빠르다.
            배지가 줄 하나를 따로 쓰는 이유는 곁 문구와 한 줄을 다투면 둘 다 접혀서다
            (같은 판단이 game-row 에도 있다). 줄 수가 늘었으니 뼈대도 같이 늘린다(games/skeletons) */}
        <span className="mt-auto flex flex-col gap-1.5 pt-1.5">
          <PlatformBadges platforms={game.platforms} highlight={highlight?.platforms} />
          <span className="text-[12px] text-dim">
            {variant === "release" ? releaseLabel : storeLabel ? `${storeLabel} 최저` : ""}
          </span>
        </span>
      </span>
    </Link>
  );
}
