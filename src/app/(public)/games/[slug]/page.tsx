// 게임 상세 — 결론 → 근거 순 (§5.1). 데이터는 tag 캐시(getGameBySlugCached), 로그인 의존 데이터(찜 여부)는 캐시 밖에서 조회
import { formatPrice } from "@/lib/currency";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverImage } from "@/components/game-card";
import { CompanyChips } from "@/components/company-chips";
import { DlcList } from "@/components/dlc-list";
import { SubscriptionBadges } from "@/components/subscription-badges";
import { UpgradeNotes } from "@/components/upgrade-note";
import { MultiplayerBadges } from "@/components/multiplayer-badges";
import { NewsList } from "@/components/news-list";
import { PatchList, PatchSpeed } from "@/components/patch-list";
import { PlatformTabs, type PlatformTabItem } from "@/components/platform-tabs";
import { PlaytimeCard } from "@/components/playtime-card";
import { WishlistButton } from "@/components/wishlist-button";
import { buttonClass } from "@/components/ui/button";
import { Card, Page, SectionHead } from "@/components/ui/page";
import { formatHours, PLATFORM_LABEL } from "@/lib/format";
import { SITE } from "@/lib/site";
import { getFreshness } from "@/lib/freshness";
import { GAME_MESSAGES } from "@/lib/games/messages";
import { stagger } from "@/lib/motion";
import { gamePatchesPath, gamePricesPath, ROUTES } from "@/lib/routes";
import {
  bestScore,
  cheapestPlatform,
  displayTitle,
  getGameBySlugCached,
  getGamePatchesCached,
  latestPatches,
  type GameDetail,
} from "@/server/services/games";
import { getCurrentUser } from "@/server/services/users";
import { isInWishlist } from "@/server/services/wishlist";
import { cardClass } from "@/components/ui/page";

/** 검색결과, SNS 카드에 들어가는 설명 길이 상한 */
const META_DESCRIPTION_MAX = 150;

/** 상세에 띄울 최근 패치 수. 전체 목록과 속도 비교는 전용 화면(/patches)이 맡는다 */
const DETAIL_PATCH_LIMIT = 5;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
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

function SummaryCell({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5">
      <dt className="text-[11.5px] text-dim">{label}</dt>
      <dd className="flex flex-col gap-0.5">
        <span className="text-[20px] font-bold tracking-[-0.02em] text-ink">{value}</span>
        {note && <span className="text-[11.5px] text-mut">{note}</span>}
      </dd>
    </div>
  );
}

/** 결정 요약 바 — "지금이 싼가 | 얼마나 걸리나 | 살 만한가" 세 값만 최상단에 고정한다 */
function DecisionSummary({ game, className, style }: { game: GameDetail; className?: string; style?: React.CSSProperties }) {
  const best = cheapestPlatform(game.platforms);
  const score = bestScore(game.platforms);
  const main = game.playtime?.mainStoryHours;
  const complete = game.playtime?.completionistHours;

  return (
    <dl
      className={cardClass(`grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] divide-x divide-line-soft overflow-hidden ${className ?? ""}`)}
      style={style}
    >
      {/* 값이 없을 때 note 를 비우는 이유: 값 자리에 이미 "-" 가 서 있는데 그 밑에 "없음" 을 또 적으면
          같은 말을 두 번 하는 데다, 화면이 아는 것보다 모르는 것을 더 크게 말하게 된다. */}
      <SummaryCell
        label="지금 최저가"
        value={best ? formatPrice(best.currentPrice, best.currency) : "-"}
        note={best ? `${PLATFORM_LABEL[best.platform] ?? best.platform}${best.discountPct ? ` | -${best.discountPct}%` : ""}` : undefined}
      />
      <SummaryCell label="메인 스토리" value={main ? formatHours(main) : "-"} note={complete ? `완전 정복 ${formatHours(complete)}` : undefined} />
      <SummaryCell label="평점" value={score ? String(score.value) : "-"} note={score?.note ?? undefined} />
    </dl>
  );
}

export default async function GameDetailPage({ params }: Props) {
  const { slug } = await params;
  const game = await getGameBySlugCached(slug);
  if (!game) notFound();

  // 로그인 의존 데이터는 캐시 밖에서
  const user = await getCurrentUser();
  const wished = user ? await isInWishlist(game.id) : false;
  // 패치 기록은 상세 조회와 같은 태그(`game:<slug>`)로 따로 캐시된다 — 붙는 테이블이 game_platforms 라
  // 상세 질의에 얹으면 화면이 안 쓰는 행까지 통째로 끌려온다
  const patchGroups = await getGamePatchesCached(slug);

  const title = displayTitle(game);
  const platforms: PlatformTabItem[] = game.platforms.map((p) => ({
    ...p,
    freshness: getFreshness(p.lastSyncedAt, p.syncStatus),
  }));
  const best = cheapestPlatform(game.platforms);
  // 어느 한 플랫폼이라도 "추가 콘텐츠 있음"이라고 했으면 DLC 블록을 띄운다.
  // 목록이 비어 있어도 그 사실 자체가 사용자에게 쓸모 있는 정보다.
  const hasAddOns = game.platforms.some((p) => p.hasAddOns === true);

  return (
    <Page pad="detail" gap={28}>
      <nav aria-label="브레드크럼">
        <Link href={ROUTES.game} className="text-[12.5px] text-dim transition-colors hover:text-ink">
          게임 목록으로
        </Link>
      </nav>

      {/* 섹션 1 — 헤더 블록.
          안쪽 조각마다 .enter-item 을 붙이는 이유: 헤더는 300px 넘는 덩어리라 통째로 페이드하면
          화면이 한 번에 툭 던져진다. 커버, 제목, 요약, 장르, 설명 순으로 들어와야 목록 화면과 결이 같다.
          (조각이 하나라도 .enter-item 이면 감싼 section 은 애니메이션에서 빠진다 — 겹쳐 페이드 방지) */}
      <section className="flex flex-wrap gap-6">
        <div
          style={stagger(0)}
          className={`enter-item relative shrink-0 overflow-hidden rounded-xl border border-line bg-surface-3 ${
            // 세로 아트가 있으면 190×250 슬롯을 채운다. 없으면 가로 배너 비율을 유지해 제목이 잘리지 않게 한다
            game.portraitUrl ? "aspect-[3/4] w-[190px]" : "aspect-[460/215] w-full max-w-[380px]"
          }`}
        >
          <CoverImage src={game.portraitUrl ?? game.coverUrl} alt={`${title} 커버`} sizes="(max-width: 640px) 100vw, 190px" priority />
        </div>

        <div className="flex min-w-[280px] flex-1 flex-col gap-4">
          <div className="enter-item flex flex-wrap items-start justify-between gap-3" style={stagger(1)}>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.03em] text-ink">{title}</h1>
              {game.titleKo && <p className="text-[13px] text-dim">{game.titleEn}</p>}
              <CompanyChips companies={game.companies} developer={game.developer} publisher={game.publisher} />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <WishlistButton gameId={game.id} wished={wished} signedIn={Boolean(user)} />
              <Link href={`${ROUTES.alerts}?game=${encodeURIComponent(game.slug)}`} className={buttonClass({ variant: "primary" })}>
                할인 알림 받기
              </Link>
            </div>
          </div>

          <DecisionSummary game={game} className="enter-item" style={stagger(2)} />

          <div className="enter-item flex flex-wrap items-center gap-2" style={stagger(3)}>
            {game.genres.length > 0 && (
              <>
                <ul className="flex flex-wrap gap-1.5" aria-label="장르">
                  {game.genres.map((g) => (
                    <li key={g} className="rounded-full bg-surface-2 px-[11px] py-1 text-[12px] text-ink-2">
                      {g}
                    </li>
                  ))}
                </ul>
                <span aria-hidden className="h-5 w-px bg-line" />
              </>
            )}
            <MultiplayerBadges
              localMaxPlayers={game.localMaxPlayers}
              onlineMaxPlayers={game.onlineMaxPlayers}
              supportsSolo={game.supportsSolo}
              supportsCoop={game.supportsCoop}
              supportsPvp={game.supportsPvp}
            />
          </div>

          {game.description && (
            <p className="enter-item max-w-[600px] text-[13.5px] leading-[1.75] text-mut" style={stagger(4)}>
              {game.description}
            </p>
          )}
        </div>
      </section>

      {/* 섹션 2 — 가격/뉴스 + 사이드바 */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="enter-item flex flex-col gap-6" style={stagger(5)}>
          <section aria-labelledby="platforms-heading" className="flex flex-col gap-3">
            <SectionHead
              id="platforms-heading"
              title="플랫폼별 가격"
              action={
                <Link href={gamePricesPath(game.slug)} className="text-[12.5px] text-acc hover:underline">
                  가격 변동 그래프
                </Link>
              }
            />
            <SubscriptionBadges subscriptions={game.subscriptions} />
            <PlatformTabs platforms={platforms} />
            <UpgradeNotes upgrades={game.upgrades} />
          </section>

          {(game.dlcs.length > 0 || hasAddOns) && (
            <section aria-labelledby="dlc-heading" className="flex flex-col gap-3">
              <SectionHead
                id="dlc-heading"
                title={GAME_MESSAGES.dlcHeading}
                note={game.dlcs.length > 0 ? `${game.dlcs.length}개` : undefined}
              />
              <DlcList dlcs={game.dlcs} hasAddOns={hasAddOns} />
            </section>
          )}

          {patchGroups.length > 0 && (
            <section aria-labelledby="patches-heading" className="flex flex-col gap-3">
              <SectionHead
                id="patches-heading"
                title={GAME_MESSAGES.patchHeading}
                action={
                  <Link href={gamePatchesPath(game.slug)} className="text-[12.5px] text-acc hover:underline">
                    플랫폼별 패치 속도
                  </Link>
                }
              />
              <PatchSpeed groups={patchGroups} />
              <Card className="px-4">
                <PatchList items={latestPatches(patchGroups, DETAIL_PATCH_LIMIT)} showPlatform={patchGroups.length > 1} />
              </Card>
            </section>
          )}

          <section aria-labelledby="news-heading" className="flex flex-col gap-3">
            <SectionHead id="news-heading" title="관련 뉴스" />
            <Card className="px-4">
              <NewsList items={game.news} />
            </Card>
          </section>
        </div>

        <aside className="enter-item flex flex-col gap-4" style={stagger(6)}>
          <PlaytimeCard playtime={game.playtime} currentPrice={best?.currentPrice ?? null} />

          {game.sourceRefs.length > 0 && (
            <section aria-labelledby="sources-heading" className={cardClass("flex flex-col gap-3 p-4")}>
              <h2 id="sources-heading" className="text-[13.5px] font-bold text-ink">
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
                        className="press inline-flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-1 text-ink-2 transition-colors hover:border-ink"
                      >
                        {r.source}
                        <span className="sr-only"> (새 창에서 열림)</span>
                      </a>
                    </li>
                  ) : (
                    <li key={r.source} className="rounded-full border border-line px-2.5 py-1 text-dim-2">
                      {r.source}
                    </li>
                  ),
                )}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </Page>
  );
}
