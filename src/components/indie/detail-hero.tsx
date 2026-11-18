// 인디 상세 머리 판 — 화면 끝까지 꽉 찬 커버 배너 + 겹친 흰 카드(2026-11-18 사용자, docs/인디상세머리_강조시안_2026-11-18.html 시안 D 선택).
//
// 지나온 길(전부 2026-11-18): 어두운 판(10-06 ~)이 "촌스럽다" 해서 본문 폭 배너 + 흰 카드(시안 B)로 바꿨고, 작은 커버를 가운데 두고 양옆을 흐린 그림으로
// 채웠더니 "상단이랑 이미지 쪽이 강조가 약해, 텅텅 비었다". 넷 시안 가운데 D(배너를 화면 폭 전체로)를 PC, 휴대폰 모두 골랐다.
// 알고 고른 값: 커버 대부분이 460px 스팀 머리 그림이라 1280px 화면에서는 약 2.8배 늘어 흐리다(시안 HTML 에 적어 보였다). 큰 그림을 올린 글은 선명하다.
//
// 카드 빈자리(같은 날): 오른쪽에 찜, 조회, 올린 날을 다시 세우는 건 아래 "게임 정보" 칸과 겹쳐 사용자가 물렸다. 그래서 새 정보는 더하지 않고
// 있는 것을 상점 화면처럼 두 칸으로 나눈다 — 넓은 화면에서 왼쪽은 트로피 판, 제목, 소개, 플랫폼, 지난 순위, 오른쪽은 행동 상자(플레이하기 + 다른 링크).
// 휴대폰은 한 칸 그대로다. 파랑은 플레이하기(없으면 첫 링크) 하나뿐이다.
//
// 바뀌지 않은 것: 플랫폼별 스토어 링크는 여기 세우지 않는다(2026-10-26, 구매 마디 하나). 여기는 그 마디에 들지 않는 링크(데모, 공식 사이트 등)만.
// 바깥 링크에 nofollow ugc — 글쓴이가 적은 주소라 링크 도배가 우리 도메인 신용을 먹는다.
// 맨 앞 큰 단추는 "플레이하기"(2026-10-27, lib/indie/promo). 주소는 화면이 정해 넘긴다 — 공개 글이면 클릭을 세는 경유 주소다(app/api/indie/out).
// 이번 달 명예의 전당 1~3위는 제목 위 트로피 판 하나로 말한다(명예의 전당으로 가는 링크). 지난 달 확정 순위는 제목 아래 작은 딱지 줄.
import Image from "next/image";
import Link from "next/link";
import { CoverImage } from "@/components/game-card";
import { TrophyIcon } from "@/components/ui/icons";
import { RANK_TONE_TOP } from "@/components/ui/rank-tone";
import { cn } from "@/lib/cn";
import type { IndieDetailDto } from "@/lib/indie/dto";
import { INDIE_MESSAGES as M, INDIE_PLATFORM_LABEL, linkLabel } from "@/lib/indie/messages";
import { INDIE_PROMO_MESSAGES as PM } from "@/lib/indie/promo-messages";
import { FAME_MESSAGES as FM, ymLabel } from "@/lib/indie/fame";
import { gamePath, hallOfFamePath, ROUTES } from "@/lib/routes";

/** 배너 높이. 휴대폰 220px, 넓은 화면 400px(시안 D). 화면 폭 띠라 비율이 아니라 높이로 묶는다 — 비율이면 큰 모니터에서 배너가 화면을 다 먹는다 */
const BANNER_H = "h-[220px] sm:h-[400px]";

/** 이번 달 1~3위 트로피 그림(public/fame, 2026-11-18 Figma AI 생성 원본은 Figma 파일 "손전등 명예의 전당 트로피"). 1위 금, 2위 은, 3위 동 */
const TROPHY_SRC = ["/fame/trophy-1.png", "/fame/trophy-2.png", "/fame/trophy-3.png"] as const;
/** 트로피 그림 크기(px). 두 줄 글자(12px + 19px) 높이보다 조금 크게 — 그림이 판의 주인이다 */
const TROPHY_PX = 48;
/** 트로피 옆 옅은 판. 색은 globals.css 의 --medal-*-soft */
const MEDAL_SOFT = ["bg-medal-1-soft", "bg-medal-2-soft", "bg-medal-3-soft"] as const;

/** 밝은 판 위 알약(플랫폼, 지난 순위). 회색 테두리 */
const PILL = "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold text-ink-2 ring-1 ring-line-strong";
const LINK_BASE = "press tap inline-flex min-h-[var(--touch-target)] items-center justify-center rounded-full px-5 text-[14px] font-bold";
/** 보조 링크 — 테두리 알약 */
const LINK_PILL = cn(LINK_BASE, "text-ink-2 ring-1 ring-line-strong hover:bg-surface-2");
/** 플레이하기가 없을 때 첫 링크가 주 행동 — 파란 채운 알약(화면의 파랑은 이 하나) */
const LINK_PRIMARY = cn(LINK_BASE, "bg-acc text-on-ink hover:bg-acc-hover");

/** 머리 판에 서는 링크 하나. href 는 화면이 정한다(머리 주석) */
export type IndieHeroLink = { kind: string; href: string };

/** 플레이하기 큰 단추 — 주 행동이라 판에서 가장 크고, 아래 작은 줄이 어디로 가는지 말한다. 넓은 화면에서는 행동 상자 폭을 다 쓴다 */
const PLAY = "press tap inline-flex min-h-14 flex-col items-start justify-center rounded-[var(--radius-md)] bg-acc px-6 py-2 text-on-ink shadow-3 hover:bg-acc-hover lg:w-full lg:items-center";

/** 배너 아래 반을 페이지 바탕색으로 녹이는 막 */
const BANNER_FADE = { background: "linear-gradient(to bottom, transparent, var(--bg))" } as const;

export function IndieDetailHero({
  post,
  links,
  play,
  fameRank,
  fameHistory,
}: {
  post: IndieDetailDto;
  links: IndieHeroLink[];
  play: IndieHeroLink | null;
  fameRank: number | null;
  fameHistory: Array<{ ym: string; rank: number }>;
}) {
  const cover = post.images[0];
  const podium = fameRank !== null && fameRank <= RANK_TONE_TOP ? fameRank : null;
  return (
    <section className="enter-item relative">
      {/* 배너 — 본문 폭을 벗어나 화면 끝에서 끝까지(globals.css 의 .full-bleed). 아래로 바탕색에 녹인다 */}
      <div className={cn("full-bleed relative isolate overflow-hidden bg-surface-3", BANNER_H)}>
        <CoverImage src={cover?.url ?? null} alt={M.coverAlt(post.title)} sizes="100vw" priority />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2" style={BANNER_FADE} />
      </div>

      {/* 정보 카드 — 배너 아래쪽에 겹쳐 앉는다. 넓은 화면에서는 두 칸(머리 주석) */}
      <div className="relative mx-2.5 -mt-12 grid gap-5 rounded-[var(--radius-panel)] bg-surface p-4 shadow-[var(--ring-hair),var(--elev-2)] sm:mx-7 sm:-mt-24 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 lg:p-8">
       <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-2">
          {/* 이번 달 1~3위(2026-11-18 사용자: 회색 딱지는 "강조가 안 된다", 여러 시안 끝에 Figma AI 로 뽑은 우리 트로피를 골랐다).
              트로피 그림 + 옅은 금, 은, 동 판 + 두 줄 글자. 테두리 빛, 움직임 없이 "심플하고 세련되게"(같은 날 사용자) */}
          {podium && (
            <Link
              href={ROUTES.hallOfFame}
              aria-label={`${FM.detailBadge(podium)}, ${FM.detailBadgeLink}`}
              className={cn("press tap group inline-flex items-center gap-3 self-start rounded-[var(--radius-md)] py-1.5 pl-1.5 pr-4 ring-1 ring-medal-line", MEDAL_SOFT[podium - 1])}
            >
              <Image src={TROPHY_SRC[podium - 1]} alt="" width={TROPHY_PX} height={TROPHY_PX} className="drop-shadow-[0_4px_6px_rgb(0_0_0/0.16)]" />
              <span className="flex flex-col leading-tight">
                <span className="text-[12px] font-semibold text-mut">{FM.detailBadgeHead}</span>
                <span className="text-[19px] font-black tracking-[-0.02em] text-ink">{FM.detailBadgeRank(podium)}</span>
              </span>
              <span className="ml-2 text-[12.5px] text-mut underline decoration-line-strong underline-offset-[3px] group-hover:text-ink">{FM.detailBadgeLink}</span>
            </Link>
          )}
          {/* 개발 단계(앞서 해보기 등) 줄은 걷었다(2026-11-16 사용자 "앞서해보기 문구 제거") */}
          <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.04em] text-ink sm:text-[36px]">{post.title}</h1>
          <p className="text-[15px] leading-[1.6] text-mut">{post.tagline}</p>
        </div>

        {fameHistory.length > 0 && (
          <ul aria-label={FM.pastBadges} className="flex flex-wrap gap-1.5">
            {fameHistory.map((h) => (
              <li key={h.ym}>
                <Link href={hallOfFamePath("history", h.ym)} className={cn(PILL, "press tap gap-1.5 py-1 pl-1.5 hover:bg-surface-2")}>
                  <TrophyIcon size={13} strokeWidth={2.4} aria-hidden />
                  {FM.pastBadge(ymLabel(h.ym), h.rank)}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <ul aria-label={M.platforms} className="flex flex-wrap gap-1.5">
          {post.platforms.map((p) => (
            <li key={p} className={PILL}>
              {INDIE_PLATFORM_LABEL[p]}
            </li>
          ))}
        </ul>

       </div>

       {/* 행동 상자 — 넓은 화면에서는 오른쪽 칸 가운데에 세로로 쌓인다 */}
       <div className="flex flex-col gap-3 lg:justify-center lg:border-l lg:border-line-soft lg:pl-10">
        {play && (
          <a href={play.href} target="_blank" rel="noopener noreferrer nofollow ugc" className={cn(PLAY, "self-start lg:self-stretch")}>
            <span className="text-[17px] font-extrabold">{PM.play}</span>
            <span className="text-[12.5px] font-semibold opacity-85">{PM.playVia(play.kind)}</span>
            <span className="sr-only">{M.newWindow}</span>
          </a>
        )}

        {(links.length > 0 || post.game?.verified) && (
          <div className="flex flex-wrap gap-2 lg:flex-col">
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
