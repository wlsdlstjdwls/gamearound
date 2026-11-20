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
import Link from "next/link";
import { CoverImage } from "@/components/game-card";
import { TrophyIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { IndieDetailDto } from "@/lib/indie/dto";
import { INDIE_MESSAGES as M, INDIE_PLATFORM_LABEL, linkLabel } from "@/lib/indie/messages";
import { INDIE_PROMO_MESSAGES as PM } from "@/lib/indie/promo-messages";
import { FAME_MESSAGES as FM, ymLabel } from "@/lib/indie/fame";
import { gamePath, hallOfFamePath } from "@/lib/routes";

/** 배너 높이. 휴대폰 220px, 넓은 화면 400px(시안 D). 화면 폭 띠라 비율이 아니라 높이로 묶는다 — 비율이면 큰 모니터에서 배너가 화면을 다 먹는다 */
export const BANNER_H = "h-[220px] sm:h-[400px]";
/**
 * 정보 카드 껍데기 — 배너 아래쪽에 겹쳐 앉는다. 뼈대(indie/[slug]/loading)가 같은 값을 쓴다(실물과 같은 자리).
 * 겹침을 키웠다(2026-11-18 사용자 "제목 영역이 너무 아래, 좀만 더 올리자"): 휴대폰 48px 에서 80px, 넓은 화면 96px 에서 160px
 */
export const HERO_CARD = "relative mx-2.5 -mt-20 flex flex-col divide-y divide-line-soft rounded-[var(--radius-panel)] bg-surface shadow-[var(--ring-hair),var(--elev-2)] sm:mx-auto sm:-mt-40 sm:w-[calc(100%-56px)] sm:max-w-[var(--indie-body-w)]";
/** 카드 폭은 --indie-body-w 로 묶는다(같은 날 "가운데 콘텐츠 너비를 좀 더 줄이고" + "제목 영역이랑 이어 붙여야지" 둘 다). 배너만 화면 끝까지다 */
/** 카드 머리(제목 + 행동 상자) 두 칸 격자와 본문 마디가 같은 안쪽 여백을 쓴다 — 한 판이라 가장자리 선이 맞아야 한다 */
export const HERO_PAD = "p-4 sm:p-6 lg:p-8";
export const HERO_HEAD = "grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10";

/** 밝은 판 위 알약(플랫폼, 지난 순위). 회색 테두리 */
const PILL = "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold text-ink-2 ring-1 ring-line-strong";
const LINK_BASE = "press tap inline-flex min-h-[var(--touch-target)] items-center justify-center rounded-full px-5 text-[14px] font-bold";
/** 보조 링크 — 테두리 알약 */
const LINK_PILL = cn(LINK_BASE, "text-ink-2 ring-1 ring-line-strong hover:bg-surface-2");
/** 플레이하기가 없을 때 첫 링크가 주 행동 — 파란 채운 알약(화면의 파랑은 이 하나) */
const LINK_PRIMARY = cn(LINK_BASE, "bg-acc text-on-ink hover:bg-acc-hover");

/** 머리 판에 서는 링크 하나. href 는 화면이 정한다(머리 주석) */
export type IndieHeroLink = { kind: string; href: string };

/**
 * 플레이하기 큰 단추 — 주 행동이라 판에서 가장 크고, 아래 작은 줄이 어디로 가는지 말한다. 넓은 화면에서는 행동 상자 폭을 다 쓴다.
 * 휴대폰(640 아래)도 폭을 다 쓴다(2026-11-20 사용자 점검 "플레이하기 단추가 폭 절반이라 어정쩡") — 390px 에서 121px 짜리가 왼쪽에 붙어
 * 아래 찜하기(꽉 찬 폭)보다 작아 주 행동이 둘째로 읽혔다. 640~1023 은 그대로 둔다(두 칸 아래 한 칸 판이라 넓게 늘이면 단추가 판만 해진다)
 */
const PLAY = "press tap inline-flex min-h-14 flex-col items-start justify-center rounded-[var(--radius-md)] bg-acc px-6 py-2 text-on-ink shadow-3 hover:bg-acc-hover max-sm:items-center lg:w-full lg:items-center";

/** 배너 아래 반을 페이지 바탕색으로 녹이는 막 */
const BANNER_FADE = { background: "linear-gradient(to bottom, transparent, var(--bg))" } as const;

export function IndieDetailHero({
  post,
  links,
  play,
  fameHistory,
  facts = [],
  actions,
  children,
}: {
  post: IndieDetailDto;
  links: IndieHeroLink[];
  play: IndieHeroLink | null;
  fameHistory: Array<{ ym: string; rank: number }>;
  /** 게임 정보 사실 줄(만든 사람, 플랫폼, 장르, 출시, 올린 날) — 제목 아래 왼쪽에 두 칸 격자로 선다 */
  facts?: Array<{ label: string; value: React.ReactNode; nowrap?: boolean }>;
  /** 플레이하기 아래 단추들(찜하기, 소식 받기, 신고). 화면이 그려 넘긴다 — 로그인, 글쓴이 여부를 아는 쪽이 화면이다 */
  actions?: React.ReactNode;
  /** 같은 판 안에 이어지는 본문 마디들(구매, 소개, 스크린샷 ...). 마디마다 HERO_PAD 를 쓴다 */
  children?: React.ReactNode;
}) {
  const cover = post.images[0];
  return (
    <section className="enter-item relative">
      {/* 배너 — 본문 폭을 벗어나 화면 끝에서 끝까지(globals.css 의 .full-bleed). 아래로 바탕색에 녹인다 */}
      <div className={cn("full-bleed relative isolate overflow-hidden bg-surface-3", BANNER_H)}>
        <CoverImage src={cover?.url ?? null} alt={M.coverAlt(post.title)} sizes="100vw" priority />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2" style={BANNER_FADE} />
      </div>

      {/* 정보 카드 — 배너 아래쪽에 겹쳐 앉는다. 넓은 화면에서는 두 칸(머리 주석) */}
      {/* 머리와 본문이 흰 판 하나다(2026-11-18 사용자 "위 제목 영역이랑도 이어 붙여야지"). 본문 마디는 화면이 children 으로 넘긴다 */}
      <div className={HERO_CARD}>
       <div className={cn(HERO_HEAD, HERO_PAD)}>
       <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-2">
          {/* 이번 달 1~3위는 카드 안 판이 아니라 페이지 맨 위 금속 띠가 말한다(components/indie/fame-ribbon, 2026-11-18 L2 + C1) */}
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

        {/* 게임 정보 사실 줄 — 플랫폼 알약 아래 두 칸 격자(넓은 화면은 세 칸). 이름표 위, 값 아래. 값은 자르지 않는다(같은 날 "날짜도 다 짤리고" 지적) — 길면 낱말 단위로 줄을 바꾼다 */}
        {facts.length > 0 && (
          <dl aria-label={M.infoTitle} className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line-soft pt-4 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-[12px] text-dim">{f.label}</dt>
                <dd className={cn("break-keep text-[14px] font-semibold text-ink", f.nowrap && "whitespace-nowrap")}>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
       </div>

       {/* 행동 상자 — 넓은 화면에서는 오른쪽 칸 가운데에 세로로 쌓인다 */}
       <div className="flex flex-col gap-3 lg:justify-start lg:border-l lg:border-line-soft lg:pl-10">
        {play && (
          <a href={play.href} target="_blank" rel="noopener noreferrer nofollow ugc" className={cn(PLAY, "self-start max-sm:self-stretch lg:self-stretch")}>
            <span className="text-[17px] font-extrabold">{PM.play}</span>
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
        {/* 게임 정보의 단추들(2026-11-18 사용자 "오른쪽 하단 게임 정보 내용을 위로"). 사실 줄은 왼쪽 제목 아래다 */}
        {actions && <div className="flex flex-col gap-3">{actions}</div>}
       </div>
       </div>
        {children}
      </div>
    </section>
  );
}
