// 게임 카드(홈/목록) + 커버 이미지 공용 컴포넌트
//
// 리디자인(2026-09-21): 카드에서 테두리와 흰 판을 걷어냈다(판은 2026-09-22 에 카드에만 되돌렸다).
// 커버가 카드의 주역이고, 글자는 그 아래 앉는다. 강조는 카드당 하나뿐이다 —
// 값 앞에 서는 할인율 배지. 나머지는 전부 회색 글자다. 커버 위에는 아무것도 얹지 않는다.
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
import { PointerParallax } from "@/components/ui/pointer-parallax";
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
 * 할인율 배지 — **커버 밖, 값 바로 앞**(2026-09-22, 사용자 지정: "할인율을 이미지에 두지 말고 아래로 내려줘").
 *
 * 자리가 세 번 바뀐 값이다. 처음에는 커버 왼쪽 아래를 뚫고 나온 기울어진 도장이었고(눈이 가는
 * 자리가 아니었다), 그 다음은 커버 안쪽 오른쪽 위였다(2026-09-22 오전). 커버 안에 두면 어느
 * 모서리에 두든 아트 위에 얹히는 사실은 그대로다 — 밝은 커버에서는 배지가, 어두운 커버에서는
 * 그림이 진다.
 *
 * 값과 같은 줄에 세우면 그 다툼이 사라지고, 읽는 순서도 맞는다: "얼마나 싸졌나 - 얼마인가" 가
 * 왼쪽에서 오른쪽으로 이어진다. 커버는 다시 그림만 갖는다.
 *
 * 글자색은 반드시 text-on-ink 다. 흰색으로 못 박으면 다크에서 밝은 보라 위 흰 글자가 되고
 * 대비가 2점대로 떨어진다(--acc 는 테마마다 반대쪽으로 뒤집힌다).
 */
export function DiscountStamp({ pct }: { pct: number | null }) {
  if (!pct || pct <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-baseline rounded-[var(--radius-inset)] bg-acc px-[7px] py-[3px] text-[12px] font-extrabold leading-none tracking-[-0.04em] text-on-ink">
      {formatDiscount(pct)}
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

/**
 * 카드 껍데기 — 판, 여백, 세로 흐름.
 * 상수로 뽑은 이유: 뼈대 둘(games/skeletons, app/loading)이 같은 모양을 그려야 본문이 올 때
 * 격자가 밀리지 않는다. 판을 되돌린 2026-09-22 에 그 셋이 실제로 어긋났다.
 */
/*
 * 커버와 글자 사이 간격을 12 에서 6 으로 줄였다(2026-09-22, 사용자 지적: "이미지랑 제목이랑
 * 공백이 많아"). 여기 gap 과 아래 글자 묶음의 pt 가 더해지던 값이라 실제로는 24px 이 비어 있었고,
 * 커버가 460:215 라 가로로 길어서 그 빈 띠가 카드 하나에서 유난히 넓게 읽혔다.
 */
export const CARD_SHELL = "card-panel flex h-full flex-col gap-1.5 p-2.5 pb-3.5";

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
   * 날짜 칸을 부르는 쪽이 정한 문구로 갈아 끼운다.
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
    // 미는 범위는 **카드 한 장 전체**다(2026-09-22, 사용자 지정) — 커버에만 걸면 제목이나 값 위에서
    // 그림이 제자리로 돌아와 카드 안에서 커서를 옮길 때마다 붙었다 떨어졌다 한다.
    // 링크 바깥에 두는 이유: 이 껍데기는 포인터만 듣고 아무것도 그리지 않으므로 누를 면(a)을 나누지 않는다
    <PointerParallax className="block h-full">
      <Link
        href={`/games/${game.slug}`}
        className={cn(CARD_SHELL, "cover-zoom group outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg")}
        aria-label={`${title} 상세 보기`}
      >
        {/* 판 안이라 그림자를 겹치지 않는다 — 가장자리를 긋는 링 한 줄이면 밝은 커버가 흰 판에 번지지 않는다.
            커버 위에 얹는 것이 없어져(할인율 배지가 값 옆으로 내려갔다) 상자는 하나면 된다 */}
        <span className="relative block aspect-[460/215] w-full overflow-hidden rounded-[var(--radius-cover)] bg-surface-3 shadow-hair">
          <span className="cover-zoom-img absolute inset-0 block">
            <CoverImage src={game.coverUrl} alt={`${title} 커버`} />
          </span>
        </span>

        <span className="flex flex-1 flex-col gap-1 px-1 pt-1.5">
          {/* 제목과 값이 같은 기준선에 선다 — 목록을 내려 읽을 때 왼쪽은 이름, 오른쪽은 값의 기둥이 된다 */}
          <span className="flex items-baseline justify-between gap-2.5">
            <Clamp className="text-[16px] font-extrabold tracking-[-0.03em] text-ink transition-colors duration-fast group-hover:text-acc">
              {title}
            </Clamp>
            {/* 값은 갈래를 가리지 않고 선다(2026-09-22, 사용자 지적: "최근 출시 영역에서는 금액이 안나옴").
                전에는 release 갈래에서 값을 통째로 감췄는데, 출시 갈래의 카드에도 파는 곳이 있으면
                "얼마인가" 는 여전히 첫 질문이다.

                **값을 모르면 줄 자체를 세우지 않는다**(같은 날 사용자 지정: "금액이 없으면 '-' 이것도
                보여주지마"). best 가 있어도 currentPrice 가 null 인 행이 있다 — formatPrice 는 그때
                "-" 를 돌려주는데, 카드에서 그 한 글자는 "값이 0 인가" 로도 "고장인가" 로도 읽힌다.
                모르는 것은 적지 않는 것이 이 화면의 규칙이다(점수 칸과 같다) */}
            {best && best.currentPrice !== null && (
              <span className="flex shrink-0 items-baseline gap-1.5">
                {hasDiscount && <DiscountStamp pct={best.discountPct} />}
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
              줄 수가 늘었으니 뼈대도 같이 늘린다(games/skeletons) */}
          <span className="mt-auto flex flex-col gap-1.5 pt-1.5">
            <PlatformBadges platforms={game.platforms} highlight={highlight?.platforms} />
            <span className="text-[12px] text-dim">
              {variant === "release" ? releaseLabel : storeLabel ? `${storeLabel} 최저` : ""}
            </span>
          </span>
        </span>
      </Link>
    </PointerParallax>
  );
}
