// 게임 카드(홈/목록) + 커버 이미지 공용 컴포넌트
//
// 리디자인(2026-09-21): 카드에서 테두리와 흰 판을 걷어냈다(판은 2026-09-22 에 카드에만 되돌렸다).
// 커버가 카드의 주역이고, 글자는 그 아래 앉는다. 강조는 카드당 하나뿐이다 —
// 값 앞에 서는 할인율 배지. 나머지는 전부 회색 글자다. 커버 위에는 아무것도 얹지 않는다.
import { Fragment } from "react";
import { formatPrice } from "@/lib/currency";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { parsePlatformValues } from "@/lib/games-query";
import { expandPlatformValues } from "@/lib/platform";
import { DiscountText } from "@/components/ui/discount";
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
    // 면을 걷고 글자만 남겼다(2026-09-29, 커머스 정보형) — 판이 없는 카드에서 꽉 찬 보라 면은 커버 다음으로
    // 센 덩어리라 값보다 먼저 읽혔다. 값과 같은 크기, 같은 굵기의 색 숫자면 "얼마나 - 얼마" 가 한 호흡이다
    <span className="inline-flex shrink-0 items-baseline text-[18px] font-extrabold tracking-[-0.03em] text-acc sm:text-[19px]">
      <DiscountText pct={pct} />
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
/*
 * 좁은 화면에서 카드를 가로로 눕혀 봤다가 같은 날 되돌렸다(2026-09-29, 사용자: "모바일의 경우도 그냥
 * 동일하게 카드 형태로"). 한 화면에 보이는 장 수보다 커버 그림이 카드의 얼굴인 쪽을 골랐다.
 *
 * 같은 날 판(.card-panel)을 걷었다가 곧바로 되돌렸다(사용자: "카드 구분이 안되네") — 흰 바탕에
 * 판 없는 카드는 이웃 카드의 글자와 섞였다. 판은 회색 바탕 위 흰 면 한 겹이다.
 * 좁은 화면은 두 줄 격자라(lib/games/grid) 한 화면에 네 장이 선다.
 */
/** 카드에서 펴 두는 플랫폼 배지 수 — 넘으면 "+N"(2026-09-30 사용자 지정: 셋에서 "2개만 보여주고 더보기" 로 줄였다.
 *  모바일 두 줄 격자의 170px 칸에서 셋은 두 줄로 접혔다) */
const BADGE_LIMIT = 2;

export const CARD_SHELL = "card-panel flex h-full flex-col gap-2 p-2 pb-3 sm:p-2.5 sm:pb-3.5";

/** 커버 상자. 뼈대도 같은 값을 써야 본문이 올 때 격자가 밀리지 않는다 */
export const COVER_CLASS =
  "relative block aspect-[460/215] w-full overflow-hidden rounded-[var(--radius-md)] bg-surface-3 shadow-hair";

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
  const releaseLabel = releaseText ?? (best?.releaseDate ? `${formatDate(best.releaseDate)} 출시` : "");

  return (
    // 미는 범위는 **카드 한 장 전체**다(2026-09-22, 사용자 지정) — 커버에만 걸면 제목이나 값 위에서
    // 그림이 제자리로 돌아와 카드 안에서 커서를 옮길 때마다 붙었다 떨어졌다 한다.
    // 링크 바깥에 두는 이유: 이 껍데기는 포인터만 듣고 아무것도 그리지 않으므로 누를 면(a)을 나누지 않는다
    <PointerParallax className="block h-full">
      {/* 카드 전체를 덮는 것은 **제목 링크의 ::after** 다(2026-09-30). 전에는 카드 통째가 <a> 였는데,
          배지 "+N" 더보기 버튼을 넣으면 링크 안의 버튼이 되어(누르면 상세로 넘어간다, 중첩 대화형 요소)
          카드는 div 로, 누를 면은 제목 링크가 늘어나 덮는 방식으로 바꿨다. 버튼만 z-10 으로 그 위에 뜬다.
          포커스 링도 ::after 에 그려 카드 모양 그대로 선다 */}
      <div className={cn(CARD_SHELL, "cover-zoom group relative")}>
        {/* 판 안이라 그림자를 겹치지 않는다 — 가장자리를 긋는 링 한 줄이면 밝은 커버가 흰 판에 번지지 않는다 */}
        <span className={COVER_CLASS}>
          <span className="cover-zoom-img absolute inset-0 block">
            <CoverImage src={game.coverUrl} alt={`${title} 커버`} sizes="(max-width: 768px) 50vw, 25vw" />
          </span>
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-1">
          {/* 제목은 줄 하나를 혼자 쓴다(2026-09-29, 사용자: "가시성이 너무 떨어져") — 두 줄까지 펴고 그 뒤를 자른다.
              순서는 이름 - 기기 - 값(2026-09-30, 사용자: "플랫폼 뱃지가 제목 아래에 있는게 낫지 않나").
              카드를 훑는 눈은 그림 다음에 이름을 찾는다 — 배지가 그 사이에 서면 한 번 건너뛰어야 했다 */}
          <Link
            href={`/games/${game.slug}`}
            className="outline-none after:absolute after:inset-0 after:rounded-[var(--radius-panel)] focus-visible:after:ring-2 focus-visible:after:ring-ink focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-bg"
          >
            <Clamp lines={2} className="text-[15px] font-semibold leading-[1.35] tracking-[-0.015em] text-ink transition-colors duration-fast group-hover:text-acc">
              {title}
            </Clamp>
          </Link>

          {/* 부제는 장르로 거를 때만 선다 — 늘 서 있으면 회색 한 줄이 카드마다 잘린 채 붙어 값보다 먼저 읽혔다.
              거를 때는 "왜 이 게임이 여기 있나" 를 말해 주는 값이라 남긴다(고른 장르만 보라) */}
          {highlight?.genre && genres.length > 0 && (
            <span className="text-[12.5px] text-dim">
              <Clamp text={genres.join(", ")}>
                {genres.map((g, i) => (
                  // 쉼표는 색을 입힌 조각 **밖에** 둔다 — 안에 넣으면 고른 장르 앞의 구분자까지 보라가 된다
                  <Fragment key={g}>
                    {i > 0 ? ", " : null}
                    <span className={g === highlight.genre ? "font-semibold text-acc" : undefined}>{g}</span>
                  </Fragment>
                ))}
              </Clamp>
            </span>
          )}

          {/* 기기 줄 — 셋까지 펴고 나머지는 "+N"(PlatformBadges 의 limit). 최저 말풍선이 맨 앞 배지 위에 뜬다.
              남은 기간은 넓은 화면에서 이 줄 오른쪽 끝에 선다 — 값 줄 끝에 두면 값, 정가 뒤에 못 붙고
              혼자 다음 줄로 떨어졌다. 두 줄 격자(좁은 화면)는 칸이 170px 이라 값 줄 끝으로 간다.
              플랫폼을 쉼표로 이은 글자에서 배지로 바꾼 이유(2026-09-21): 모양으로 훑는 편이 빠르다 */}
          <div className="flex items-end justify-between gap-2">
            <PlatformBadges
              platforms={game.platforms}
              highlight={highlight?.platforms}
              lowest={best?.currentPrice != null ? best.platform : null}
              limit={BADGE_LIMIT}
            />
            {variant !== "release" && hasDiscount && (
              <span className="hidden shrink-0 pb-0.5 sm:block">
                <SaleBadge variant="inline" discountName={null} discountEndsAt={best?.discountEndsAt} />
              </span>
            )}
          </div>

          {/* 값 줄은 카드 **바닥**에 붙는다(mt-auto) — 같은 줄 카드끼리 값이 한 높이에 서서 가로로 견줄 수 있다.
              할인율, 값, 정가를 한 줄에 흘린다. 좁으면 접힌다 — 값을 자르지 않는다.

              값은 갈래를 가리지 않고 선다(2026-09-22, 사용자 지적: "최근 출시 영역에서는 금액이 안나옴").
              **값을 모르면 값을 세우지 않는다**(같은 날 사용자 지정: "금액이 없으면 '-' 이것도
              보여주지마") — 카드에서 "-" 한 글자는 "값이 0 인가" 로도 "고장인가" 로도 읽힌다 */}
          <div className="mt-auto flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 pt-1">
            {best && best.currentPrice !== null && (
              <>
                {hasDiscount && <DiscountStamp pct={best.discountPct} />}
                <span className="text-[18px] font-extrabold tracking-[-0.03em] text-ink sm:text-[19px]">
                  {formatPrice(best.currentPrice, best.currency)}
                </span>
                {hasDiscount && best.listPrice !== null && (
                  <span className="text-[12.5px] text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span>
                )}
              </>
            )}
            {variant === "release" && releaseLabel && <span className="ml-auto text-[12.5px] text-dim">{releaseLabel}</span>}
            {variant !== "release" && hasDiscount && (
              <span className="ml-auto sm:hidden">
                <SaleBadge variant="inline" discountName={null} discountEndsAt={best?.discountEndsAt} />
              </span>
            )}
          </div>
        </div>
      </div>
    </PointerParallax>
  );
}
