// 게임 상세 — 카드형 (§5.1). 데이터는 tag 캐시(getGameBySlugCached), 로그인 의존 데이터(찜 여부)는 캐시 밖에서 조회
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverImage } from "@/components/game-card";
import { MultiplayerBadges } from "@/components/multiplayer-badges";
import { NewsList } from "@/components/news-list";
import { PlatformTabs, type PlatformTabItem } from "@/components/platform-tabs";
import { PlaytimeStrip } from "@/components/playtime-card";
import { WishlistButton } from "@/components/wishlist-button";
import { formatDateTime } from "@/lib/format";
import { getFreshness } from "@/lib/freshness";
import { displayTitle, getGameBySlugCached } from "@/server/services/games";
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

  return (
    <article className="space-y-6">
      {/* 헤더 카드 */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="grid gap-4 p-4 sm:grid-cols-[240px_1fr] sm:p-6">
          <div className="relative aspect-[460/215] w-full overflow-hidden rounded-lg bg-slate-800 sm:aspect-[3/4]">
            <CoverImage src={game.coverUrl} alt={`${title} 커버`} sizes="(max-width: 640px) 100vw, 240px" priority />
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight text-slate-100 sm:text-3xl">{title}</h1>
                {game.titleKo && <p className="mt-1 text-sm text-slate-400">{game.titleEn}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <WishlistButton gameId={game.id} wished={wished} signedIn={Boolean(user)} />
                <Link
                  href={`/alerts?game=${encodeURIComponent(game.slug)}`}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:border-amber-400 hover:text-amber-300"
                >
                  🔔 가격 알림 설정
                </Link>
              </div>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-slate-500">개발</dt>
              <dd className="text-slate-200">{game.developer ?? "-"}</dd>
              <dt className="text-slate-500">퍼블리셔</dt>
              <dd className="text-slate-200">{game.publisher ?? "-"}</dd>
            </dl>

            {game.genres.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="장르">
                {game.genres.map((g) => (
                  <li key={g} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {g}
                  </li>
                ))}
              </ul>
            )}

            <MultiplayerBadges
              localMaxPlayers={game.localMaxPlayers}
              onlineMaxPlayers={game.onlineMaxPlayers}
              supportsSolo={game.supportsSolo}
              supportsCoop={game.supportsCoop}
              supportsPvp={game.supportsPvp}
            />

            {/* 플레이타임은 구매 결정의 1순위 정보(기획서 3-1) — 상단 헤더 카드 안에 둔다 */}
            <PlaytimeStrip playtime={game.playtime} />

            {game.description && <p className="line-clamp-4 text-sm leading-relaxed text-slate-400">{game.description}</p>}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* 플랫폼 탭 */}
          <section aria-labelledby="platforms-heading" className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 id="platforms-heading" className="text-lg font-bold">
                플랫폼별 가격
              </h2>
              <Link href={`/games/${game.slug}/prices`} className="text-sm text-amber-300 hover:underline">
                가격 변동 그래프 →
              </Link>
            </div>
            <PlatformTabs platforms={platforms} />
          </section>

          {/* 뉴스 */}
          <section aria-labelledby="news-heading" className="space-y-3">
            <h2 id="news-heading" className="text-lg font-bold">
              관련 뉴스
            </h2>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4">
              <NewsList items={game.news} />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {game.sourceRefs.length > 0 && (
            <section aria-labelledby="sources-heading" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h2 id="sources-heading" className="mb-2 text-sm font-semibold text-slate-300">
                정보 출처
              </h2>
              <ul className="flex flex-wrap gap-1.5 text-xs">
                {game.sourceRefs.map((r) =>
                  r.url ? (
                    <li key={r.source}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-300 hover:border-amber-400 hover:text-amber-300"
                      >
                        {r.source}
                        <span className="sr-only"> (새 창에서 열림)</span>
                      </a>
                    </li>
                  ) : (
                    <li key={r.source} className="rounded-full border border-slate-800 px-2 py-0.5 text-slate-500">
                      {r.source}
                    </li>
                  ),
                )}
              </ul>
              <p className="mt-3 text-[11px] text-slate-500">마지막 갱신 {formatDateTime(game.updatedAt)}</p>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
