// 게임 상세 — 결론 → 근거 순 (§5.1). 데이터는 tag 캐시(getGameBySlugCached), 로그인 의존 데이터(찜 여부)는 캐시 밖에서 조회
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverImage } from "@/components/game-card";
import { MultiplayerBadges } from "@/components/multiplayer-badges";
import { NewsList } from "@/components/news-list";
import { PlatformTabs, type PlatformTabItem } from "@/components/platform-tabs";
import { PlaytimeCard } from "@/components/playtime-card";
import { WishlistButton } from "@/components/wishlist-button";
import { buttonClass } from "@/components/ui/button";
import { Card, Page, SectionHead } from "@/components/ui/page";
import { formatDateTime, formatHours, formatKrw, PLATFORM_LABEL } from "@/lib/format";
import { getFreshness } from "@/lib/freshness";
import { ROUTES } from "@/lib/routes";
import { displayTitle, getGameBySlugCached, type GameDetail, type PlatformDto } from "@/server/services/games";
import { getCurrentUser } from "@/server/services/users";
import { isInWishlist } from "@/server/services/wishlist";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlugCached(slug);
  if (!game) return { title: "게임을 찾을 수 없음" };
  const title = displayTitle(game);
  const description =
    game.description?.slice(0, 150) ??
    `${title}의 플랫폼별 가격·할인, 플레이타임, 평점, 뉴스를 손전등에서 확인하세요.`;
  return {
    title,
    description,
    openGraph: { title, description, images: game.coverUrl ? [{ url: game.coverUrl }] : undefined },
  };
}

/** 현재가가 가장 싼 플랫폼 */
function cheapest(platforms: PlatformDto[]): PlatformDto | null {
  const priced = platforms.filter((p) => p.currentPrice !== null);
  if (priced.length === 0) return null;
  return priced.reduce((a, b) => ((b.currentPrice as number) < (a.currentPrice as number) ? b : a));
}

/** 평점 — OpenCritic 우선, 없으면 메타크리틱. 어느 쪽을 썼는지 함께 돌려준다 */
function bestScore(platforms: PlatformDto[]): { value: number; note: string } | null {
  const oc = platforms.map((p) => p.opencriticScore).find((v): v is number => typeof v === "number");
  const mc = platforms.map((p) => p.metacriticScore).find((v): v is number => typeof v === "number");
  if (oc !== undefined) return { value: oc, note: mc !== undefined ? `OpenCritic · 메타 ${mc}` : "OpenCritic" };
  if (mc !== undefined) return { value: mc, note: "메타크리틱" };
  return null;
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

/** 결정 요약 바 — "지금이 싼가 · 얼마나 걸리나 · 살 만한가" 세 값만 최상단에 고정한다 */
function DecisionSummary({ game }: { game: GameDetail }) {
  const best = cheapest(game.platforms);
  const score = bestScore(game.platforms);
  const main = game.playtime?.mainStoryHours;
  const complete = game.playtime?.completionistHours;

  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] divide-x divide-line-soft overflow-hidden rounded-xl border border-line bg-surface">
      <SummaryCell
        label="지금 최저가"
        value={best ? formatKrw(best.currentPrice) : "-"}
        note={best ? `${PLATFORM_LABEL[best.platform] ?? best.platform}${best.discountPct ? ` · -${best.discountPct}%` : ""}` : "가격 정보 없음"}
      />
      <SummaryCell
        label="메인 스토리"
        value={main ? formatHours(main) : "-"}
        note={complete ? `완전 정복 ${formatHours(complete)}` : "HLTB 제보 없음"}
      />
      <SummaryCell label="평점" value={score ? String(score.value) : "-"} note={score?.note ?? "수집된 평점 없음"} />
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

  const title = displayTitle(game);
  const platforms: PlatformTabItem[] = game.platforms.map((p) => ({
    ...p,
    freshness: getFreshness(p.lastSyncedAt, p.syncStatus),
  }));
  const best = cheapest(game.platforms);

  return (
    <Page pad="detail" gap={28}>
      <nav aria-label="브레드크럼">
        <Link href={ROUTES.game} className="text-[12.5px] text-dim transition-colors hover:text-ink">
          ← 게임 목록
        </Link>
      </nav>

      {/* 섹션 1 — 헤더 블록 */}
      <section className="flex flex-wrap gap-6">
        <div
          className={`relative shrink-0 overflow-hidden rounded-xl border border-line bg-surface-3 ${
            // 세로 아트가 있으면 190×250 슬롯을 채운다. 없으면 가로 배너 비율을 유지해 제목이 잘리지 않게 한다
            game.portraitUrl ? "aspect-[3/4] w-[190px]" : "aspect-[460/215] w-full max-w-[380px]"
          }`}
        >
          <CoverImage src={game.portraitUrl ?? game.coverUrl} alt={`${title} 커버`} sizes="(max-width: 640px) 100vw, 190px" priority />
        </div>

        <div className="flex min-w-[280px] flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.03em] text-ink">{title}</h1>
              <p className="mt-1 text-[13px] text-dim">
                {[game.titleKo ? game.titleEn : null, game.developer, game.publisher].filter(Boolean).join(" · ") || "제작사 정보 없음"}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <WishlistButton gameId={game.id} wished={wished} signedIn={Boolean(user)} />
              <Link href={`${ROUTES.alerts}?game=${encodeURIComponent(game.slug)}`} className={buttonClass({ variant: "primary" })}>
                할인 알림 받기
              </Link>
            </div>
          </div>

          <DecisionSummary game={game} />

          <div className="flex flex-wrap items-center gap-2">
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

          {game.description && <p className="max-w-[600px] text-[13.5px] leading-[1.75] text-mut">{game.description}</p>}
        </div>
      </section>

      {/* 섹션 2 — 가격/뉴스 + 사이드바 */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="platforms-heading" className="flex flex-col gap-3">
            <SectionHead
              id="platforms-heading"
              title="플랫폼별 가격"
              action={
                <Link href={`/games/${game.slug}/prices`} className="text-[12.5px] text-acc hover:underline">
                  가격 변동 그래프 →
                </Link>
              }
            />
            <PlatformTabs platforms={platforms} />
          </section>

          <section aria-labelledby="news-heading" className="flex flex-col gap-3">
            <SectionHead id="news-heading" title="관련 뉴스" />
            <Card className="px-4">
              <NewsList items={game.news} />
            </Card>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <PlaytimeCard playtime={game.playtime} currentPrice={best?.currentPrice ?? null} />

          {game.sourceRefs.length > 0 && (
            <section aria-labelledby="sources-heading" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
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
                        <span aria-hidden>↗</span>
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
              <p className="text-[11.5px] text-dim">마지막 갱신 {formatDateTime(game.updatedAt)}</p>
            </section>
          )}
        </aside>
      </div>
    </Page>
  );
}
