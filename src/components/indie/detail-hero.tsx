// 인디 상세 머리 판 — 대표 그림을 흐리게 깐 어두운 판(2026-10-06 사용자: "화면이 심심하다"). 흰 판만 줄 서 있으면
// 그 게임의 색이 화면 어디에도 안 남는다 — 스토어 상점 화면처럼 게임 그림이 화면의 분위기를 정하게 둔다.
//
// 플랫폼별 스토어 링크는 여기 세우지 않는다(2026-10-26). 같은 링크가 머리 알약, 구매 마디, 오른쪽 주 단추로 세 번 나왔다 —
// 목업 mgDetail 처럼 "플랫폼별 구매하러 가기" 마디 하나만 둔다. 여기에는 그 마디에 들지 않는 링크(데모, 공식 사이트 등)만 선다.
// 바깥 링크에 nofollow ugc 를 다는 이유: 글쓴이가 적은 주소라 검색 순위를 노린 링크 도배가 우리 도메인의 신용을 먹는다.
//
// 맨 앞 큰 단추는 "플레이하기"(2026-10-27, 기획서 3장 1번) — 해 볼 수 있는 링크(체험판, 웹, 스토어) 하나를 고른다(lib/indie/promo).
// 그 링크가 스토어면 구매 마디에도 서지만 둘은 하는 말이 다르다: 여기는 "지금 해 보기" 한 곳, 구매 마디는 "플랫폼마다 어디서 사나" 다.
// 주소(href)는 화면이 정해 넘긴다 — 공개 글이면 클릭을 세는 경유 주소, 승인 전이면 원래 주소다(app/api/indie/out).
import Link from "next/link";
import { CoverImage } from "@/components/game-card";
import { cn } from "@/lib/cn";
import type { IndieDetailDto } from "@/lib/indie/dto";
import { INDIE_MESSAGES as M, INDIE_PLATFORM_LABEL, INDIE_STAGE_LABEL, linkLabel } from "@/lib/indie/messages";
import { INDIE_PROMO_MESSAGES as PM } from "@/lib/indie/promo-messages";
import { gamePath } from "@/lib/routes";

/** 어두운 판 위의 알약. 반투명 흰 테두리라 대표 그림 색이 무엇이든 읽힌다 */
const PILL = "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ring-[color-mix(in_oklab,var(--on-ink)_28%,transparent)]";
const LINK_BASE = "press tap inline-flex min-h-[var(--touch-target)] items-center rounded-full px-5 text-[14px] font-bold";
/** 첫 링크만 채운 알약(주 행동), 나머지는 테두리 알약 */
const LINK_PILL = cn(LINK_BASE, "ring-1 ring-[color-mix(in_oklab,var(--on-ink)_35%,transparent)] hover:bg-[color-mix(in_oklab,var(--on-ink)_12%,transparent)]");
const LINK_PRIMARY = cn(LINK_BASE, "bg-on-ink text-ink");

/** 머리 판에 서는 링크 하나. href 는 화면이 정한다(머리 주석) */
export type IndieHeroLink = { kind: string; href: string };

/** 플레이하기 큰 단추 — 주 행동이라 판에서 가장 크고, 아래 작은 줄이 어디로 가는지 말한다 */
const PLAY = "press tap inline-flex min-h-14 flex-col items-start justify-center rounded-[var(--radius-md)] bg-on-ink px-6 py-2 text-ink shadow-3 hover:opacity-90";

export function IndieDetailHero({ post, links, play }: { post: IndieDetailDto; links: IndieHeroLink[]; play: IndieHeroLink | null }) {
  const cover = post.images[0];
  return (
    <section className="enter-item relative isolate overflow-hidden rounded-[var(--radius-panel)] bg-ink text-on-ink">
      {/* 대표 그림을 크게 흐려 판의 바탕으로 깐다. 장식이라 alt 를 비우고 읽는 도구에서 숨긴다 */}
      {cover && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 scale-125 opacity-55 blur-3xl">
          <CoverImage src={cover.url} alt="" sizes="40vw" />
        </div>
      )}
      {/* 대표 그림 위로 파란 손전등 빛이 천천히 오간다(명예의 전당 머리 판과 같은 빛) */}
      <span aria-hidden className="hero-beam beam-cool" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--ink) 30%, transparent), color-mix(in oklab, var(--ink) 85%, transparent))" }}
      />

      <div className="grid items-center gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-9 lg:p-8">
        <div className="relative aspect-[460/215] w-full overflow-hidden rounded-[var(--radius-md)] bg-surface-3 shadow-3 ring-1 ring-[color-mix(in_oklab,var(--on-ink)_18%,transparent)]">
          <CoverImage src={cover?.url ?? null} alt={M.coverAlt(post.title)} sizes="(max-width: 1024px) 100vw, 60vw" priority />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-[12px] font-bold tracking-[0.06em]">
              <span aria-hidden className="size-2 rounded-full bg-acc-on-ink" />
              {INDIE_STAGE_LABEL[post.stage]}
            </span>
            <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.04em] sm:text-[36px]">{post.title}</h1>
            <p className="text-[15px] leading-[1.6] opacity-80">{post.tagline}</p>
          </div>

          <ul aria-label={M.platforms} className="flex flex-wrap gap-1.5">
            {post.platforms.map((p) => (
              <li key={p} className={PILL}>
                {INDIE_PLATFORM_LABEL[p]}
              </li>
            ))}
          </ul>

          {play && (
            <a href={play.href} target="_blank" rel="noopener noreferrer nofollow ugc" className={cn(PLAY, "self-start")}>
              <span className="text-[17px] font-extrabold">{PM.play}</span>
              <span className="text-[12.5px] font-semibold text-mut">{PM.playVia(play.kind)}</span>
              <span className="sr-only">{M.newWindow}</span>
            </a>
          )}

          {(links.length > 0 || post.game?.verified) && (
            <div className="flex flex-wrap gap-2">
              <h2 className="sr-only">{M.links}</h2>
              {links.map((l, i) => (
                <a key={`${l.href}-${i}`} href={l.href} target="_blank" rel="noopener noreferrer nofollow ugc" className={i === 0 && !play ? LINK_PRIMARY : LINK_PILL}>
                  {linkLabel(l.kind)}
                  <span className="sr-only">{M.newWindow}</span>
                </a>
              ))}
              {post.game?.verified && (
                <Link href={gamePath(post.game.slug)} className={LINK_PILL}>
                  {M.catalogLink}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
