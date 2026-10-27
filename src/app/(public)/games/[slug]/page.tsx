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
import { DlcSection } from "@/components/dlc-list";
import { ForecastByPlatform } from "@/components/game-detail/forecast-by-platform";
import { PlatformPickProvider } from "@/components/game-detail/platform-pick";
import { brandNameOf, orderCards } from "@/components/platform-prices/order";
import { brandKeyOf } from "@/lib/platform";
import { GameHeadbar } from "@/components/game-headbar";
import { GameViewBeacon } from "@/components/game-view-beacon";
import { IndieGameSection } from "@/components/indie/game-section";
import { NewsList } from "@/components/news-list";
import { PatchList, PatchSpeed } from "@/components/patch-list";
import { PlatformPrices, PlatformSaleNote, type PlatformPriceItem } from "@/components/platform-prices";
import { PreorderBonusesSection } from "@/components/preorder-bonuses-section";
import { PriceAlertButton, type AlertPlatformOption } from "@/components/price-alert-button";
import { RequirementsBody } from "@/components/requirements-table";
import { RunCheck } from "@/components/run-check";
import { UpgradeNotes } from "@/components/upgrade-note";
import { DetailHero } from "@/components/game-detail/hero";
import { NewsMore } from "@/components/game-detail/news-more";
import { CompatSlot, PriceChartFallback, PriceChartSlot, SellersSlot, VerdictNoteSlot } from "@/components/game-detail/slots";
import { DetailTabs } from "@/components/game-detail/tabs";
import { BackLink } from "@/components/ui/back-link";
import { Page, SectionHead, sectionCardClass } from "@/components/ui/page";
import { DB_DOWN, orDbDown } from "@/lib/db-errors";
import { DISPLAY_CURRENCY, formatPrice } from "@/lib/currency";
import { kstDateKey } from "@/lib/format";
import { getFreshness } from "@/lib/freshness";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { COMPAT_MESSAGES, GAME_MESSAGES, OS_FAMILY_LABEL } from "@/lib/games/messages";
import { requirementSummary } from "@/lib/games/requirement-summary";
import { stagger } from "@/lib/motion";
import { forecastDiscount } from "@/lib/sales/forecast";
import { SITE } from "@/lib/site";
import { decodeSlugParam } from "@/lib/slug";
import { gamePath, ROUTES } from "@/lib/routes";
import { bestUserScore, cheapestPlatform, displayTitle, getGameBySlugCached, getGamePatchesCached, latestPatches } from "@/server/services/games";
import { getDiscountHistory } from "@/server/services/prices";
import { HOME_REGION, type Platform } from "@/server/db/schema";

/** 검색결과, SNS 카드에 들어가는 설명 길이 상한 */
const META_DESCRIPTION_MAX = 150;

/**
 * "업데이트 노트" 탭에 담을 패치 기록 수. 시트에 있던 목록(2026-09-15)을 탭으로 펼쳤다(목업).
 * 50 은 상한일 뿐이다 — 스토어가 최근 기록만 돌려줘서 실제로는 게임당 훨씬 적다.
 */
const TAB_PATCH_LIMIT = 50;

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
  const best = cheapestPlatform(game.platforms);
  /** 최저가가 0원 — 할인 알림을 걸 자리가 없다. 값이 없는 것(null)과 가른다 */
  const isFree = best?.currentPrice === 0;
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
  const brandLabels = Object.fromEntries(game.platforms.map((p) => [brandKeyOf(p.platform), brandNameOf(p)]));
  // 처음 고른 카드 = 줄의 맨 앞에 선, 파는 플랫폼 카드(2026-10-27 사용자: "처음 들어왔을 때 가장 맨 앞 서비스 중인 플랫폼이 선택되고").
  // 최저가 카드로 열면 고리가 줄 가운데에서 켜져 "왜 이게 골라져 있지" 로 읽혔다. 그 뒤는 사람이 고를 때마다 바뀐다
  const firstSold = orderCards(platforms).find((c) => c.kind === "row");
  const initialBrand = firstSold?.kind === "row" ? brandKeyOf(firstSold.row.platform) : null;

  return (
    <Page pad="detail" gap={28}>
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
        price={best && best.currentPrice !== null ? formatPrice(best.currentPrice, best.currency) : null}
        listPrice={best && best.discountPct && best.listPrice !== null && best.listPrice !== best.currentPrice ? formatPrice(best.listPrice, best.currency) : null}
        discountPct={best?.discountPct ?? null}
        // 나라별로 여러 행인 플랫폼(스위치 한국, 일본)이 배지로 두 번 서지 않게 접는다
        platforms={[...new Set(game.platforms.map((p) => p.platform))]}
        alertAction={
          canAlert ? (
            <PriceAlertButton gameId={game.id} gameSlug={game.slug} gameTitle={title} options={alertOptions} slot="headbar" size="sm" label={D.headbarAlert} />
          ) : null
        }
      />

      {/* 플랫폼별 가격 비교(목업 .pg). 판 없이 카드만 바탕 위에 선다 — 카드 한 장 한 장이 이미 흰 판이다.
          칸마다 min-w-0: 긴 DLC 제목 하나가 본문 전체를 520px 로 밀어 화면 밖으로 내보낸 적이 있다(2026-09-16) */}
      <section aria-labelledby="platforms-heading" className="enter-item flex min-w-0 flex-col gap-3.5" style={stagger(3)}>
        <SectionHead
          id="platforms-heading"
          title={upcoming ? D.upcomingHeading : D.priceHeading}
          // 행사 이름과 남은 기간은 제목 옆 곁말 자리다(2026-09-30, 사용자 지정)
          note={<PlatformSaleNote platforms={game.platforms} />}
        />
        <PlatformPrices
          platforms={platforms}
          quotedUserScorePlatform={bestUserScore(game.platforms)?.platform ?? null}
          dlcs={game.dlcs}
          releaseFallback={game.releaseDate}
          upcomingAction={
            upcoming
              ? (p) =>
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
              : undefined
          }
        />
        <UpgradeNotes upgrades={game.upgrades} />
      </section>

      {/* 가격 변동 추이 + 할인 예측(목업 #chs). 넓은 화면은 그래프 1.7 : 예측 1, 좁으면 위아래.
          출시 전 게임은 그릴 값도 예측할 값도 없어 통째로 빠진다(목업 g.up). 무료 게임은 예측 판만 빠진다 */}
      {!upcoming && (
        <div className={isFree ? "min-w-0" : "grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]"}>
          <Suspense fallback={<PriceChartFallback />}>
            <PriceChartSlot slug={game.slug} />
          </Suspense>
          {!isFree && (
            <ForecastByPlatform
              all={forecast}
              byBrand={forecastByBrand}
              labels={brandLabels}
              currency={DISPLAY_CURRENCY}
              action={canAlert ? <PriceAlertButton gameId={game.id} gameSlug={game.slug} gameTitle={title} options={alertOptions} slot="forecast" label={D.forecastAlert} /> : undefined}
            />
          )}
        </div>
      )}
      </PlatformPickProvider>

      <div className={sectionCardClass("min-w-0")}>
        <NewsMore count={game.news.length}>
          <NewsList items={game.news} />
        </NewsMore>
      </div>

      {/* 업데이트 노트 | 성능 정보(목업 .tabs). 패치 기록 시트와 구동 사양 마디를 탭 안으로 옮겼다 */}
      <DetailTabs
        label={D.tabsLabel}
        tabs={[
          {
            key: "patches",
            label: D.tabPatches,
            panel: (
              <div className={sectionCardClass("flex min-w-0 flex-col gap-5")}>
                {patchGroups.length > 0 ? (
                  <>
                    <PatchSpeed groups={patchGroups} />
                    <PatchList items={latestPatches(patchGroups, TAB_PATCH_LIMIT)} showPlatform={patchGroups.length > 1} />
                  </>
                ) : (
                  <p className="text-[13px] text-dim">{GAME_MESSAGES.patchNone}</p>
                )}
              </div>
            ),
          },
          {
            key: "perf",
            label: D.tabPerf,
            panel: (
              <div className={sectionCardClass("min-w-0")}>
                {game.requirements.length > 0 ? (
                  <RunCheck
                    verdictTitle={COMPAT_MESSAGES.heading}
                    verdictNote={
                      <Suspense fallback={null}>
                        <VerdictNoteSlot groups={game.requirements} />
                      </Suspense>
                    }
                    requirementTitle={GAME_MESSAGES.requirementHeading}
                    requirementNote={requirementSummary(game.requirements) ?? game.requirements.map((g) => OS_FAMILY_LABEL[g.osFamily]).join(", ")}
                    verdict={
                      <Suspense fallback={null}>
                        <CompatSlot groups={game.requirements} platforms={game.platforms} />
                      </Suspense>
                    }
                    requirements={<RequirementsBody groups={game.requirements} />}
                  />
                ) : (
                  <p className="text-[13px] text-dim">{upcoming ? D.perfUpcoming : D.perfNone}</p>
                )}
              </div>
            ),
          },
        ]}
      />

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
      <Suspense fallback={null}>
        <SellersSlot gameId={game.id} />
      </Suspense>
      <Suspense fallback={null}>
        <IndieGameSection gameId={game.id} />
      </Suspense>
    </Page>
  );
}
