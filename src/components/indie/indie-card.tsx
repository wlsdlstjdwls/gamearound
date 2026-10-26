// 인디 게임 카드 — 목록(내가 만든 게임), 슈퍼루키, 홈 줄이 같이 쓴다.
//
// 게임 카드와 껍데기, 커버 비율을 같게 둔다(CARD_SHELL, COVER_CLASS). 홈에서 게임 줄 사이에 서는데
// 카드 모양이 다르면 "광고 칸" 으로 읽혀 눈이 건너뛴다. 인디 글에는 가격이 없어서 값 자리에
// 기획서 S-18 카드 항목(장르, 플랫폼, 찜 수, 등록일)을 목업 mgCard 순서대로 적는다:
//   제목 줄(+ badge 자리: 슈퍼루키의 "N일 전 등록") | 플랫폼, 장르 알약 | 한 줄 소개 | 만든 사람, 등록일, 찜
import Link from "next/link";
import { CARD_SHELL, COVER_CLASS, CoverImage } from "@/components/game-card";
import { HeartIcon } from "@/components/ui/icons";
import { Clamp } from "@/components/ui/tooltip";
import { IndieStageBadge } from "@/components/indie/stage-badge";
import { cn } from "@/lib/cn";
import { formatDotDate } from "@/lib/format";
import { indiePath } from "@/lib/routes";
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

export function IndieCard({ post, badge }: { post: IndieCardDto; badge?: React.ReactNode }) {
  return (
    <div className={cn(CARD_SHELL, "cover-zoom group relative")}>
      <span className={COVER_CLASS}>
        <span className="cover-zoom-img absolute inset-0 block">
          <CoverImage src={post.cover.url} alt={M.coverAlt(post.title)} sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw" />
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {badge}
          {/* 누를 면은 제목 링크의 ::after 다 — 게임 카드와 같은 구조(game-card 주석) */}
          <Link
            href={indiePath(post.slug)}
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
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[12px] text-dim">
          <IndieStageBadge stage={post.stage} />
          <span className="min-w-0 truncate">{[post.developerName, formatDotDate(post.registeredAt)].join(" | ")}</span>
          <span className="ml-auto flex shrink-0 items-center gap-0.5 tabular-nums">
            <HeartIcon size={12} />
            <span className="sr-only">{M.likesLabel}</span>
            {post.likeCount.toLocaleString("ko-KR")}
          </span>
        </div>
      </div>
    </div>
  );
}
