// 홈 — "오늘 뭘 사면 되는가"에 먼저 답한다 (§5.1, 풀 라우트 캐시 1h + 태그 home)
// 검색 폼은 헤더 검색창이 유일한 진입점이므로 히어로에서 제거했다(리디자인).
//
// 2026-09-21 리디자인: 흰 판과 테두리를 전부 걷어냈다. 화면을 가르는 것은 섹션 사이의 큰 여백과
// 헤어라인 한 줄뿐이고, 색을 가진 것은 카드의 할인 스탬프와 마감 임박 표시뿐이다.
import { formatPrice } from "@/lib/currency";
import Link from "next/link";
import { CoverImage, GameCard } from "@/components/game-card";
import { Clamp } from "@/components/ui/tooltip";
import { NewsList } from "@/components/news-list";
import { EmptyState } from "@/components/empty-state";
import { SaleBadge } from "@/components/sale-badge";
import { Page, ROW, ROWS, SectionHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { chipClass } from "@/components/ui/chip";
import { PLATFORM_LABEL } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { getHomeData, type GameSummary } from "@/server/services/games";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — 근거, 수치는 lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

// 오른쪽 뉴스(HOME_NEWS_LIMIT = 8)와 줄 수를 맞춘다 — 두 기둥의 길이가 크게 어긋나면
// 짧은 쪽 아래가 빈 자리로 남는다
const ENDING_SOON_LIMIT = 8;

/**
 * 제목 옆 갈래 칩 — 누르면 목록의 같은 조건으로 넘어간다.
 *
 * 홈에서 직접 거르지 않는 이유: 홈은 캐시 한 벌(태그 home)로 모두에게 같은 값을 주는 화면이다.
 * 여기에 조건을 달면 조합마다 캐시가 쪼개지고, 그 순간 홈이 목록의 축소판이 된다.
 * 홈은 "지금 뭐가 싼가" 한 장만 보여 주고, 고르는 일은 목록이 받는다.
 */
const DEAL_FILTERS = [
  { label: "전체", href: `${ROUTES.game}?sale=1` },
  { label: PLATFORM_LABEL.steam, href: `${ROUTES.game}?sale=1&platform=steam` },
  { label: PLATFORM_LABEL.ps5, href: `${ROUTES.game}?sale=1&platform=ps5` },
  { label: PLATFORM_LABEL.xbox, href: `${ROUTES.game}?sale=1&platform=xbox` },
  { label: PLATFORM_LABEL.switch, href: `${ROUTES.game}?sale=1&platform=switch` },
] as const;

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
    <Page pad="home" gap={56}>
      {dbError && (
        <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[13px] text-danger">
          데이터베이스에 연결할 수 없습니다. <code>.env.local</code>의 <code>DATABASE_URL</code>을 설정하고 <code>pnpm db:migrate</code>를 실행하세요.
        </div>
      )}

      {/* 섹션 1 — 할인 중인 게임. 큰 머리글을 걷어낸 자리라(2026-09-15) 이 제목이 문서의 h1 이다 */}
      <section aria-labelledby="discounts-heading" className="flex flex-col gap-[22px]">
        <div className="enter-item flex flex-wrap items-end justify-between gap-x-6 gap-y-4" style={stagger(0)}>
          <div>
            <h1 id="discounts-heading" className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.045em] text-ink sm:text-[34px]">
              지금 할인 중
            </h1>
            <p className="mt-1.5 text-[13.5px] text-mut">한국 스토어 기준 플랫폼별 최저가</p>
          </div>
          <nav aria-label="할인 갈래" className="flex flex-wrap items-center gap-1.5 text-[13px]">
            {DEAL_FILTERS.map((f, i) => (
              <Link key={f.label} href={f.href} className={chipClass({ active: i === 0 })}>
                {f.label}
              </Link>
            ))}
          </nav>
        </div>

        {discounts.length === 0 ? (
          <EmptyState
            title="지금 할인 중인 게임이 없습니다"
            description="할인 중인 게임이 확인되면 이 자리에 표시돼요."
            action={{ href: ROUTES.game, label: "전체 게임 목록 보기" }}
          />
        ) : (
          <>
            {/* 세로 간격이 가로보다 넓다(36 대 24): 스탬프가 커버 아래로 14px 나와 있어서
                같은 간격이면 아랫줄 카드의 커버를 건드린다 */}
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-x-6 gap-y-9">
              {discounts.map((g, i) => (
                <li key={g.slug} className="enter-item" style={stagger(i + 1)}>
                  <GameCard game={g} variant="discount" />
                </li>
              ))}
            </ul>
            <Link
              href={`${ROUTES.game}?sale=1`}
              className={buttonClass({ variant: "secondary", size: "lg", className: "mt-2 self-center rounded-full px-6" })}
            >
              할인 전체 보기
            </Link>
          </>
        )}
      </section>

      {/* 섹션 2 — 곧 끝나는 할인 / 최신 뉴스 */}
      {/* items-start: 두 기둥이 서로의 키를 따라가지 않게 한다 */}
      {/* min() 을 씌우는 이유: auto-fit 의 minmax 는 화면이 그 값보다 좁아도 칸을 줄이지 않는다.
          320px 기기에서 360px 칸 + 좌우 여백이 화면을 넘어 홈 전체가 가로로 밀렸다 */}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-start gap-x-12 gap-y-10">
        <div className="enter-item flex flex-col gap-3.5" style={stagger(0)}>
          <SectionHead title="곧 할인 마감" />
          {soon.length === 0 ? (
            <p className="border-t border-line-strong py-5 text-[13px] text-dim">종료 시각이 공개된 할인이 없습니다.</p>
          ) : (
            <ul className={ROWS}>
              {soon.map((g) => (
                <li key={g.slug}>
                  <Link href={`/games/${g.slug}`} className={cn(ROW, "flex items-center gap-3.5 py-[13px]")}>
                    {/* 썸네일을 세우는 이유: 제목만 늘어선 목록은 "무슨 게임인지" 를 글자로만 묻는다.
                        카드와 같은 460:215 비율이라 같은 그림이 같은 모양으로 읽힌다 */}
                    <span className="relative aspect-[460/215] w-16 shrink-0 overflow-hidden rounded-[var(--radius-inset)] bg-surface-3">
                      <CoverImage src={g.coverUrl} alt="" sizes="64px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <Clamp className="block text-[14.5px] font-bold tracking-[-0.02em] text-ink">{g.titleKo ?? g.titleEn}</Clamp>
                      {/* 값은 카드와 같은 문법으로 읽힌다 — 할인가가 굵고, 원래 값은 취소선 회색으로 그 옆에 선다.
                          할인가만 적으면 "얼마나 싸졌나" 를 스탬프 없는 이 줄에서는 알 길이 없다 */}
                      <span className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-[12px] text-dim">
                        {g.best && (
                          <>
                            <span>{PLATFORM_LABEL[g.best.platform] ?? g.best.platform}</span>
                            <span aria-hidden>|</span>
                          </>
                        )}
                        <span className="font-bold text-ink">{formatPrice(g.best?.currentPrice, g.best?.currency)}</span>
                        {g.best?.listPrice != null && g.best.listPrice !== g.best.currentPrice && (
                          <span className="text-[11px] text-dim-2 line-through">{formatPrice(g.best.listPrice, g.best.currency)}</span>
                        )}
                      </span>
                    </span>
                    <SaleBadge variant="inline" discountName={null} discountEndsAt={g.best?.discountEndsAt} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="enter-item flex flex-col gap-3.5" style={stagger(1)}>
          <SectionHead
            title="뉴스"
            action={
              <Link href={ROUTES.game} className="text-[13px] text-acc hover:underline">
                전체 보기
              </Link>
            }
          />
          <NewsList items={latestNews} showGame />
        </div>
      </section>

      {/* 섹션 3 — 최근 출시 */}
      {recentReleases.length > 0 && (
        <section aria-labelledby="releases-heading" className="flex flex-col gap-[18px]">
          <SectionHead
            className="enter-item"
            style={stagger(0)}
            id="releases-heading"
            title="최근 출시"
            action={
              <Link href={`${ROUTES.game}?sort=release`} className="text-[13px] text-acc hover:underline">
                전체 게임 목록
              </Link>
            }
          />
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-x-5 gap-y-7">
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
