// 홈 — "오늘 뭘 사면 되는가"에 먼저 답한다 (§5.1, 풀 라우트 캐시 1h + 태그 home)
// 검색 폼은 헤더 검색창이 유일한 진입점이므로 히어로에서 제거했다(리디자인).
import { formatPrice } from "@/lib/currency";
import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { Clamp } from "@/components/ui/tooltip";
import { NewsList } from "@/components/news-list";
import { EmptyState } from "@/components/empty-state";
import { SaleBadge } from "@/components/sale-badge";
import { Card, Page, SectionHead } from "@/components/ui/page";
import { PLATFORM_LABEL } from "@/lib/format";
import { nextCollectTimeText } from "@/lib/freshness";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { getHomeData, type GameSummary } from "@/server/services/games";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — 근거, 수치는 lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

const ENDING_SOON_LIMIT = 6;

function endsAtMs(g: GameSummary): number | null {
  const raw = g.best?.discountEndsAt;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

/** 종료 시각이 있는 할인만, 빨리 끝나는 순 */
function endingSoon(discounts: GameSummary[]): GameSummary[] {
  return discounts
    .map((g) => ({ g, t: endsAtMs(g) }))
    .filter((x): x is { g: GameSummary; t: number } => x.t !== null && x.t > Date.now())
    .sort((a, b) => a.t - b.t)
    .slice(0, ENDING_SOON_LIMIT)
    .map((x) => x.g);
}

type HomeData = Awaited<ReturnType<typeof getHomeData>>;

/** DB 미설정/미연결 시에도 홈 셸은 뜨도록 빈 데이터로 폴백 (로컬 첫 실행용) */
async function loadHomeData(): Promise<{ data: HomeData; dbError: string | null }> {
  try {
    return { data: await getHomeData(), dbError: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[home] 데이터 조회 실패:", msg);
    return { data: { discounts: [], recentReleases: [], latestNews: [] }, dbError: msg };
  }
}

export default async function HomePage() {
  const { data, dbError } = await loadHomeData();
  const { discounts, recentReleases, latestNews } = data;
  const soon = endingSoon(discounts);

  return (
    <Page pad="home" gap={36}>
      {dbError && (
        <div role="alert" className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          데이터베이스에 연결할 수 없습니다. <code>.env.local</code>의 <code>DATABASE_URL</code>을 설정하고 <code>pnpm db:migrate</code>를 실행하세요.
        </div>
      )}

      {/* 섹션 1 — 할인 중인 게임. 큰 머리글을 걷어낸 자리라(2026-09-15) 이 제목이 문서의 h1 이다.
          머리글이 말하던 "지금 할인 중인 게임 N개" 는 바로 아래 격자가 그대로 보여 주던 값이었다 */}
      <section aria-labelledby="discounts-heading" className="flex flex-col gap-4">
        <SectionHead
          className="enter-item"
          style={stagger(0)}
          id="discounts-heading"
          as="h1"
          title="할인 중인 게임"
          note="플랫폼별 최저가 기준"
          action={
            <Link href={`${ROUTES.game}?sale=1`} className="text-[12.5px] text-acc hover:underline">
              할인 전체 보기
            </Link>
          }
        />
        {discounts.length === 0 ? (
          <EmptyState
            title="지금 할인 중인 게임이 없습니다"
            description={`수집이 끝나면 이 자리에 표시됩니다. 다음 수집은 ${nextCollectTimeText()}입니다.`}
            action={{ href: ROUTES.game, label: "전체 게임 목록 보기" }}
          />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4">
            {discounts.map((g, i) => (
              <li key={g.slug} className="enter-item" style={stagger(i + 1)}>
                <GameCard game={g} variant="discount" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 섹션 2 — 곧 끝나는 할인 / 최신 뉴스 */}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-7">
        <div className="enter-item flex flex-col gap-4" style={stagger(0)}>
          <SectionHead title="곧 할인 마감" />
          <Card className="px-4">
            {soon.length === 0 ? (
              <p className="py-5 text-[13px] text-dim">종료 시각이 공개된 할인이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {soon.map((g) => (
                  <li key={g.slug} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-[13px]">
                    <Link href={`/games/${g.slug}`} className="min-w-[130px] flex-1 text-[13.5px] font-semibold text-ink hover:text-acc">
                      <Clamp>{g.titleKo ?? g.titleEn}</Clamp>
                    </Link>
                    <span className="text-[12px] text-dim">
                      {g.best ? PLATFORM_LABEL[g.best.platform] ?? g.best.platform : "-"}
                    </span>
                    {/* 할인가만 있으면 "싼지" 를 알 수 없다 — 정가를 옆에 같이 세워야 값이 뜻을 가진다 */}
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-[13.5px] font-bold text-ink">{formatPrice(g.best?.currentPrice, g.best?.currency)}</span>
                      {g.best?.listPrice != null && g.best.listPrice !== g.best.currentPrice && (
                        <span className="text-[11.5px] text-dim-2 line-through">{formatPrice(g.best.listPrice, g.best.currency)}</span>
                      )}
                    </span>
                    <SaleBadge discountName={null} discountEndsAt={g.best?.discountEndsAt} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="enter-item flex flex-col gap-4" style={stagger(1)}>
          <SectionHead title="최신 뉴스" />
          <Card className="px-4">
            <NewsList items={latestNews} showGame />
          </Card>
        </div>
      </section>

      {/* 섹션 3 — 최근 출시 */}
      {recentReleases.length > 0 && (
        <section aria-labelledby="releases-heading" className="flex flex-col gap-4">
          <SectionHead
            className="enter-item"
            style={stagger(0)}
            id="releases-heading"
            title="최근 출시"
            action={
              <Link href={`${ROUTES.game}?sort=release`} className="text-[12.5px] text-acc hover:underline">
                전체 게임 목록
              </Link>
            }
          />
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(238px,1fr))] gap-4">
            {recentReleases.map((g, i) => (
              <li key={g.slug} className="enter-item" style={stagger(i + 1)}>
                <GameCard game={g} variant="release" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
