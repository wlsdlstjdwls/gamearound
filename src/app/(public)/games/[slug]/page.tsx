// 게임 상세(기획서 v2.0 S-05). 데이터는 tag 캐시(getGameBySlugCached), 로그인 의존 데이터(찜, 기기, 파는 곳)는 캐시 밖에서 조회.
//
// 2026-10-26 목업 v2.0 구성으로 다시 짰다(사용자 지시: "목업 = 모든 화면 최대한 동일하게"). 위에서 아래로
//   히어로 3단 - 플랫폼별 가격 비교 - 가격 변동 추이 + 할인 예측 - 최신 관련 뉴스 - 탭(업데이트 노트 | 성능 정보)
// 색은 목업(다크 + 라임)이 아니라 지금 토큰을 쓴다. 목업에 없는 이 서비스의 값(에디션, 예약 특전, 파는 곳, 인디 소개,
// 정보 출처)은 지우지 않고 탭 아래 "더 알아보기" 로 내렸다. 히어로, 카드, 탭 조각은 components/game-detail 에 있다.
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DbUnavailablePage } from "@/components/db-unavailable";
import { DlcSection, DlcSheetButton } from "@/components/dlc-list";
import { ForecastByPlatform } from "@/components/game-detail/forecast-by-platform";
import { PlatformPickProvider } from "@/components/game-detail/platform-pick";
import { initialPickBrand, isUpcomingRow, pcMergeable } from "@/components/platform-prices/order";
import { brandKeyOf, familyOf, PC_PICK_KEY } from "@/lib/platform";
import { GameHeadbar } from "@/components/game-headbar";
import { GameViewBeacon } from "@/components/game-view-beacon";
import { IndieGameSection, IndieSuggestSection } from "@/components/indie/game-section";
import { NewsList } from "@/components/news-list";
import { PlatformPrices, type PlatformPriceItem } from "@/components/platform-prices";
import { PreorderBonusesSection } from "@/components/preorder-bonuses-section";
import { GameEventsSection } from "@/components/game-events-section";
import { PriceAlertButton, type AlertPlatformOption } from "@/components/price-alert-button";
import { UpgradeNotes } from "@/components/upgrade-note";
import { DetailHero } from "@/components/game-detail/hero";
import { NewsMore } from "@/components/game-detail/news-more";
import { PRICES_SECTION_ID } from "@/components/game-detail/constants";
import { PriceChartFallback, PriceChartSlot, SellersSlot } from "@/components/game-detail/slots";
import { DetailUpdates } from "@/components/game-detail/updates";
import { BackLink } from "@/components/ui/back-link";
import { Page, SectionHead, sectionCardClass } from "@/components/ui/page";
import { DB_DOWN, orDbDown } from "@/lib/db-errors";
import { DISPLAY_CURRENCY, formatPrice } from "@/lib/currency";
import { kstDateKey, platformLabel } from "@/lib/format";
import { getFreshness } from "@/lib/freshness";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { GAME_MESSAGES } from "@/lib/games/messages";
import { stagger } from "@/lib/motion";
import { forecastDiscount } from "@/lib/sales/forecast";
import { SITE } from "@/lib/site";
import { buildGameJsonLd, serializeJsonLd } from "@/lib/seo/game-json-ld";
import { siteOrigin } from "@/lib/seo/constants";
import { decodeSlugParam } from "@/lib/slug";
import { GAME_NEWS_SECTION_ID, gamePath, ROUTES } from "@/lib/routes";
import { cheapestPlatform, displayTitle, getGameBySlugCached, getGamePatchesCached } from "@/server/services/games";
import { getDiscountHistory } from "@/server/services/prices";
import { HOME_REGION, type Platform } from "@/server/db/schema";

/** 검색결과, SNS 카드에 들어가는 설명 길이 상한 */
const META_DESCRIPTION_MAX = 150;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeSlugParam((await params).slug);
  const game = await orDbDown(getGameBySlugCached(slug));
  // DB 가 안 열린 날은 기본 제목으로 둔다 — "찾을 수 없음" 을 적으면 멀쩡한 주소가 없는 게임으로 색인된다
  if (game === DB_DOWN) return {};
  if (!game) return { title: "게임을 찾을 수 없음" };
  const title = displayTitle(game);
  const description =
    game.description?.slice(0, META_DESCRIPTION_MAX) ?? `${title}의 플랫폼별 가격, 할인, 플레이타임, 평점, 뉴스를 ${SITE.name}에서 확인하세요.`;
  // openGraph.images 는 opengraph-image.tsx 가 자동으로 채운다 — 여기서 커버를 지정하면 그걸 덮어쓴다
  return { title, description, openGraph: { title, description } };
}

export default async function GameDetailPage({ params }: Props) {
  const slug = decodeSlugParam((await params).slug);

  /*
   * 한 번에 던진다 — 질의 자체는 10~20ms 인데 Neon 왕복이 한 번에 200ms 대라, 줄 세우면 기다림만 는다(2026-09-15 실측 1,547ms).
   * 가격 이력(그래프), 세션, 찜, 기기, 파는 곳은 여기서 기다리지 않는다 — 각자 Suspense 안에서 받는다(game-detail/slots).
   * 시간당 가격 눈금(getPricePerHourScale)은 뺐다: 그 칸은 2026-09-22 부터 내려 둔 상태라 받기만 하고 안 썼다.
   */
  const loaded = await orDbDown(Promise.all([getGameBySlugCached(slug), getGamePatchesCached(slug), getDiscountHistory(slug)]));
  // 장애를 404 로 그리지 않는다(orDbDown 주석) — 판 하나를 세우고 다시 시도하게 둔다
  if (loaded === DB_DOWN) return <DbUnavailablePage retryHref={gamePath(slug)} />;
  const [game, patchGroups, discountHistory] = loaded;
  if (!game) notFound();

  const title = displayTitle(game);
  const platforms: PlatformPriceItem[] = game.platforms.map((p) => ({ ...p, freshness: getFreshness(p.lastSyncedAt, p.syncStatus) }));
  // 0원 행은 최저가 후보에서 뺀다 — 한 스토어만 0원(구독 포함가가 잘못 들어온 Xbox 등)이면 그 0원이 최저가가 돼
  // 게임 전체가 무료로 읽히고 가격 알림, 할인 예측이 사라졌다(2026-11-23 사용자, NBA 2K27). 값이 붙은 행이 모두 0원일 때만 무료다
  const pricedRows = game.platforms.filter((p) => p.currentPrice !== null);
  const paidRows = pricedRows.filter((p) => p.currentPrice! > 0);
  const best = cheapestPlatform(paidRows.length > 0 ? paidRows : game.platforms);
  /** 값이 붙은 행이 모두 0원 — 할인 알림을 걸 자리가 없다. 값이 없는 것(null)과 가른다 */
  const isFree = pricedRows.length > 0 && paidRows.length === 0;
  const unreleased = game.releaseDate !== null && game.releaseDate.slice(0, 10) > kstDateKey(new Date());
  // 출시 전이고 값이 하나도 없을 때만 "출시 예정" 화면이다. 예약 판매로 값이 붙은 게임은 값 카드를 그대로 쓴다(예약 딱지가 말한다)
  const upcoming = unreleased && game.platforms.every((p) => p.currentPrice === null);
  // 가격 알림 팝업의 칸 — 한국 행만, 플랫폼마다 하나(다른 나라 값은 상세에서만 참고로 보여 준다)
  const alertOptions: AlertPlatformOption[] = game.platforms
    .filter((p) => p.region === "KR")
    .filter((p, i, list) => list.findIndex((q) => q.platform === p.platform) === i)
    .map((p) => ({ platform: p.platform, currentPrice: p.currentPrice, currency: p.currency }));
  const canAlert = !isFree && alertOptions.length > 0;
  // 할인 예측은 한국 계정으로 사는 기준 통화 값만 본다 — 근거(스냅샷 요약)도 같은 기준으로 접혀 온다(services/prices)
  const forecastRows = game.platforms.filter((p) => p.region === HOME_REGION && p.currency === DISPLAY_CURRENCY);
  const now = new Date();
  const forecast = forecastDiscount({ rows: forecastRows, history: discountHistory, now });
  // 플랫폼 카드를 고르면 예측도 그 묶음 값으로 바뀐다(game-detail/platform-pick, 2026-10-27 사용자). 묶음마다 미리 셈해 넘긴다
  const brandKeys = [...new Set(forecastRows.map((p) => brandKeyOf(p.platform)))];
  const forecastByBrand = Object.fromEntries(
    // 할인 기록도 그 묶음 것만 — 안 거르면 Steam 예측의 "기록 최저가" 에 Xbox 의 할인가가 섰다(2026-10-27 실측)
    brandKeys.map((k) => [
      k,
      forecastDiscount({
        rows: forecastRows.filter((p) => brandKeyOf(p.platform) === k),
        history: discountHistory.filter((h) => brandKeyOf(h.platform as Platform) === k),
        now,
      }),
    ]),
  );
  // PC 카드(Steam, Epic 합친 카드)를 고르면 두 스토어 기록을 함께 본 예측이다(order 의 pcMergeable, lib/platform 의 PC_PICK_KEY)
  const today = kstDateKey(now);
  const pcMerged = pcMergeable(platforms, (p) => upcoming || isUpcomingRow(p, game.releaseDate, today));
  if (pcMerged) {
    forecastByBrand[PC_PICK_KEY] = forecastDiscount({
      rows: forecastRows.filter((p) => familyOf(p.platform) === "pc"),
      history: discountHistory.filter((h) => familyOf(h.platform) === "pc"),
      now,
    });
  }
  // 처음 고른 카드 = 줄의 맨 앞에 선, 파는 플랫폼 카드(2026-10-27 사용자: "처음 들어왔을 때 가장 맨 앞 서비스 중인 플랫폼이 선택되고").
  // 최저가 카드로 열면 고리가 줄 가운데에서 켜져 "왜 이게 골라져 있지" 로 읽혔다. 그 뒤는 사람이 고를 때마다 바뀐다.
  // 값 없는 카드는 건너뛴다(order 의 initialPickBrand)
  const initialBrand = initialPickBrand(platforms, pcMerged);
  // 검색 결과의 가격 줄(구조화 데이터). 화면에 보이는 값과 같은 행(숨김, 링크 없는 행을 거른 game.platforms)만 싣는다
  const jsonLd = buildGameJsonLd({
    url: `${siteOrigin() ?? ""}${gamePath(game.slug)}`,
    title,
    description: game.description?.slice(0, META_DESCRIPTION_MAX) ?? null,
    image: game.coverUrl,
    releaseDate: game.releaseDate,
    genres: game.genres,
    developer: game.developer,
    publisher: game.publisher,
    platforms: game.platforms,
  });

  return (
    <Page pad="detail" gap={28}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <BackLink href={ROUTES.game}>게임 목록으로</BackLink>
      {/* 조회 기록 — 수집이 사람들이 보는 게임을 먼저 갱신하게 한다(server/game-views). 화면에는 아무것도 안 그린다 */}
      <GameViewBeacon slug={game.slug} />

      {/* 히어로의 플랫폼 이름, 가격 비교, 그래프, 할인 예측이 "지금 고른 플랫폼" 하나를 나눠 쓴다(game-detail/platform-pick) */}
      <PlatformPickProvider initial={initialBrand}>
      <DetailHero game={game} title={title} unreleased={unreleased} alertOptions={alertOptions} isFree={isFree} />

      {/* 히어로가 머리띠에 가리는 순간부터 제목과 최저가를 머리띠 자리에 띄운다(2026-09-22). 센티넬이 여기 서야
          "히어로를 지나쳤나" 가 된다. 히어로에서 최저가 큰 글자를 걷은 뒤로는 이 띠가 스크롤 중 값을 들고 있는 유일한 자리다 */}
      <GameHeadbar
        title={title}
        coverUrl={game.coverUrl ?? game.portraitUrl}
        storeLabel={best && best.currentPrice !== null ? platformLabel(best) : null}
        buyUrl={best?.storeUrl ?? null}
        price={best && best.currentPrice !== null ? formatPrice(best.currentPrice, best.currency) : null}
        listPrice={best && best.discountPct && best.listPrice !== null && best.listPrice !== best.currentPrice ? formatPrice(best.listPrice, best.currency) : null}
        discountPct={best?.discountPct ?? null}
        discountEndsAt={best?.discountEndsAt ?? null}
        gameId={game.id}
        alertAction={
          canAlert ? (
            <PriceAlertButton gameId={game.id} gameSlug={game.slug} gameTitle={title} options={alertOptions} slot="headbar" size="sm" variant="secondary" label={D.headbarAlert} />
          ) : null
        }
      />

      {/* 플랫폼별 가격 비교(목업 .pg). 판 없이 카드만 바탕 위에 선다 — 카드 한 장 한 장이 이미 흰 판이다.
          칸마다 min-w-0: 긴 DLC 제목 하나가 본문 전체를 520px 로 밀어 화면 밖으로 내보낸 적이 있다(2026-09-16) */}
      <section id={PRICES_SECTION_ID} aria-labelledby="platforms-heading" className="enter-item flex min-w-0 scroll-mt-24 flex-col gap-3.5" style={stagger(3)}>
        <SectionHead
          id="platforms-heading"
          title={upcoming ? D.upcomingHeading : D.priceHeading}
          // 추가 콘텐츠는 본문 마디 대신 이 머리의 단추로 연다(2026-11-16 사용자 "따로 버튼 만들어서 팝업으로").
          // 가격을 보던 자리에서 바로 "이 게임에 뭐가 더 있나" 를 열 수 있고, 30줄짜리 마디가 그래프를 밀어내지 않는다
          action={game.dlcs.length > 0 ? <DlcSheetButton dlcs={game.dlcs} hasAddOns={game.platforms.some((p) => p.hasAddOns)} /> : undefined}
          // 제목 옆 행사 곁말(플랫폼, 할인 기간, 남은 날)은 걷었다(2026-11-11 사용자 "이 문구는 지워 줘").
          // 2026-09-30 에 넣었던 자리다. 할인 기간은 가격 칸과 머리 띠가 이미 말한다. 부품(platform-prices/sale-note)은 남겨 둔다
        />
        <PlatformPrices
          platforms={platforms}
          releaseFallback={game.releaseDate}
          upcomingAll={upcoming}
          // 출시 카드(게임 전체가 출시 전이거나, 이 기기로는 아직인 행)마다 그 플랫폼만 고른 출시 알림
          releaseAction={(p) =>
            alertOptions.some((o) => o.platform === p.platform) ? (
              <PriceAlertButton
                gameId={game.id}
                gameSlug={game.slug}
                gameTitle={title}
                kind="release"
                options={alertOptions.filter((o) => o.platform === p.platform)}
                slot={p.platform}
                variant="soft"
                size="row"
                label={D.releaseAlert}
                className="w-full"
              />
            ) : null
          }
        />
        <UpgradeNotes upgrades={game.upgrades} />
      </section>

      {/* 가격 변동 추이 + 할인 예측(목업 #chs). 넓은 화면은 그래프 1.7 : 예측 1, 좁으면 위아래.
          출시 전 게임은 그릴 값도 예측할 값도 없어 통째로 빠진다(목업 g.up). 무료 게임은 예측 판만 빠진다 */}
      {!upcoming && (
        // 넓은 화면에서 두 칸이 같은 높이다(items-stretch, 2026-11-11 사용자 "할인 예측 높이를 가격 변동 추이와 맞춰"). 좁으면 위아래라 늘일 것이 없다
        <div className={isFree ? "min-w-0" : "grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-stretch"}>
          <Suspense fallback={<PriceChartFallback />}>
            <PriceChartSlot slug={game.slug} />
          </Suspense>
          {!isFree && (
            <ForecastByPlatform
              all={forecast}
              byBrand={forecastByBrand}
              currency={DISPLAY_CURRENCY}
              action={canAlert ? <PriceAlertButton gameId={game.id} gameSlug={game.slug} gameTitle={title} options={alertOptions} slot="forecast" label={D.forecastAlert} /> : undefined}
            />
          )}
        </div>
      )}

      {/* 업데이트 노트 | 성능 정보(목업 .tabs). 둘 다 없으면 한 줄로 접힌다(game-detail/updates).
          고른 플랫폼 카드를 따라 업데이트 노트가 바뀐다(2026-11-16 사용자) — 그래서 고르기 Provider 안에 둔다. 뉴스보다 위로 올라왔다 */}
      <DetailUpdates game={game} patchGroups={patchGroups} upcoming={upcoming} />
      </PlatformPickProvider>

      {/* 뉴스가 없으면 큰 판 대신 한 줄(game-detail/empty-line) */}
      {game.news.length > 0 ? (
        <div id={GAME_NEWS_SECTION_ID} className={sectionCardClass("min-w-0 scroll-mt-24")}>
          <NewsMore count={game.news.length}>
            <NewsList items={game.news} />
          </NewsMore>
        </div>
      ) : null /* 뉴스가 없으면 마디째 숨긴다(2026-11-23 사용자 "뉴스 없으면 해당 영역 숨기기") */}


      {/* 더 알아보기 — 목업에 없지만 이 서비스가 쌓은 값. 에디션은 "어느 판을 살까" 라 맨 앞이다 */}
      {game.editions.length > 0 && (
        <div className={sectionCardClass("min-w-0")}>
          <DlcSection id="edition-heading" title={GAME_MESSAGES.editionHeading} dlcs={game.editions} hasAddOns={false} />
        </div>
      )}
      {/* 예약 특전, 파는 곳, 개발자 소개 글은 숨김, 재고가 바로 반영돼야 해서 캐시 밖에서 따로 받는다 */}
      <Suspense fallback={null}>
        <PreorderBonusesSection gameId={game.id} />
      </Suspense>
      {/* 이벤트, 소식 카드. 관리자가 내리면 바로 빠져야 해서 같은 이유로 캐시 밖이다 */}
      <Suspense fallback={null}>
        <GameEventsSection gameId={game.id} />
      </Suspense>
      <Suspense fallback={null}>
        <SellersSlot gameId={game.id} />
      </Suspense>
      <Suspense fallback={null}>
        <IndieGameSection gameId={game.id} />
      </Suspense>
      {/* 인디 추천 한 칸 — 인디 부스트가 서는 광고 자리이고, 광고가 없으면 같은 장르 인디 게임(services/promotions/indie-spots) */}
      <Suspense fallback={null}>
        <IndieSuggestSection gameId={game.id} genres={game.genres} />
      </Suspense>
      {/* 좁은 화면 바닥 구매 띠는 걷었다(2026-11-16 피드백 v11 #1 "목업은 하단 고정 바 없음"). 머리 띠(GameHeadbar)가 값을 들고 있다. 부품(game-detail/buy-bar)은 남겨 둔다 */}
    </Page>
  );
}
