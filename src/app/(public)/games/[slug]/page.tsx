// 게임 상세 — 결론 → 근거 순 (§5.1). 데이터는 tag 캐시(getGameBySlugCached), 로그인 의존 데이터(찜 여부)는 캐시 밖에서 조회
import { formatPrice } from "@/lib/currency";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverImage } from "@/components/game-card";
import { CompanyChips } from "@/components/company-chips";
import { ContentKindHead } from "@/components/content-kind-head";
import { DlcSection } from "@/components/dlc-list";
import { UpgradeNotes } from "@/components/upgrade-note";
import { MultiplayerBadges } from "@/components/multiplayer-badges";
import { NewsList } from "@/components/news-list";
import { PatchList, PatchSpeed } from "@/components/patch-list";
import { Sheet } from "@/components/ui/sheet";
import { PlatformPrices, type PlatformPriceItem } from "@/components/platform-prices";
import { PlaytimeCard } from "@/components/playtime-card";
import { WishlistButton } from "@/components/wishlist-button";
import { BackLink } from "@/components/ui/back-link";
import { buttonClass } from "@/components/ui/button";
import { Card, Page, SectionHead } from "@/components/ui/page";
import { formatHours, PLATFORM_LABEL } from "@/lib/format";
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
import { getCurrentUser } from "@/server/services/users";
import { isInWishlist } from "@/server/services/wishlist";
import { cardClass } from "@/components/ui/page";
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

type SummaryCellProps = { label: string; value: string; was?: string; note?: string };

function SummaryCell({ label, value, was, note }: SummaryCellProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5">
      <dt className="text-[11.5px] text-dim">{label}</dt>
      <dd className="flex flex-col gap-0.5">
        {/* 정가는 현재가 옆에 취소선으로 붙인다 — 카드 목록과 같은 모양이라야 "얼마나 싸졌나" 를 같은 눈으로 읽는다 */}
        <span className="flex items-baseline gap-1.5">
          <span className="text-[20px] font-bold tracking-[-0.02em] text-ink">{value}</span>
          {was && <span className="text-[12px] text-dim-2 line-through">{was}</span>}
        </span>
        {note && <span className="text-[11.5px] text-mut">{note}</span>}
      </dd>
    </div>
  );
}

/**
 * 결정 요약 바 — "지금이 싼가 | 얼마나 걸리나 | 살 만한가" 를 최상단에 고정한다.
 *
 * 모르는 값의 칸은 아예 세우지 않는다(2026-09-15). 전에는 네 칸을 늘 그리고 값이 없으면 "-" 를 넣었는데,
 * 카탈로그 대부분이 플레이타임과 평점을 아직 안 갖고 있어서 화면에서 가장 큰 자리가 줄줄이 "-" 였다.
 * 그건 "아직 모은다" 가 아니라 "고장 났다" 로 읽힌다. 대신 아는 게 최저가뿐이면 한 줄로 그 사실을 말한다 —
 * 모르는 것을 네 번 반복하는 것보다 한 번 적는 편이 짧고 정직하다.
 */
function DecisionSummary({ game, className, style }: { game: GameDetail; className?: string; style?: React.CSSProperties }) {
  const best = cheapestPlatform(game.platforms);
  const score = bestScore(game.platforms);
  const user = bestUserScore(game.platforms);
  const main = game.playtime?.mainStoryHours;

  const cells: SummaryCellProps[] = [
    {
      label: "지금 최저가",
      value: best ? formatPrice(best.currentPrice, best.currency) : "-",
      was: best && best.discountPct && best.listPrice !== null ? formatPrice(best.listPrice, best.currency) : undefined,
      note: best ? `${PLATFORM_LABEL[best.platform] ?? best.platform}${best.discountPct ? ` | -${best.discountPct}%` : ""}` : undefined,
    },
  ];
  // 완전 정복 시간을 여기 붙이지 않는 이유(2026-09-15): 같은 화면의 플레이타임 카드가 3종을 막대까지 붙여 말한다.
  // 요약 바는 "얼마나 걸리나" 에 한 값으로 답하는 자리다 — 두 값을 적으면 카드와 겹치기만 하고 결론이 흐려진다
  if (main) {
    cells.push({ label: "메인 스토리", value: formatHours(main) });
  }
  if (score) {
    cells.push({ label: "평론가 평점", value: String(score.value), note: score.note ?? undefined });
  }
  // 유저 점수를 평론가 점수 옆에 따로 세우는 이유: 두 값이 갈리는 게임이 있고, 그 사실 자체가
  // 살지 말지를 정하는 정보다. 하나로 합치면 그 갈림이 사라진다
  if (user) {
    cells.push({
      label: "유저 점수",
      value: userScoreValueText(user.score.value, user.score.kind),
      note: `${PLATFORM_LABEL[user.platform] ?? user.platform} | ${userScoreNoteText(user.score.kind, user.score.count)}`,
    });
  }

  return (
    <dl
      className={cardClass(`grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] divide-x divide-line-soft overflow-hidden ${className ?? ""}`)}
      style={style}
    >
      {cells.map((c) => (
        <SummaryCell key={c.label} {...c} />
      ))}
      {cells.length === 1 && (
        <p className="flex items-center px-4 py-3.5 text-[12.5px] leading-[1.6] text-dim">
          {GAME_MESSAGES.summaryPending}
        </p>
      )}
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

/** 아직 오지 않은 찜 버튼의 자리. 같은 크기여야 도착할 때 옆 버튼이 밀리지 않는다 */
function WishlistSlotFallback() {
  return (
    <span aria-hidden className={buttonClass({ variant: "secondary", className: "pointer-events-none opacity-60" })}>
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
  const [game, patchGroups, perHourScale] = await Promise.all([
    getGameBySlugCached(slug),
    // 패치 기록은 상세 조회와 같은 태그(`game:<slug>`)로 따로 캐시된다 — 붙는 테이블이 game_platforms 라
    // 상세 질의에 얹으면 화면이 안 쓰는 행까지 통째로 끌려온다
    getGamePatchesCached(slug),
    // 시간당 가격을 세울 눈금 - 이 게임이 아니라 카탈로그의 성질이라 게임 태그와 따로 캐시된다
    getPricePerHourScale(),
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
    <Page pad="detail" gap={28}>
      <BackLink href={ROUTES.game}>게임 목록으로</BackLink>

      {/* 섹션 1 — 헤더 블록.
          안쪽 조각마다 .enter-item 을 붙이는 이유: 헤더는 300px 넘는 덩어리라 통째로 페이드하면
          화면이 한 번에 툭 던져진다. 커버, 제목, 요약, 장르, 설명 순으로 들어와야 목록 화면과 결이 같다.
          (조각이 하나라도 .enter-item 이면 감싼 section 은 애니메이션에서 빠진다 — 겹쳐 페이드 방지) */}
      <section className="flex flex-wrap gap-5 sm:gap-6">
        <div
          style={stagger(0)}
          className={`enter-item relative w-full shrink-0 overflow-hidden rounded-xl border border-line bg-surface-3 ${
            // 좁은 화면은 폭을 꽉 채운 띠 하나다 — 190px 슬롯을 그대로 두면 오른쪽 130px 이 빈 채로 남고,
            // 제목이 그 옆에 끼어 두세 글자마다 줄바꿈했다.
            //
            // 비율을 원본에 맞춰 가르는 이유: 세로 아트를 가로 배너 칸에 넣으면 위아래가 잘려 로고가 사라지고,
            // 가로 배너를 세로 칸에 넣으면 좌우가 잘린다. 4:3 은 세로 아트를 반 정도만 보여 주되
            // 인물과 로고가 모이는 가운데 띠를 남기는 선이다(3:4 원본을 그대로 펴면 420px 이라 제목이 화면 밖으로 밀린다).
            game.portraitUrl
              ? "aspect-[4/3] sm:aspect-[3/4] sm:w-[190px]"
              : "aspect-[460/215] sm:max-w-[380px]"
          }`}
        >
          <CoverImage src={game.portraitUrl ?? game.coverUrl} alt={`${title} 커버`} sizes="(max-width: 639px) 100vw, 190px" priority />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:min-w-[280px]">
          <div className="enter-item flex flex-wrap items-start justify-between gap-3" style={stagger(1)}>
            <div className="flex min-w-0 flex-col gap-1.5">
              {/* 자식(DLC, 에디션)일 때만 선다 - 본편 화면에서는 아무것도 그리지 않는다 */}
              <ContentKindHead contentType={game.contentType} parent={game.parent} className="mb-0.5" />
              <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.03em] text-ink">{title}</h1>
              {game.titleKo && <p className="text-[13px] text-dim">{game.titleEn}</p>}
              <CompanyChips companies={game.companies} developer={game.developer} publisher={game.publisher} />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Suspense fallback={<WishlistSlotFallback />}>
                <WishlistSlot gameId={game.id} />
              </Suspense>
              <Link href={`${ROUTES.alerts}?game=${encodeURIComponent(game.slug)}`} className={buttonClass({ variant: "primary" })}>
                할인 알림 받기
              </Link>
            </div>
          </div>

          <DecisionSummary game={game} className="enter-item" style={stagger(2)} />

          <div className="enter-item flex flex-wrap items-center gap-2" style={stagger(3)}>
            {game.genres.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="장르">
                {game.genres.map((g) => (
                  <li key={g} className="rounded-full bg-surface-2 px-[11px] py-1 text-[12px] text-ink-2">
                    {g}
                  </li>
                ))}
              </ul>
            )}
            {/* 구분선은 양쪽에 실제로 뭔가 있을 때만 긋는다 — 미지원 칩을 안 그리게 되면서
                플레이 방식이 통째로 비는 게임이 생겼고, 그때 선만 홀로 서 있었다 */}
            {game.genres.length > 0 && hasPlayModes && <span aria-hidden className="h-5 w-px bg-line" />}
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

      {/*
        섹션 2 — 가격/뉴스 + 사이드바.

        칸마다 min-w-0 을 다는 이유(2026-09-16): 격자 칸의 기본 최소 크기는 auto 다. 그래서 칸은
        "안쪽에서 줄바꿈 없이 필요한 폭" 아래로는 절대 줄지 않는다. 안에는 한 줄로 자르는 제목
        (Clamp, truncate = white-space: nowrap)이 있고, 그 제목의 최소 폭은 잘리기 전 글자 전체 폭이다 —
        자식 컴포넌트가 min-w-0, flex-1 을 아무리 붙여도 그 값은 칸까지 올라온다.
        긴 DLC 제목 하나가 상세 본문 전체를 520px 로 밀어 화면 밖으로 내보냈다(390px 기기, ea-sports-fc-26).
        좁은 화면은 칸이 하나뿐이라 minmax(0, ...) 로는 못 막는다 — 칸 자체에 붙여야 한다.
      */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="enter-item flex min-w-0 flex-col gap-6" style={stagger(5)}>
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
            {/* 요약 바가 인용한 스토어의 유저 점수는 행 안에서 또 적지 않는다(platform-prices 주석) */}
            <PlatformPrices platforms={platforms} quotedUserScorePlatform={bestUserScore(game.platforms)?.platform ?? null} />
            <UpgradeNotes upgrades={game.upgrades} />
          </section>

          {/* 에디션과 DLC 는 같은 줄 모양을 쓴다 - 묻는 것이 "제목과 값" 으로 같고,
              모양이 다르면 같은 화면에서 두 번 배워야 한다.
              머리(건수)까지 DlcSection 안에 있다 - 플랫폼 칩으로 거른 건수를 말해야 해서다 */}
          {game.editions.length > 0 && (
            <DlcSection id="edition-heading" title={GAME_MESSAGES.editionHeading} dlcs={game.editions} hasAddOns={false} />
          )}

          {(game.dlcs.length > 0 || hasAddOns) && (
            <DlcSection id="dlc-heading" title={GAME_MESSAGES.dlcHeading} dlcs={game.dlcs} hasAddOns={hasAddOns} />
          )}

          {patchGroups.length > 0 && (
            <section aria-labelledby="patches-heading" className="flex flex-col gap-3">
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

          <section aria-labelledby="news-heading" className="flex flex-col gap-3">
            <SectionHead id="news-heading" title="관련 뉴스" />
            <Card className="px-4">
              <NewsList items={game.news} />
            </Card>
          </section>
        </div>

        <aside className="enter-item flex min-w-0 flex-col gap-4" style={stagger(6)}>
          <PlaytimeCard playtime={game.playtime} currentPrice={best?.currentPrice ?? null} currency={best?.currency} scale={perHourScale} />

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
