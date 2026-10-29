// 인디 게임 카드 — 목록(내가 만든 게임), 슈퍼루키, 홈 줄이 같이 쓴다.
//
// 게임 카드와 껍데기, 커버 비율을 같게 둔다(CARD_SHELL, COVER_CLASS). 홈에서 게임 줄 사이에 서는데
// 카드 모양이 다르면 "광고 칸" 으로 읽혀 눈이 건너뛴다. 인디 글에는 가격이 없어서 값 자리에
// 기획서 S-18 카드 항목(장르, 플랫폼, 찜 수, 등록일)을 목업 mgCard 순서대로 적는다:
//   제목 줄(+ badge 자리: 슈퍼루키의 "N일 전 등록") | 플랫폼, 장르 알약 | 한 줄 소개 | 만든 사람, 등록일, 찜
import { MakerBadge } from "@/components/membership/maker-badge";
import Link from "next/link";
import { CARD_SHELL, COVER_CLASS, CoverImage } from "@/components/game-card";
import { HeartIcon } from "@/components/ui/icons";
import { Clamp } from "@/components/ui/tooltip";
import { IndieStageBadge } from "@/components/indie/stage-badge";
import { WishHeart } from "@/components/wish-heart";
import { cn } from "@/lib/cn";
import { formatDotDate } from "@/lib/format";
import { indieDetailHref, type IndieFrom } from "@/lib/indie/query";
import { genreLabels, INDIE_MESSAGES as M, INDIE_PLATFORM_LABEL } from "@/lib/indie/messages";
import type { IndieCardDto } from "@/lib/indie/dto";

/** 플랫폼, 장르 알약 — 목업 .pl. 카드와 등록현황 줄이 같은 모양을 쓴다 */
export function IndieTagPills({ platforms, genres }: { platforms: readonly IndieCardDto["platforms"][number][]; genres: readonly string[] }) {
  const items = [...platforms.map((p) => INDIE_PLATFORM_LABEL[p]), ...genreLabels(genres)];
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1">
      {items.map((t, i) => (
        <li key={`${t}-${i}`} className={cn("rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[11.5px] font-semibold", i < platforms.length ? "bg-surface-2 text-ink-2" : "bg-acc-soft text-acc")}>
          {t}
        </li>
      ))}
    </ul>
  );
}

/**
 * from: 상세의 경로 줄, 메뉴 강조를 정하는 출처(lib/indie/query). 슈퍼루키가 싣는다 — 목록, 홈 줄은 기본이다.
 * wide: 가로 카드(sm 이상에서 그림 왼쪽, 글 오른쪽). 인디 목록 "주목할 게임" 이 한두 장뿐일 때 쓴다(2026-10-29) — 세로 카드 한 장이
 *   넓은 유료 판의 4분의 1만 채워 판이 비어 보였다. 좁은 화면에서는 세로 카드 그대로다.
 */
export function IndieCard({ post, badge, from, wide = false }: { post: IndieCardDto; badge?: React.ReactNode; from?: IndieFrom; wide?: boolean }) {
  return (
    <div className={cn(CARD_SHELL, "cover-zoom group relative", wide && "sm:flex-row sm:gap-4 sm:p-3")}>
      {/* 손을 올리면 그림이 살짝 자라고 빛이 한 번 스친다(.cover-glint) */}
      <span className={cn(COVER_CLASS, "cover-glint", wide && "sm:w-[46%] sm:max-w-[360px] sm:shrink-0")}>
        <span className="cover-zoom-img absolute inset-0 block">
          <CoverImage src={post.cover.url} alt={M.coverAlt(post.title)} sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw" />
        </span>
        {/* 찜 하트(2026-10-29, 상세에만 있던 찜을 카드에도). 게임 카드와 같은 자리, 같은 부품이다 — 제목 링크의 ::after 가 카드를 덮어 z-10 으로 그 위에 뜬다.
            카드가 아니라 커버 상자 안에 두는 이유: 가로 카드(wide)에서 카드 오른쪽 위는 제목 줄이라 하트가 글자를 가린다 */}
        <WishHeart kind="indie" slug={post.slug} title={post.title} className="absolute right-2 top-2 z-10" />
      </span>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5 px-1", wide && "sm:py-1")}>
        <div className="flex min-w-0 items-center gap-1.5">
          {badge}
          {/* 누를 면은 제목 링크의 ::after 다 — 게임 카드와 같은 구조(game-card 주석) */}
          <Link
            href={indieDetailHref(post.slug, from)}
            className="min-w-0 flex-1 outline-none after:absolute after:inset-0 after:rounded-[var(--radius-panel)] focus-visible:after:ring-2 focus-visible:after:ring-ink focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-bg"
          >
            <Clamp lines={1} className="text-[16px] font-semibold leading-[1.35] tracking-[-0.015em] text-ink transition-colors duration-fast group-hover:text-acc sm:text-[15px]">
              {post.title}
            </Clamp>
          </Link>
        </div>
        <IndieTagPills platforms={post.platforms} genres={post.genres} />
        <Clamp lines={2} className="text-[13px] leading-[1.5] text-mut">
          {post.tagline}
        </Clamp>
        {/* 한 줄로 고정한다 — 줄바꿈을 허락하면 만든 사람 이름 길이에 따라 찜 수만 다음 줄로 떨어져 같은 줄 카드끼리 바닥 높이가 달라진다.
            넘치는 것은 가운데 이름 칸이 잘리며 받는다 */}
        <div className="mt-auto flex items-center gap-2 pt-1 text-[12px] text-dim">
          <IndieStageBadge stage={post.stage} />
          {post.authorIsMaker && <MakerBadge />}
          <Clamp lines={1} className="min-w-0 flex-1">
            {[post.developerName, formatDotDate(post.registeredAt)].join(" | ")}
          </Clamp>
          <span className="flex shrink-0 items-center gap-0.5 tabular-nums">
            <HeartIcon size={12} />
            <span className="sr-only">{M.likesLabel}</span>
            {post.likeCount.toLocaleString("ko-KR")}
          </span>
        </div>
      </div>
    </div>
  );
}
