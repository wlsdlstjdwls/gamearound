// 게임 상세 히어로 — 목업 v2.0 S-05 의 위쪽 세 기둥 [큰 커버 | 무슨 게임인가 + 평점 | 알림, 찜 + 플레이타임].
//
// 2026-10-26 개편 전에는 [커버, 제목, 설명 | 오른쪽 sticky 결론 기둥(최저가, 알림, 예측, 점수, 플레이타임)] 두 기둥이었다.
// 목업은 "지금 얼마인가" 를 바로 아래 가격 카드 격자에 맡기고 히어로는 "무슨 게임인가" 와 행동 버튼만 갖는다.
// 최저가 큰 글자를 걷은 대신, 스크롤하면 머리띠(GameHeadbar)가 제목과 최저가를 계속 들고 있다.
//
// 좁은 화면은 한 기둥으로 문서 순서(커버, 정보, 평점, 버튼, 플레이타임) 그대로 쌓는다 — 목업 390px 와 같은 순서다.
// md 는 커버와 정보가 나란히, 오른쪽 기둥은 그 아래 한 줄을 다 쓴다.
import Link from "next/link";
import { CoverImage } from "@/components/game-card";
import { CompanyChips } from "@/components/company-chips";
import { ContentKindHead } from "@/components/content-kind-head";
import { KoreanSupportBadges } from "@/components/korean-support-badges";
import { MultiplayerBadges } from "@/components/multiplayer-badges";
import { PcSupportBadges } from "@/components/pc-support-badges";
import { PriceAlertButton, type AlertPlatformOption } from "@/components/price-alert-button";
import { WishlistButton } from "@/components/wishlist-button";
import { soldBrands } from "@/components/platform-prices";
import { CriticScores, PlaytimeTiles } from "@/components/game-detail/scores";
import { Flag } from "@/components/ui/flag";
import { Clamp } from "@/components/ui/tooltip";
import { BellIcon } from "@/components/ui/icons";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { formatDate } from "@/lib/format";
import { gamesHref } from "@/lib/games-query";
import { releaseLineText } from "@/lib/games/messages";
import { stagger } from "@/lib/motion";
import { originCountry, type GameDetail } from "@/server/services/games";

/** 장르 태그 — 누르면 그 장르로 거른 목록(목업 .gtags 의 data-a="cat"). 칩이 아니라 꼬리표라 작은 알약이다 */
const GENRE_TAG =
  "press inline-flex min-h-[32px] items-center rounded-full bg-surface px-3.5 text-[13px] font-semibold text-ink ring-1 ring-line-strong ring-inset transition-colors duration-base hover:text-acc hover:ring-acc";

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
  const meta = [game.titleKo ? game.titleEn : null, game.releaseDate ? releaseLineText(formatDate(game.releaseDate), unreleased) : null].filter(
    (v): v is string => Boolean(v),
  );

  return (
    <section className="grid gap-x-8 gap-y-5 md:grid-cols-2 lg:grid-cols-[minmax(0,420fr)_minmax(0,420fr)_minmax(0,368fr)] lg:gap-x-10">
      {/* 커버 — 흰 판 위에 한 장(목업 .artc). 가로 아트를 먼저 쓴다: 이 칸은 가로가 긴 상자라 세로 아트를 넣으면
          위아래가 반 넘게 잘린다. 가로 아트가 없는 게임만 세로 아트를 가운데 띠로 보여 준다 */}
      <div className="enter-item flex rounded-[var(--radius-panel)] bg-surface p-2.5 shadow-[var(--elev-card)] sm:p-3" style={stagger(0)}>
        <div className="cover-elev relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-cover-lg)] bg-surface-3 md:aspect-auto md:min-h-[250px]">
          <CoverImage src={game.coverUrl ?? game.portraitUrl} alt={`${title} 커버`} sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 420px" priority />
        </div>
      </div>

      <div className="enter-item flex min-w-0 flex-col gap-3" style={stagger(1)}>
        {/* 지원 플랫폼 이름 줄(목업 .plats). 누르면 그 플랫폼 카드로 내려간다 — 목업은 카드를 고르는 동작이다 */}
        {brands.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-bold tracking-[0.06em] text-ink-2">
            {brands.map((b, i) => (
              <span key={b.key} className="inline-flex items-center gap-x-2">
                {i > 0 && <span aria-hidden className="font-normal text-dim-2">|</span>}
                <a href={`#${b.anchor}`} className="transition-colors hover:text-acc">
                  {b.label}
                </a>
              </span>
            ))}
          </p>
        )}
        {/* 자식(DLC, 에디션)일 때만 선다 */}
        <ContentKindHead contentType={game.contentType} parent={game.parent} />
        <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-[-0.035em] text-ink sm:text-[34px] lg:text-[38px]">{title}</h1>
        {/* 원제, 출시일, 나라 — 기획서 히어로의 "한글명, 영문명, 출시일". 나라는 국기 한 장과 이름(2026-09-22) */}
        {(meta.length > 0 || origin) && (
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-mut">
            {meta.map((text, i) => (
              <span key={text} className="inline-flex items-center gap-x-1.5">
                {i > 0 && <span className="text-dim-2">|</span>}
                {text}
              </span>
            ))}
            {origin && (
              <span className="inline-flex items-center gap-x-1.5">
                {meta.length > 0 && <span className="text-dim-2">|</span>}
                <Flag code={origin.countryCode} />
                {origin.countryNameKo}
              </span>
            )}
          </p>
        )}
        {game.genres.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="장르">
            {game.genres.map((g) => (
              <li key={g}>
                <Link href={gamesHref({}, { genre: g })} className={GENRE_TAG}>
                  {g}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {/* 개발사, 배급사 — 기획서 히어로 항목. 장르는 위 태그가 말하므로 넘기지 않는다 */}
        <CompanyChips companies={game.companies} developer={game.developer} publisher={game.publisher} />
        {game.description && (
          <p className="max-w-[620px] text-[14px] leading-[1.6] text-mut">
            <Clamp lines={3}>{game.description}</Clamp>
          </p>
        )}
        {/* 플레이 방식, 스팀덱, 네이티브 OS, 한국어 — 목업에는 없지만 이 서비스가 모은 "내 조건에 맞나" 값이라 남긴다.
            설명 바로 아래, 평점 위에 한 줄로 둔다(예전 결론 기둥에서 옮겼다) */}
        {(hasPlayModes || game.platforms.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
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
        )}
        <div className="mt-auto pt-2">
          <CriticScores game={game} unreleased={unreleased} />
        </div>
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
        <PlaytimeTiles playtime={game.playtime} className="flex-1" />
      </div>
    </section>
  );
}
