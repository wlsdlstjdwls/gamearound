// 인디 홍보 글 카드 — 목록과 홈 줄이 같이 쓴다.
//
// 게임 카드와 껍데기, 커버 비율을 같게 둔다(CARD_SHELL, COVER_CLASS). 홈에서 게임 줄 사이에 서는데
// 카드 모양이 다르면 "광고 칸" 으로 읽혀 눈이 건너뛴다. 대신 값 자리에 개발 단계 배지와 만든 사람을 적는다 —
// 인디 글에는 가격이 없고, "지금 해 볼 수 있나" 가 이 카드에서 가장 궁금한 값이다.
import Link from "next/link";
import { CARD_SHELL, COVER_CLASS, CoverImage } from "@/components/game-card";
import { Clamp } from "@/components/ui/tooltip";
import { IndieStageBadge } from "@/components/indie/stage-badge";
import { cn } from "@/lib/cn";
import { indiePath } from "@/lib/routes";
import { INDIE_MESSAGES as M, INDIE_PLATFORM_LABEL } from "@/lib/indie/messages";
import type { IndieCardDto } from "@/lib/indie/dto";

export function IndieCard({ post }: { post: IndieCardDto }) {
  return (
    <div className={cn(CARD_SHELL, "cover-zoom group relative")}>
      <span className={COVER_CLASS}>
        <span className="cover-zoom-img absolute inset-0 block">
          <CoverImage src={post.cover.url} alt={M.coverAlt(post.title)} sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw" />
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-1">
        {/* 누를 면은 제목 링크의 ::after 다 — 게임 카드와 같은 구조(game-card 주석) */}
        <Link
          href={indiePath(post.slug)}
          className="outline-none after:absolute after:inset-0 after:rounded-[var(--radius-panel)] focus-visible:after:ring-2 focus-visible:after:ring-ink focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-bg"
        >
          <Clamp lines={1} className="text-[16px] font-semibold leading-[1.35] tracking-[-0.015em] text-ink transition-colors duration-fast group-hover:text-acc sm:text-[15px]">
            {post.title}
          </Clamp>
        </Link>
        <Clamp lines={2} className="text-[13px] leading-[1.5] text-mut">
          {post.tagline}
        </Clamp>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[12px] text-dim">
          <IndieStageBadge stage={post.stage} />
          <span className="min-w-0 truncate">
            {[post.developerName, post.platforms.map((p) => INDIE_PLATFORM_LABEL[p]).join(", ")].join(" | ")}
          </span>
        </div>
      </div>
    </div>
  );
}
