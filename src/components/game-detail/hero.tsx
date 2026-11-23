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
import { CoverImage } from "@/components/game-card";
import { daysUntil, InfoCard } from "@/components/game-detail/info-card";
import { ContentKindBadge, ParentGameLink } from "@/components/content-kind-head";
import { KoreanSupportBadges } from "@/components/korean-support-badges";
import { MultiplayerBadges } from "@/components/multiplayer-badges";
import { PcSupportBadges } from "@/components/pc-support-badges";
import { PriceAlertButton, type AlertPlatformOption } from "@/components/price-alert-button";
import { WishlistButton } from "@/components/wishlist-button";
import { CriticScores, PlaytimeTiles } from "@/components/game-detail/scores";
import { Flag } from "@/components/ui/flag";
import { Tag } from "@/components/ui/tag";
import { genreTagLabel } from "@/lib/genres";
import { FitClamp } from "@/components/ui/fit-clamp";
import { FactEmpty, FactRow } from "@/components/ui/fact-row";
import { BellIcon } from "@/components/ui/icons";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { formatDate } from "@/lib/format";
import { normalizeForSearch } from "@/lib/slug";
import { gamesHref } from "@/lib/games-query";
import { FACT_ROW_LABEL, releaseLineText } from "@/lib/games/messages";
import { PreorderMark } from "@/components/ui/preorder-mark";
import { isPreorder } from "@/lib/games/preorder";
import { stagger } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { originCountry, type GameDetail } from "@/server/services/games";

/** 장르 줄의 장르 이름 — 누르면 그 장르로 거른 목록. 사실 줄 안이라 알약 대신 글자 링크이고, 손이 닿으면 밑줄이 선다 */
const GENRE_LINK = "font-semibold text-ink-2 underline decoration-ink-2/40 underline-offset-4 transition-colors duration-fast hover:text-ink hover:decoration-ink";
/** 원제, 출시일, 나라, 개발, 배급 한 줄의 낱말. 앞머리 막대는 줄 머리에서 잘린다(쓰는 자리 주석) */

const META_ITEM = "relative inline-flex items-center gap-x-1.5 pl-3 pr-1.5 before:absolute before:left-[3px] before:text-dim-2 before:content-['|']";

/** 설명이 자리가 모자라도 보이는 줄 수(좁은 화면은 늘 이만큼) */
const DESCRIPTION_MIN_LINES = 3;
/** 설명을 남는 높이까지 펴는 폭 — 히어로 기둥이 나란히 서는 md(768) 부터 */
const DESCRIPTION_FIT_QUERY = "(min-width: 768px)";

/** 출시일이 오늘(한국 날짜)인가 */
function isReleaseToday(date: string | null): boolean {
  return date !== null && daysUntil(date.slice(0, 10)) === 0;
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
  const showAlert = !isFree && alertOptions.length > 0;
  const preorder = game.platforms.some((p) => isPreorder(p));
  // 출시일 카드는 출시 당일까지 선다(2026-11-19 사용자) — 당일에는 "오늘" 을 띄운다. unreleased(오늘보다 뒤)로 가르면 그날 카드가 사라져
  // 제목 밑 날짜 글자만 남았다. 알림 종류, 가격 칸 같은 다른 판정은 그대로 unreleased 를 쓴다(당일은 이미 판다)
  const releaseCard = unreleased || isReleaseToday(game.releaseDate);
  // 출시일 카드가 서면 날짜는 그 카드가 말한다 — 같은 날짜를 두 번 쓰지 않는다
  // 원제는 보이는 제목과 다를 때만 — 한글 제목 칸에 영문 제목이 그대로 든 게임(GTA VI 등)은 같은 이름이 제목 밑에 또 섰다(2026-11-20 사용자 점검)
  const originalTitle = game.titleKo && game.titleEn && normalizeForSearch(game.titleEn) !== normalizeForSearch(title) ? game.titleEn : null;
  const meta = [originalTitle, game.releaseDate && !releaseCard ? releaseLineText(formatDate(game.releaseDate), false) : null].filter(
    (v): v is string => Boolean(v),
  );

  return (
    <section className="grid gap-x-8 gap-y-5 md:grid-cols-2 lg:grid-cols-[minmax(0,380fr)_minmax(0,470fr)_minmax(0,330fr)] lg:gap-x-8">
      {/* 커버 — 흰 판 위에 한 장(목업 .artc). 가로 아트를 먼저 쓴다: 이 칸은 가로가 긴 상자라 세로 아트를 넣으면
          위아래가 반 넘게 잘린다. 가로 아트가 없는 게임만 세로 아트를 가운데 띠로 보여 준다 */}
      {/* 휴대폰(md 아래)에서는 흰 판을 걷는다(2026-11-20 사용자 점검 "그림 테두리가 두 겹") — 그 폭에서는 판 안에 배지가 없어(md:flex)
          판이 그림 둘레 10px 흰 테 하나뿐이었고, 그림의 그림자(cover-elev)와 판의 그림자가 두 겹 테두리로 보였다 */}
      {/* 세 기둥 바닥 맞추기(2026-11-23 사용자 "서로 높이가 안 맞아 안정감이 없다"). 처음엔 커버 판과 오른쪽 마지막 판을 가운데 높이까지 늘였는데
          "늘린 데가 비어서 보기 싫다" 해 거꾸로 했다 — 양옆은 제 높이 그대로, **가운데 기둥이 그 높이에 맞춰 설명을 줄인다**(아래 가운데 기둥 주석) */}
      {/* 넓은 화면(lg)에서는 커버 판도 줄 높이까지 선다(2026-11-23 사용자 "왼쪽, 가운데, 오른쪽 높이가 안 맞는다"). 보통은 이 판이 가장 길어 늘어날 일이 없고,
          DLC 처럼 제목이 두 줄에 본편 줄까지 붙어 가운데가 더 길 때만 늘어난다 — 그때 남는 높이는 그림과 사실 줄 사이로 가고 사실 줄은 판 바닥에 붙는다 */}
      <div className="enter-item flex flex-col gap-2.5 self-start max-md:w-full md:rounded-[var(--radius-panel)] md:bg-surface md:p-3 md:shadow-[var(--elev-card)] lg:self-stretch lg:justify-between" style={stagger(0)}>
        <div className="cover-elev relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-cover-lg)] bg-surface-3">
          <CoverImage src={game.coverUrl ?? game.portraitUrl} alt={`${title} 커버`} sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 420px" priority />
          {/* 자식(DLC, 에디션)이면 커버 왼쪽 위에 종류 딱지(content-kind-head) */}
          <ContentKindBadge contentType={game.contentType} className="absolute left-2.5 top-2.5" />
        </div>
        {/* 정보 출처 줄은 걷었다(2026-11-16 피드백 v11 "목업은 정보 출처 없음", "더 컴팩트하게"). 부품(game-detail/sources)은 남겨 둔다 */}
        {/* 플레이 방식, 스팀덱, 네이티브 OS, 한국어 — 목업에는 없지만 이 서비스가 모은 "내 조건에 맞나" 값이라 남긴다.
            커버 판 안 맨 밑에 둔다(머리 주석의 높이 맞추기) */}
        <SupportBadges game={game} className="hidden border-t border-line px-0.5 pt-2.5 md:flex" />
      </div>

      {/* 가운데 기둥은 줄 높이를 정할 때 설명을 세 줄로만 친다(설명 상자의 h-0 + min-h 세 줄). 줄 높이는 세 기둥 중 가장 큰 값이고,
          설명은 남는 높이만큼 편다(FitClamp). 처음엔 기둥 통째로 h-0 을 줬다가 설명이 한두 줄 높이로 눌려 점수 칸을 덮었다(2026-11-23 사용자 "겹친다") */}
      <div className="enter-item flex min-w-0 flex-col gap-3" style={stagger(1)}>
        {/* 제목 위 플랫폼 이름 배지(Steam, PlayStation, Xbox)는 걷었다(2026-11-23 사용자 "상세 상단에 표기는 없애자") — 바로 아래 가격 카드가 같은 이름을 다 단다.
            예약 구매 표시만 남긴다: 어느 카드에도 없는 "지금 예약 중" 이라는 말이다 */}
        {preorder && (
          <div>
            <PreorderMark size="md" />
          </div>
        )}
        <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-[-0.035em] text-ink sm:text-[34px] lg:text-[38px]">{title}</h1>
        {/* 원제, 출시일, 나라 — 기획서 히어로의 "한글명, 영문명, 출시일". 나라는 국기 한 장과 이름(2026-09-22) */}
        {(meta.length > 0 || origin) && (
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
          </p>
          </div>
        )}
        {/* 장르와 판매 형태 꼬리표는 왼쪽 사실 줄(SupportBadges)의 "장르" 줄로 옮겼다(2026-11-23 사용자 "장르도 왼쪽 영역에") */}
        {/* 설명은 옆 기둥(커버, 평점) 높이까지 남는 자리를 다 쓰고, 그래도 넘칠 때만 자른다(2026-11-11 사용자 "자리 충분한데 다 안 나온다", ui/fit-clamp).
            기둥이 나란히 서는 md 부터다. 좁은 화면은 한 기둥이라 남는 높이가 없어 세 줄 그대로다. min-h 는 세 줄(14px x 1.6 x 3) — 그보다 좁으면 줄이 기둥을 민다 */}
        {game.description && (
          <FitClamp
            minLines={DESCRIPTION_MIN_LINES}
            fitQuery={DESCRIPTION_FIT_QUERY}
            boxClassName="min-h-[4.8em] text-[14px] md:h-0 md:flex-1"
            className="max-w-[620px] text-[14px] leading-[1.6] text-mut"
            more={{ title }}
          >
            {game.description}
          </FitClamp>
        )}
        {/* 평론 점수 셋 — 설명 바로 아래 한 줄(피드백 v11 목업: "CRITIC SCORES" 이름표 + 칸 셋). 칸 안은 로고와 이름이 윗줄, 점수가 아랫줄이라
            가운데 기둥 폭에서도 숫자가 크게 선다(2026-11-16 사용자 "점수 영역이 너무 좁다") */}
        {/* 본편으로 가는 줄은 설명 바로 밑(content-kind-head, 2026-11-23 사용자 "본편 이동 버튼을 설명 아래에"). 짧은 설명이 남긴 빈자리를 채우고,
            커버 밑이나 오른쪽 기둥 맨 위처럼 한 기둥만 길어지게 하지 않는다 — 가운데 기둥은 설명이 줄어 높이를 맞춘다 */}
        <ParentGameLink parent={game.parent} />
        <CriticScores game={game} />
        {/* 좁은 화면은 한 기둥이라 높이 맞추기가 필요 없다 — 배지가 커버 밑에 있으면 제목이 한 화면 아래로 밀려 설명 뒤에 둔다 */}
        <SupportBadges game={game} className="flex md:hidden" />
      </div>

      {/* 넓은 화면(lg)에서는 줄 높이까지 서고 판 사이 틈을 고르게 벌려 마지막 판 바닥을 옆 두 기둥 바닥에 맞춘다(2026-11-23 사용자 "세 영역 밑이 줄이 맞았으면").
          판을 늘이지 않는다 — 늘린 판 안이 비는 것을 사용자가 싫어했다(위 머리 주석) */}
      <div className="enter-item flex min-w-0 flex-col gap-3 self-start md:col-span-2 lg:col-span-1 lg:self-stretch lg:justify-between" style={stagger(2)}>
        {/* 찜과 가격 알림(기획서 v2.0 S-05). 둘 다 비로그인이면 로그인 팝업 뒤 이어서 실행된다(auth/login-gate).
            무료 게임에는 알림을 세우지 않는다 — 0원에는 내려갈 자리가 없다(2026-09-21) */}
        {/* 두 단추는 같은 폭, 같은 크기(button 의 pair)다(2026-11-20 사용자 "두 개의 버튼 크기도 좀 다른 것 같음"). 전에는 160:196 으로 찜하기가 넓었다 */}
        <div className={showAlert ? "grid grid-cols-2 gap-2.5" : "flex"}>
          {showAlert && (
            <PriceAlertButton
              gameId={game.id}
              gameSlug={game.slug}
              gameTitle={title}
              kind={unreleased ? "release" : "price"}
              options={alertOptions}
              variant="secondary"
              size="pair"
              stateful
              label={
                <>
                  {/* 단추 칸이 좁아 글자가 길면 flex 가 아이콘을 눌러 작게 만든다(2026-11-16 사용자) — 아이콘은 줄지 않게 둔다 */}
                  <BellIcon size={17} className="shrink-0" />
                  {D.heroAlert}
                </>
              }
              className="w-full"
            />
          )}
          <WishlistButton gameId={game.id} className="w-full" />
        </div>
        {/* "이 게임 리뷰와 공략 보기" 단추는 걷었다(2026-11-16 사용자, 게임 게시판 메뉴를 걷은 것과 같은 날). 부품(posts-link)은 남겨 둔다 */}
        {/* 늘리지 않는다 — 옆 기둥 높이까지 늘였더니 숫자 셋 위아래가 텅 빈 판이 됐다(2026-11-16 사용자 "플레이타임 높이가 너무 높다") */}
        <PlaytimeTiles playtime={game.playtime} />
        {/* 출시일(출시 전만)과 개발, 배급을 플레이타임 아래 한 판에 모은다(2026-11-16 사용자 "플레이타임 아래, 영역 아예 만들어서",
            "개발, 배급도 오른쪽으로, 밑줄도"). 제목 밑에 두면 가운데 기둥이 늘었다. 판을 둘로 세웠더니 오른쪽 기둥이 가운데보다 길어져
            가운데에 빈 틈이 생겨 제목 없는 한 판으로 줄였다 — 줄 머리(출시, 개발, 배급)가 곧 이름이다 */}
        <InfoCard game={game} showRelease={releaseCard} />
      </div>
    </section>
  );
}

/** 플레이 방식, 스팀덱, 네이티브 OS, 한국어 배지 줄. 넓은 화면은 커버 판 밑, 좁은 화면은 설명 뒤에 선다(머리 주석) */
function SupportBadges({ game, className }: { game: GameDetail; className?: string }) {
  return (
    // 사실 줄 셋(플레이, PC, 한국어)을 이름표 + 값으로 세로로 쌓는다(ui/fact-row) — 장르 알약과 같은 꼴이면 한 덩어리로 읽혔다
    <dl className={cn("flex-col gap-1", className)}>
      {/* 네 줄은 값이 없어도 늘 선다(2026-11-23 사용자 "값이 없어도 항상 노출, - 로", ui/fact-row) */}
      <FactRow label={FACT_ROW_LABEL.genre}>
          {game.genres.length === 0 && game.tags.length === 0 && <FactEmpty />}
          {/* 판매 형태(무료 플레이, 얼리 액세스, lib/genres 의 genreTagLabel)는 장르가 아니라 작은 청록 꼬리표로 장르 앞에 선다(2026-10-27) */}
          {game.tags.map((t) => (
            <Tag key={t} small tone="info">
              {genreTagLabel(t)}
            </Tag>
          ))}
          {game.genres.map((g) => (
            <Link key={g} href={gamesHref({}, { genre: g })} className={GENRE_LINK}>
              {g}
            </Link>
          ))}
      </FactRow>
      <MultiplayerBadges
        localMaxPlayers={game.localMaxPlayers}
        onlineMaxPlayers={game.onlineMaxPlayers}
        supportsSolo={game.supportsSolo}
        supportsCoop={game.supportsCoop}
        supportsPvp={game.supportsPvp}
      />
      <PcSupportBadges platforms={game.platforms} />
      <KoreanSupportBadges platforms={game.platforms} />
    </dl>
  );
}
