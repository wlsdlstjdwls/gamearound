// 게임 상세 히어로 — 목업 v2.0 S-05 의 위쪽 세 기둥 [큰 커버 | 무슨 게임인가 + 평점 | 알림, 찜 + 플레이타임].
//
// 2026-10-26 개편 전에는 [커버, 제목, 설명 | 오른쪽 sticky 결론 기둥(최저가, 알림, 예측, 점수, 플레이타임)] 두 기둥이었다.
// 목업은 "지금 얼마인가" 를 바로 아래 가격 카드 격자에 맡기고 히어로는 "무슨 게임인가" 와 행동 버튼만 갖는다.
// 최저가 큰 글자를 걷은 대신, 스크롤하면 머리띠(GameHeadbar)가 제목과 최저가를 계속 들고 있다.
//
// 좁은 화면은 한 기둥으로 문서 순서(커버, 지원 배지, 정보, 버튼, 평점, 플레이타임) 그대로 쌓는다.
// md 는 커버와 정보가 나란히, 오른쪽 기둥은 그 아래 한 줄을 다 쓴다.
//
// 2026-10-28 사용자 "이미지 오른쪽 콘텐츠들의 높이 차이가 난다": 가운데 기둥에 정보, 배지, 평점이 다 몰려
// 커버 기둥과 오른쪽 기둥 밑이 크게 비었다. 플레이 방식, 한국어 같은 지원 배지는 커버 밑으로, 평점은 오른쪽 기둥으로 옮겨
// 세 기둥 길이를 맞췄다. 출시 전 게임은 출시일을 원제 줄에 묻지 않고 제목 밑에 띠로 세운다(같은 날 "강조 필요").
import Link from "next/link";
import { Suspense } from "react";
import { CoverImage } from "@/components/game-card";
import { SourceRefs } from "@/components/game-detail/sources";
import { companyPath } from "@/lib/routes";
import { COMPANY_ROLE_LABEL } from "@/lib/games/messages";
import { ContentKindHead } from "@/components/content-kind-head";
import { KoreanSupportBadges } from "@/components/korean-support-badges";
import { MultiplayerBadges } from "@/components/multiplayer-badges";
import { PcSupportBadges } from "@/components/pc-support-badges";
import { PriceAlertButton, type AlertPlatformOption } from "@/components/price-alert-button";
import { WishlistButton } from "@/components/wishlist-button";
import { soldBrands } from "@/components/platform-prices";
import { PlatformJump } from "@/components/game-detail/platform-jump";
import { GamePostsLink } from "@/components/game-detail/posts-link";
import { CriticScores, PlaytimeTiles } from "@/components/game-detail/scores";
import { Flag } from "@/components/ui/flag";
import { Tag } from "@/components/ui/tag";
import { Clamp } from "@/components/ui/tooltip";
import { BellIcon, CalendarIcon } from "@/components/ui/icons";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { formatDate, kstDateKey } from "@/lib/format";
import { gamesHref } from "@/lib/games-query";
import { releaseLineText } from "@/lib/games/messages";
import { stagger } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { originCountry, type GameDetail } from "@/server/services/games";

/** 장르 태그 — 누르면 그 장르로 거른 목록(목업 .gtags 의 data-a="cat"). 칩이 아니라 꼬리표라 작은 알약이다 */
const GENRE_TAG =
  "press inline-flex min-h-[32px] items-center rounded-full bg-surface px-3.5 text-[13px] font-semibold text-ink ring-1 ring-line-strong ring-inset transition-colors duration-base hover:text-acc hover:ring-acc";

/** 원제, 출시일, 나라, 개발, 배급 한 줄의 낱말. 앞머리 막대는 줄 머리에서 잘린다(쓰는 자리 주석) */
const META_ITEM = "relative inline-flex items-center gap-x-1.5 pl-3 pr-1.5 before:absolute before:left-[3px] before:text-dim-2 before:content-['|']";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 출시일까지 남은 날(한국 날짜 기준). 날짜 열쇠끼리 빼서 시각 때문에 하루가 흔들리지 않는다 */
function daysUntil(dateKey: string): number {
  return Math.round((Date.parse(dateKey) - Date.parse(kstDateKey(new Date()))) / MS_PER_DAY);
}

export function DetailHero({
  game,
  title,
  unreleased,
  alertOptions,
  isFree,
}: {
  game: GameDetail;
  title: string;
  unreleased: boolean;
  /** 가격 알림 팝업의 칸(한국 행, 플랫폼마다 하나). 비면 알림 버튼을 세우지 않는다 */
  alertOptions: AlertPlatformOption[];
  /** 0원 — 내려갈 자리가 없어 알림이 영영 안 울린다(2026-09-21) */
  isFree: boolean;
}) {
  const origin = originCountry(game.companies);
  const brands = soldBrands(game.platforms);
  const hasPlayModes = game.supportsSolo || game.supportsCoop || game.supportsPvp || Boolean(game.localMaxPlayers) || Boolean(game.onlineMaxPlayers);
  const showAlert = !isFree && alertOptions.length > 0;
  // 출시 전이면 출시일은 제목 밑 띠(ReleaseBanner)가 말한다 — 같은 날짜를 두 번 쓰지 않는다
  const meta = [game.titleKo ? game.titleEn : null, game.releaseDate && !unreleased ? releaseLineText(formatDate(game.releaseDate), false) : null].filter(
    (v): v is string => Boolean(v),
  );

  return (
    <section className="grid gap-x-8 gap-y-5 md:grid-cols-2 lg:grid-cols-[minmax(0,420fr)_minmax(0,420fr)_minmax(0,368fr)] lg:gap-x-10">
      {/* 커버 — 흰 판 위에 한 장(목업 .artc). 가로 아트를 먼저 쓴다: 이 칸은 가로가 긴 상자라 세로 아트를 넣으면
          위아래가 반 넘게 잘린다. 가로 아트가 없는 게임만 세로 아트를 가운데 띠로 보여 준다 */}
      <div className="enter-item flex flex-col gap-2.5 self-start rounded-[var(--radius-panel)] bg-surface p-2.5 shadow-[var(--elev-card)] sm:p-3" style={stagger(0)}>
        <div className="cover-elev relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-cover-lg)] bg-surface-3">
          <CoverImage src={game.coverUrl ?? game.portraitUrl} alt={`${title} 커버`} sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 420px" priority />
        </div>
        {/* 정보 출처는 커버 밑 한 줄(game-detail/sources 머리 주석) */}
        <SourceRefs refs={game.sourceRefs} />
        {/* 플레이 방식, 스팀덱, 네이티브 OS, 한국어 — 목업에는 없지만 이 서비스가 모은 "내 조건에 맞나" 값이라 남긴다.
            커버 판 안 맨 밑에 둔다(머리 주석의 높이 맞추기) */}
        {(hasPlayModes || game.platforms.length > 0) && <SupportBadges game={game} className="hidden border-t border-line px-0.5 pt-2.5 md:flex" />}
      </div>

      <div className="enter-item flex min-w-0 flex-col gap-3" style={stagger(1)}>
        {/* 지원 플랫폼 이름 줄(목업 .plats). 누르면 그 플랫폼 카드로 미끄러져 내려가 카드가 잠깐 빛난다(platform-jump) */}
        {brands.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-bold tracking-[0.06em] text-ink-2">
            {brands.map((b, i) => (
              <span key={b.key} className="inline-flex items-center gap-x-2">
                {i > 0 && <span aria-hidden className="font-normal text-dim-2">|</span>}
                <PlatformJump anchor={b.anchor} brand={b.key} className="transition-colors hover:text-acc">
                  {b.label}
                </PlatformJump>
              </span>
            ))}
          </p>
        )}
        {/* 자식(DLC, 에디션)일 때만 선다 */}
        <ContentKindHead contentType={game.contentType} parent={game.parent} />
        <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-[-0.035em] text-ink sm:text-[34px] lg:text-[38px]">{title}</h1>
        {unreleased && game.releaseDate && <ReleaseBanner date={game.releaseDate} />}
        {/* 원제, 출시일, 나라 — 기획서 히어로의 "한글명, 영문명, 출시일". 나라는 국기 한 장과 이름(2026-09-22) */}
        {(meta.length > 0 || origin || game.companies.length > 0 || game.developer || game.publisher) && (
          // 낱말 사이 세로 막대는 각 낱말의 앞머리(::before)다. 줄이 갈리면 둘째 줄 첫 낱말 앞에 막대가 홀로 남는데,
          // 줄을 왼쪽으로 조금 밀고(-ml) 바깥 상자가 넘친 자리를 자르면(overflow-hidden) 줄 머리의 막대만 잘려 나간다
          <div className="overflow-hidden">
          <p className="-ml-3 flex flex-wrap items-center gap-y-1 text-[13px] text-mut">
            {meta.map((text) => (
              <span key={text} className={META_ITEM}>
                {text}
              </span>
            ))}
            {origin && (
              <span className={META_ITEM}>
                <Flag code={origin.countryCode} />
                {origin.countryNameKo}
              </span>
            )}
            {/* 개발, 배급은 딱지가 아니라 나라 옆 글자 링크다(2026-10-27, 사용자: "배지 형태 말고 그냥 국가 옆에 글자 버튼으로") */}
            {game.companies.map((c) => (
              <span key={`${c.slug}:${c.role}`} className={META_ITEM}>
                <Link href={companyPath(c.slug)} className="text-ink-2 underline-offset-2 transition-colors hover:text-acc hover:underline">
                  <span className="text-dim">{COMPANY_ROLE_LABEL[c.role]}</span> {c.name}
                </Link>
              </span>
            ))}
            {game.companies.length === 0 &&
              [game.developer, game.publisher]
                .filter((v): v is string => Boolean(v))
                .filter((v, i, all) => all.indexOf(v) === i)
                .map((name) => (
                  <span key={name} className={META_ITEM}>
                    {name}
                  </span>
                ))}
          </p>
          </div>
        )}
        {/* 판매 형태(무료 플레이, 앞서 해보기)는 장르가 아니라 카드와 같은 작은 청록 꼬리표로 장르 앞에 선다(2026-10-27, lib/genres) */}
        {(game.genres.length > 0 || game.tags.length > 0) && (
          <ul className="flex flex-wrap items-center gap-1.5" aria-label="장르">
            {game.tags.map((t) => (
              <li key={t}>
                <Tag small tone="info">
                  {t}
                </Tag>
              </li>
            ))}
            {game.genres.map((g) => (
              <li key={g}>
                <Link href={gamesHref({}, { genre: g })} className={GENRE_TAG}>
                  {g}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {game.description && (
          <p className="max-w-[620px] text-[14px] leading-[1.6] text-mut">
            <Clamp lines={3}>{game.description}</Clamp>
          </p>
        )}
        {/* 좁은 화면은 한 기둥이라 높이 맞추기가 필요 없다 — 배지가 커버 밑에 있으면 제목이 한 화면 아래로 밀려 설명 뒤에 둔다 */}
        {(hasPlayModes || game.platforms.length > 0) && <SupportBadges game={game} className="flex md:hidden" />}
      </div>

      <div className="enter-item flex min-w-0 flex-col gap-3 md:col-span-2 lg:col-span-1" style={stagger(2)}>
        {/* 찜과 가격 알림(기획서 v2.0 S-05). 둘 다 비로그인이면 로그인 팝업 뒤 이어서 실행된다(auth/login-gate).
            무료 게임에는 알림을 세우지 않는다 — 0원에는 내려갈 자리가 없다(2026-09-21) */}
        <div className={showAlert ? "grid grid-cols-[minmax(0,160fr)_minmax(0,196fr)] gap-2.5" : "flex"}>
          {showAlert && (
            <PriceAlertButton
              gameId={game.id}
              gameSlug={game.slug}
              gameTitle={title}
              kind={unreleased ? "release" : "price"}
              options={alertOptions}
              variant="secondary"
              label={
                <>
                  <BellIcon size={17} />
                  {D.heroAlert}
                </>
              }
              className="w-full"
            />
          )}
          <WishlistButton gameId={game.id} className="w-full" />
        </div>
        {/* 게시판의 이 게임 글로 가는 길(game-detail/posts-link). 수는 캐시 밖이라 따로 기다린다 — 안 오면 줄 없이 간다 */}
        <Suspense fallback={null}>
          <GamePostsLink gameId={game.id} slug={game.slug} />
        </Suspense>
        <CriticScores game={game} unreleased={unreleased} />
        <PlaytimeTiles playtime={game.playtime} className="flex-1" />
      </div>
    </section>
  );
}

/** 출시 전 게임의 출시일 띠 — 날짜와 남은 날. 원제 줄의 작은 회색 글자로는 "곧 나온다" 가 안 읽혔다(2026-10-28 사용자) */
function ReleaseBanner({ date }: { date: string }) {
  const days = daysUntil(date.slice(0, 10));
  return (
    <p className="inline-flex w-fit flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[var(--radius-md)] bg-acc-soft px-3.5 py-2 text-[14.5px] font-bold text-acc">
      <CalendarIcon size={17} />
      <span>{releaseLineText(formatDate(date), true)}</span>
      {days > 0 && <span className="rounded-full bg-surface px-2 py-0.5 text-[12.5px] font-extrabold tabular-nums text-acc shadow-hair">{D.releaseDday(days)}</span>}
    </p>
  );
}

/** 플레이 방식, 스팀덱, 네이티브 OS, 한국어 배지 줄. 넓은 화면은 커버 판 밑, 좁은 화면은 설명 뒤에 선다(머리 주석) */
function SupportBadges({ game, className }: { game: GameDetail; className?: string }) {
  return (
    <div className={cn("flex-wrap items-center gap-1.5", className)}>
      <MultiplayerBadges
        localMaxPlayers={game.localMaxPlayers}
        onlineMaxPlayers={game.onlineMaxPlayers}
        supportsSolo={game.supportsSolo}
        supportsCoop={game.supportsCoop}
        supportsPvp={game.supportsPvp}
      />
      <PcSupportBadges platforms={game.platforms} />
      <KoreanSupportBadges platforms={game.platforms} />
    </div>
  );
}
