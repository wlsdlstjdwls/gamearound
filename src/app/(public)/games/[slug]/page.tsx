// 게임 상세 — 결론 → 근거 순 (§5.1). 데이터는 tag 캐시(getGameBySlugCached), 로그인 의존 데이터(찜 여부)는 캐시 밖에서 조회
import { formatPrice } from "@/lib/currency";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverImage, DiscountStamp } from "@/components/game-card";
import { CompanyChips } from "@/components/company-chips";
import { SaleBadge } from "@/components/sale-badge";
import { ContentKindHead } from "@/components/content-kind-head";
import { DlcSection } from "@/components/dlc-list";
import { UpgradeNotes } from "@/components/upgrade-note";
import { MultiplayerBadges } from "@/components/multiplayer-badges";
import { PcSupportBadges } from "@/components/pc-support-badges";
import { NewsList } from "@/components/news-list";
import { PatchList, PatchSpeed } from "@/components/patch-list";
import { Sheet } from "@/components/ui/sheet";
import { PlatformPrices, type PlatformPriceItem } from "@/components/platform-prices";
import { PlaytimeCard } from "@/components/playtime-card";
import { CompatSection } from "@/components/compat-section";
import { RequirementsSection } from "@/components/requirements-table";
import { WishlistButton } from "@/components/wishlist-button";
import { BackLink } from "@/components/ui/back-link";
import { buttonClass } from "@/components/ui/button";
import { Page, SectionHead } from "@/components/ui/page";
import { SellersSection } from "@/components/shops/sellers-section";
import { listSellersForGame } from "@/server/services/listings";
import { SELLING_MESSAGES } from "@/lib/shops/listing-messages";
import { formatDate, formatHours, PLATFORM_LABEL } from "@/lib/format";
import { userScoreNoteText, userScoreValueText } from "@/lib/user-score";
import { SITE } from "@/lib/site";
import { getFreshness } from "@/lib/freshness";
import { GAME_MESSAGES } from "@/lib/games/messages";
import { stagger } from "@/lib/motion";
import { gamePricesPath, ROUTES } from "@/lib/routes";
import {
  bestScore,
  bestUserScore,
  cheapestPlatform,
  displayTitle,
  getGameBySlugCached,
  getGamePatchesCached,
  getPricePerHourScale,
  latestPatches,
  type GameDetail,
} from "@/server/services/games";
import { getRecordedLow, type RecordedLow } from "@/server/services/prices";
import { getCurrentUser } from "@/server/services/users";
import { listMyDevices } from "@/server/services/devices";
import { isInWishlist } from "@/server/services/wishlist";
import { decodeSlugParam } from "@/lib/slug";

/** 검색결과, SNS 카드에 들어가는 설명 길이 상한 */
const META_DESCRIPTION_MAX = 150;

/**
 * 시트에 담을 패치 기록 수.
 *
 * 전용 화면(/patches)을 걷어내고 시트로 합쳤다(2026-09-15). 패치를 보려고 화면을 옮기면
 * 가격과 플레이타임을 두고 떠나야 했는데, 이 기록은 그것들과 나란히 읽어야 뜻이 있다.
 * 50 은 상한일 뿐이다 — 스토어가 최근 기록만 돌려줘서 실제로는 게임당 훨씬 적다.
 */
const SHEET_PATCH_LIMIT = 50;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeSlugParam((await params).slug);
  const game = await getGameBySlugCached(slug);
  if (!game) return { title: "게임을 찾을 수 없음" };
  const title = displayTitle(game);
  const description =
    game.description?.slice(0, META_DESCRIPTION_MAX) ??
    `${title}의 플랫폼별 가격, 할인, 플레이타임, 평점, 뉴스를 ${SITE.name}에서 확인하세요.`;
  return {
    title,
    description,
    // openGraph.images 는 opengraph-image.tsx 가 자동으로 채운다 — 여기서 커버를 지정하면 그걸 덮어쓴다
    openGraph: { title, description },
  };
}

type StatCellProps = { label: string; value: string; note?: string };

/**
 * 오른쪽 기둥의 값 한 칸 — 라벨 위, 큰 숫자 아래, 근거 한 줄.
 * 격자 칸을 세로선으로 가르지 않는다(2026-09-21 리디자인): 칸 수가 둘일 때와 넷일 때
 * 선의 개수가 달라져 같은 표가 게임마다 다르게 보였다. 가르는 일은 여백이 한다.
 */
function StatCell({ label, value, note }: StatCellProps) {
  return (
    <div>
      <dt className="text-[12px] text-dim">{label}</dt>
      <dd className="mt-1 text-[20px] font-extrabold tracking-[-0.03em] text-ink sm:text-[22px]">{value}</dd>
      {note && <dd className="mt-0.5 text-[11.5px] leading-[1.5] text-mut">{note}</dd>}
    </div>
  );
}

/**
 * 결론 블록 — "지금 얼마인가" 하나에만 답한다.
 *
 * 화면에서 가장 큰 글자가 이 값이어야 한다(2026-09-21 리디자인). 전에는 최저가가 요약 바의
 * 여러 칸 중 하나였고, 평점, 출시일과 같은 20px 였다. 그래서 이 화면에 들어와 처음 묻는 질문의
 * 답이 다른 값들 사이에 묻혀 있었다. 나머지 값은 아래 StatGrid 가 받는다.
 */
function PriceHeadline({ game, recordedLow }: { game: GameDetail; recordedLow: RecordedLow | null }) {
  const best = cheapestPlatform(game.platforms);
  const hasDiscount = Boolean(best?.discountPct && best.discountPct > 0);

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[12px] text-dim">
        {["지금 최저가", best ? PLATFORM_LABEL[best.platform] ?? best.platform : null].filter(Boolean).join(" | ")}
      </p>
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-[34px] font-extrabold leading-none tracking-[-0.045em] text-ink sm:text-[44px]">
          {best ? formatPrice(best.currentPrice, best.currency) : "-"}
        </span>
        {hasDiscount && best?.listPrice != null && (
          <span className="text-[14px] text-dim-2 line-through">{formatPrice(best.listPrice, best.currency)}</span>
        )}
      </p>
      {/* 행사명과 남은 기간. 임박하면 점이 숨 쉰다 — 이 화면에서 빨강을 쓰는 유일한 자리다 */}
      {best && hasDiscount && (
        <SaleBadge discountName={best.discountName} discountEndsAt={best.discountEndsAt} discountStartsAt={best.discountStartsAt} variant="full" />
      )}
      {/*
       * 기록상 최저가. **지금보다 쌌던 적이 있을 때만** 선다 — 없으면 줄 자체를 세우지 않는다.
       *
       * "최저가 = 현재가" 를 적지 않는 이유는 그게 거짓이어서가 아니라, 우리가 열흘밖에 안 봤다는
       * 사실이 화면에 없어서다. 읽는 사람은 그 줄을 "지금이 제일 싸다" 로 읽는다(services/prices 주석).
       */}
      {recordedLow && (
        <p className="text-[12.5px] text-mut">
          {GAME_MESSAGES.recordedLowLabel} {formatPrice(recordedLow.price, recordedLow.currency)} |{" "}
          {GAME_MESSAGES.recordedLowNote(formatPrice(recordedLow.gap, recordedLow.currency), formatDate(recordedLow.at))}
        </p>
      )}
    </div>
  );
}

/**
 * 값 표 — 출시일, 플레이타임, 평점.
 *
 * 모르는 값의 칸은 아예 세우지 않는다(2026-09-15). 전에는 칸을 늘 그리고 값이 없으면 "-" 를 넣었는데,
 * 카탈로그 대부분이 플레이타임과 평점을 아직 안 갖고 있어서 화면에서 가장 큰 자리가 줄줄이 "-" 였다.
 * 그건 "아직 모은다" 가 아니라 "고장 났다" 로 읽힌다. 아는 게 값뿐이면 한 줄로 그 사실을 말한다 —
 * 모르는 것을 네 번 반복하는 것보다 한 번 적는 편이 짧고 정직하다.
 */
function StatGrid({ game }: { game: GameDetail }) {
  const score = bestScore(game.platforms);
  const user = bestUserScore(game.platforms);
  const main = game.playtime?.mainStoryHours;
  const cells: StatCellProps[] = [];

  // 출시일은 게임 단위 값이다(dto 의 releaseDate 주석) — 플랫폼 탭마다 다른 값을 보여 주면
  // PlayStation 탭에서만 빈칸이 된다. 여기서는 어느 탭을 보든 같은 한 값을 말한다
  if (game.releaseDate) cells.push({ label: "출시일", value: formatDate(game.releaseDate) });
  // 완전 정복 시간을 여기 붙이지 않는 이유(2026-09-15): 같은 화면의 플레이타임 칸이 3종을 막대까지 붙여 말한다
  if (main) cells.push({ label: "메인 스토리", value: formatHours(main) });
  if (score) cells.push({ label: "평론가 평점", value: String(score.value), note: score.note ?? undefined });
  // 유저 점수를 평론가 점수 옆에 따로 세우는 이유: 두 값이 갈리는 게임이 있고, 그 사실 자체가
  // 살지 말지를 정하는 정보다. 하나로 합치면 그 갈림이 사라진다
  if (user) {
    cells.push({
      label: "유저 점수",
      value: userScoreValueText(user.score.value, user.score.kind),
      note: `${PLATFORM_LABEL[user.platform] ?? user.platform} | ${userScoreNoteText(user.score.kind, user.score.count)}`,
    });
  }

  if (cells.length === 0) {
    return <p className="border-t border-line pt-5 text-[12.5px] leading-[1.6] text-dim">{GAME_MESSAGES.summaryPending}</p>;
  }
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-[18px] border-t border-line pt-5">
      {cells.map((c) => (
        <StatCell key={c.label} {...c} />
      ))}
    </dl>
  );
}

/**
 * 찜 버튼 자리. 이것만 로그인 상태에 매달려 있다.
 *
 * 왜 따로 떼어 Suspense 로 감쌌나(2026-09-15): 세션 조회와 찜 여부는 각각 Neon 왕복 한 번씩이고
 * (실측 220ms), 둘은 서로를 참조해서 줄을 설 수밖에 없다. 그 440ms 를 페이지 본문이 기다리면
 * 가격도 뉴스도 "내가 이 게임을 찜했는지" 를 기다리는 꼴이 된다. 본문을 먼저 흘려보내고
 * 이 버튼만 늦게 앉힌다 — 자리는 폴백이 미리 잡아 두므로 늦게 와도 화면이 밀리지 않는다.
 */
async function WishlistSlot({ gameId }: { gameId: string }) {
  const user = await getCurrentUser();
  const wished = user ? await isInWishlist(gameId) : false;
  return <WishlistButton gameId={gameId} wished={wished} signedIn={Boolean(user)} />;
}

/**
 * 판정 칸. 찜 버튼과 같은 이유로 따로 떼어 Suspense 로 감쌌다 — 등록된 기기는 로그인에 매달린
 * 값이라, 본문이 세션 조회(실측 220ms)를 기다릴 이유가 없다.
 * 비회원은 devices 가 빈 배열이고, 그때 기기는 브라우저에서 읽는다(compat-section).
 */
async function CompatSlot({ groups, platforms }: { groups: GameDetail["requirements"]; platforms: GameDetail["platforms"] }) {
  const user = await getCurrentUser();
  const devices = user ? await listMyDevices() : [];
  return (
    <CompatSection
      groups={groups}
      devices={devices.map((d) => ({ ...d, id: d.id, label: d.label }))}
      platforms={platforms}
    />
  );
}

/**
 * "파는 곳" 칸. 상세 본문(getGameBySlugCached)과 **같이 캐시하지 않는다** —
 * 매장 재고는 크롤이 아니라 매장주가 손으로 바꾸는 값이라, 게임 태그를 밀어 주는 사람이 없다.
 * 상세 캐시에 얹으면 매장이 값을 고쳐도 게임 화면은 한 시간 뒤에나 따라온다.
 *
 * 그래서 Suspense 안에서 따로 받는다. 찜 버튼과 같은 자리이고, 본문이 이 질의를 기다리지 않는다.
 */
async function SellersSlot({ gameId }: { gameId: string }) {
  const sellers = await listSellersForGame(gameId);
  // 파는 곳이 없으면 칸을 아예 안 그린다 — 근거는 SellersSection 머리 주석
  if (sellers.length === 0) return null;
  return (
    <section aria-labelledby="sellers-heading" className="flex flex-col gap-3">
      <SectionHead id="sellers-heading" title={SELLING_MESSAGES.title} note={SELLING_MESSAGES.lead} />
      <SellersSection sellers={sellers} />
    </section>
  );
}

/** 아직 오지 않은 찜 버튼의 자리. 같은 크기여야 도착할 때 옆 버튼이 밀리지 않는다 */
function WishlistSlotFallback() {
  return (
    <span aria-hidden className={buttonClass({ variant: "secondary", size: "lg", className: "pointer-events-none opacity-60" })}>
      위시리스트
    </span>
  );
}

export default async function GameDetailPage({ params }: Props) {
  const slug = decodeSlugParam((await params).slug);

  /*
   * 한 번에 던진다. 전에는 다섯 개를 줄 세워 await 했다 —
   * 상세 → 세션 → 찜 여부 → 패치 → 눈금 순으로, 앞이 끝나야 뒤가 나갔다.
   * 질의 자체는 DB 에서 10~20ms 인데 Neon(us-east-1) 왕복이 한 번에 200ms 대다(list.ts 주석).
   * 그래서 이 화면의 서버 시간은 거의 전부 "기다림" 이었다 — 실측 1,547ms(2026-09-15, 로컬 prod, 콜드).
   * 셋은 서로를 참조하지 않으므로 같이 나간다.
   *
   * 세션과 찜 여부는 여기서 기다리지 않는다 — WishlistSlot 이 Suspense 안에서 따로 받아 온다(아래 주석).
   */
  const [game, patchGroups, perHourScale, recordedLow] = await Promise.all([
    getGameBySlugCached(slug),
    // 패치 기록은 상세 조회와 같은 태그(`game:<slug>`)로 따로 캐시된다 — 붙는 테이블이 game_platforms 라
    // 상세 질의에 얹으면 화면이 안 쓰는 행까지 통째로 끌려온다
    getGamePatchesCached(slug),
    // 시간당 가격을 세울 눈금 - 이 게임이 아니라 카탈로그의 성질이라 게임 태그와 따로 캐시된다
    getPricePerHourScale(),
    // 기록상 최저가. 지금보다 쌌던 적이 있을 때만 값이 온다(services/prices 의 getRecordedLow 주석)
    getRecordedLow(slug),
  ]);
  if (!game) notFound();

  const title = displayTitle(game);
  const platforms: PlatformPriceItem[] = game.platforms.map((p) => ({
    ...p,
    freshness: getFreshness(p.lastSyncedAt, p.syncStatus),
  }));
  const best = cheapestPlatform(game.platforms);
  // 어느 한 플랫폼이라도 "추가 콘텐츠 있음"이라고 했으면 DLC 블록을 띄운다.
  // 목록이 비어 있어도 그 사실 자체가 사용자에게 쓸모 있는 정보다.
  const hasAddOns = game.platforms.some((p) => p.hasAddOns === true);
  // 플레이 방식 칩이 하나라도 서는지 — 장르와 사이의 구분선을 그릴지 정한다
  const hasPlayModes =
    game.supportsSolo ||
    game.supportsCoop ||
    game.supportsPvp ||
    Boolean(game.localMaxPlayers) ||
    Boolean(game.onlineMaxPlayers);

  return (
    <Page pad="detail" gap={44}>
      <BackLink href={ROUTES.game}>게임 목록으로</BackLink>

      {/* 섹션 1 — 헤더 블록. 왼쪽은 "무슨 게임인가", 오른쪽은 "지금 사도 되나" 다.
          오른쪽 기둥은 스크롤을 따라온다 — 아래 가격표와 사양을 읽는 동안에도 결론이 화면에 남아야 한다.
          안쪽 조각마다 .enter-item 을 붙이는 이유: 헤더는 300px 넘는 덩어리라 통째로 페이드하면
          화면이 한 번에 툭 던져진다. 커버, 제목, 요약, 장르, 설명 순으로 들어와야 목록 화면과 결이 같다.
          (조각이 하나라도 .enter-item 이면 감싼 section 은 애니메이션에서 빠진다 — 겹쳐 페이드 방지) */}
      <section className="grid items-start gap-x-9 gap-y-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.72fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* 커버는 스탬프가 모서리 밖으로 나가므로 relative 상자와 overflow 상자를 갈라 둔다(game-card 와 같은 규칙) */}
          <div className="enter-item relative" style={stagger(0)}>
            <div
              className={`relative w-full overflow-hidden rounded-[var(--radius-cover-lg)] bg-surface-3 ${
                // 세로 아트는 원본 비율에 맞춰 칸을 가른다 — 세로 아트를 가로 배너 칸에 넣으면 위아래가 잘려
                // 로고가 사라지고, 가로 배너를 세로 칸에 넣으면 좌우가 잘린다.
                // 4:3 은 세로 아트를 반 정도만 보여 주되 인물과 로고가 모이는 가운데 띠를 남기는 선이다
                game.portraitUrl ? "aspect-[4/3] sm:aspect-[3/4] sm:max-w-[300px]" : "aspect-[460/215]"
              }`}
            >
              <CoverImage
                src={game.portraitUrl ?? game.coverUrl}
                alt={`${title} 커버`}
                sizes="(max-width: 1023px) 100vw, 640px"
                priority
              />
            </div>
            {/* 이 화면에서 면과 색을 가진 것은 이 도장 하나다 */}
            {best && <DiscountStamp pct={best.discountPct} size="hero" />}
          </div>

          <div className="enter-item flex flex-col gap-2.5 pt-2.5" style={stagger(1)}>
            {/* 자식(DLC, 에디션)일 때만 선다 - 본편 화면에서는 아무것도 그리지 않는다 */}
            <ContentKindHead contentType={game.contentType} parent={game.parent} />
            <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.045em] text-ink sm:text-[40px] sm:leading-[1.08]">{title}</h1>
            <p className="text-[13.5px] text-mut">
              {[game.titleKo ? game.titleEn : null, game.releaseDate ? `${formatDate(game.releaseDate)} 출시` : null, game.genres.join(", ") || null]
                .filter(Boolean)
                .join(" | ")}
            </p>
            <CompanyChips companies={game.companies} developer={game.developer} publisher={game.publisher} />
          </div>

          {game.description && (
            <p className="enter-item max-w-[620px] text-[14px] leading-[1.8] text-mut" style={stagger(2)}>
              {game.description}
            </p>
          )}

          {/* 플레이 방식, 스팀덱 등급, 네이티브 OS — 장르와 달리 "어떻게 즐기나" 를 말하는 값이라 한 줄에 모인다 */}
          {(hasPlayModes || game.platforms.length > 0) && (
            <div className="enter-item flex flex-wrap items-center gap-1.5" style={stagger(3)}>
              <MultiplayerBadges
                localMaxPlayers={game.localMaxPlayers}
                onlineMaxPlayers={game.onlineMaxPlayers}
                supportsSolo={game.supportsSolo}
                supportsCoop={game.supportsCoop}
                supportsPvp={game.supportsPvp}
              />
              <PcSupportBadges platforms={game.platforms} />
            </div>
          )}
        </div>

        {/* lg 아래에서는 붙이지 않는다 — 한 기둥으로 접히면 따라올 대상이 자기 자신뿐이다 */}
        <div className="enter-item flex min-w-0 flex-col gap-6 lg:sticky lg:top-[80px]" style={stagger(4)}>
          <PriceHeadline game={game} recordedLow={recordedLow} />

          <div className="flex flex-wrap gap-2">
            <Link
              href={`${ROUTES.alerts}?game=${encodeURIComponent(game.slug)}`}
              className={buttonClass({ variant: "primary", size: "lg", className: "min-w-[140px] flex-1" })}
            >
              할인 알림 받기
            </Link>
            <Suspense fallback={<WishlistSlotFallback />}>
              <WishlistSlot gameId={game.id} />
            </Suspense>
          </div>

          <StatGrid game={game} />
        </div>
      </section>

      {/*
        섹션 2 이후 — 근거. 한 마디가 한 줄을 통째로 쓴다(2026-09-21 리디자인).

        전에는 본문 2 : 사이드바 1 의 두 기둥이었고, 플레이타임과 출처가 사이드바에 갇혀 있었다.
        그 기둥이 좁아 막대가 120px 밖에 안 됐고, 가격표가 8줄인 게임에서는 오른쪽이 통째로 비었다.
        지금은 결론만 위에서 따라오고(섹션 1의 오른쪽 기둥), 근거는 마디별로 폭을 다 쓴다.

        칸마다 min-w-0 을 다는 이유(2026-09-16): 격자 칸의 기본 최소 크기는 auto 다. 그래서 칸은
        "안쪽에서 줄바꿈 없이 필요한 폭" 아래로는 절대 줄지 않는다. 안에는 한 줄로 자르는 제목
        (Clamp, truncate = white-space: nowrap)이 있고, 그 제목의 최소 폭은 잘리기 전 글자 전체 폭이다 —
        자식 컴포넌트가 min-w-0, flex-1 을 아무리 붙여도 그 값은 칸까지 올라온다.
        긴 DLC 제목 하나가 상세 본문 전체를 520px 로 밀어 화면 밖으로 내보냈다(390px 기기, ea-sports-fc-26).
      */}
      <section aria-labelledby="platforms-heading" className="enter-item flex min-w-0 flex-col gap-3.5" style={stagger(5)}>
        <SectionHead
          id="platforms-heading"
          title="플랫폼별 가격"
          action={
            <Link href={gamePricesPath(game.slug)} className="text-[13px] text-acc hover:underline">
              가격 변동 그래프
            </Link>
          }
        />
        {/* 요약 바가 인용한 스토어의 유저 점수는 행 안에서 또 적지 않는다(platform-prices 주석) */}
        <PlatformPrices platforms={platforms} quotedUserScorePlatform={bestUserScore(game.platforms)?.platform ?? null} />
        <UpgradeNotes upgrades={game.upgrades} />
      </section>

      {/* 사양과 플레이타임은 나란히 둔다 — 하나는 "돌아가나", 하나는 "얼마나 걸리나" 로
          둘 다 사기 전 마지막에 묻는 값이고, 어느 쪽도 한 줄을 다 쓸 만큼 길지 않다 */}
      <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* 사양은 가격, 추가 콘텐츠 다음이다 — 살지 말지를 정한 뒤에 오는 질문이라서다.
              콘솔 전용 게임은 groups 가 비어 있어 칸 자체가 서지 않는다.
              판정이 사양표보다 먼저 서는 이유: 사람이 묻는 것은 "돌아가나" 이고 표는 그 근거다 */}
          {game.requirements.length > 0 && (
            <Suspense fallback={null}>
              <CompatSlot groups={game.requirements} platforms={game.platforms} />
            </Suspense>
          )}
          <RequirementsSection groups={game.requirements} />
        </div>

        <div className="min-w-0">
          <PlaytimeCard playtime={game.playtime} currentPrice={best?.currentPrice ?? null} currency={best?.currency} scale={perHourScale} />
        </div>
      </div>

      {/* 에디션과 DLC 는 같은 줄 모양을 쓴다 - 묻는 것이 "제목과 값" 으로 같고,
          모양이 다르면 같은 화면에서 두 번 배워야 한다.
          머리(건수)까지 DlcSection 안에 있다 - 플랫폼 칩으로 거른 건수를 말해야 해서다 */}
      {game.editions.length > 0 && (
        <DlcSection id="edition-heading" title={GAME_MESSAGES.editionHeading} dlcs={game.editions} hasAddOns={false} />
      )}

      {(game.dlcs.length > 0 || hasAddOns) && (
        <DlcSection id="dlc-heading" title={GAME_MESSAGES.dlcHeading} dlcs={game.dlcs} hasAddOns={hasAddOns} />
      )}

      <Suspense fallback={null}>
        <SellersSlot gameId={game.id} />
      </Suspense>

      <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))]">
        <div className="flex min-w-0 flex-col gap-6">
          {patchGroups.length > 0 && (
            <section aria-labelledby="patches-heading" className="flex flex-col gap-3.5">
              {/* 목록은 시트 안에 둔다 — 상세에서 자리를 가장 많이 먹던 블록인데,
                  "언제 고쳐졌나" 는 한 번 확인하면 끝나는 질문이라 늘 펼쳐 둘 이유가 없다.
                  펼쳐 둘 값은 속도 표 한 줄이면 족하다 */}
              <SectionHead
                id="patches-heading"
                title={GAME_MESSAGES.patchHeading}
                action={
                  <Sheet label="패치 기록 보기" title={`${title} 패치 기록`}>
                    <PatchList items={latestPatches(patchGroups, SHEET_PATCH_LIMIT)} showPlatform={patchGroups.length > 1} />
                  </Sheet>
                }
              />
              <PatchSpeed groups={patchGroups} />
            </section>
          )}

          {game.sourceRefs.length > 0 && (
            <section aria-labelledby="sources-heading" className="flex flex-col gap-2.5 border-t border-line pt-4">
              <h2 id="sources-heading" className="text-[12px] font-bold tracking-[0.08em] text-dim">
                정보 출처
              </h2>
              <ul className="flex flex-wrap gap-1.5 text-[12px]">
                {game.sourceRefs.map((r) =>
                  r.url ? (
                    <li key={r.source}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="press inline-flex items-center gap-1 rounded-full bg-surface-2 px-[11px] py-[5px] text-ink-2 transition-colors hover:bg-surface-3"
                      >
                        {r.source}
                        <span className="sr-only"> (새 창에서 열림)</span>
                      </a>
                    </li>
                  ) : (
                    // 아직 못 붙인 출처는 점선으로 둔다 — 면을 주면 "이미 있다" 로 읽힌다
                    <li key={r.source} className="rounded-full border border-dashed border-line-strong px-[11px] py-[5px] text-dim-2">
                      {r.source}
                    </li>
                  ),
                )}
              </ul>
            </section>
          )}
        </div>

        <section aria-labelledby="news-heading" className="flex min-w-0 flex-col gap-3.5">
          <SectionHead id="news-heading" title="관련 뉴스" />
          <NewsList items={game.news} />
        </section>
      </div>
    </Page>
  );
}
