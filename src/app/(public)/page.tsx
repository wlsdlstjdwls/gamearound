// 홈 — "오늘 뭘 사면 되는가"에 먼저 답한다 (§5.1, 풀 라우트 캐시 1h + 태그 home)
// 검색 폼은 헤더 검색창이 유일한 진입점이므로 히어로에서 제거했다(리디자인).
//
// 2026-09-21 리디자인: 흰 판과 테두리를 전부 걷어냈다. 화면을 가르는 것은 섹션 사이의 큰 여백과
// 헤어라인 한 줄뿐이고, 색을 가진 것은 카드의 할인 스탬프와 마감 임박 표시뿐이다.
import { formatPrice } from "@/lib/currency";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import Link from "next/link";
import { DiscountText } from "@/components/ui/discount";
import { CoverImage, GameCard } from "@/components/game-card";
import { Clamp } from "@/components/ui/tooltip";
import { NewsList } from "@/components/news-list";
import { HomeDeals } from "@/components/home-deals";
import { EmptyState } from "@/components/empty-state";
import { SaleBadge } from "@/components/sale-badge";
import { Page, ROW, ROWS, SectionHead } from "@/components/ui/page";
import { PLATFORM_LABEL } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { getHomeData } from "@/server/services/games";
import { getRunningSteamSale, type RunningSaleDto } from "@/server/services/sales";
import { HomeSaleBanner } from "@/components/home-sale-banner";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — 근거, 수치는 lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

type HomeData = Awaited<ReturnType<typeof getHomeData>>;

/** DB 미설정/미연결 시에도 홈 셸은 뜨도록 빈 데이터로 폴백 (로컬 첫 실행용) */
async function loadHomeData(): Promise<{ data: HomeData; dbError: string | null }> {
  try {
    return { data: await getHomeData(), dbError: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[home] 데이터 조회 실패:", msg);
    return { data: { discounts: [], endingSoon: [], recentReleases: [], latestNews: [] }, dbError: msg };
  }
}

/** 배너는 덤이다 — 이 조회가 실패해도 홈은 그대로 서야 해서 실패를 "배너 없음" 으로 접는다 */
async function loadRunningSale(): Promise<RunningSaleDto | null> {
  try {
    return await getRunningSteamSale();
  } catch (e) {
    console.error("[home] 세일 판정 실패:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

export default async function HomePage() {
  // 두 조회는 서로 기다릴 이유가 없다 — 줄 세우면 Neon 왕복이 둘이 된다
  const [{ data, dbError }, runningSale] = await Promise.all([loadHomeData(), loadRunningSale()]);
  // 곧 끝나는 할인은 서버가 따로 골라 준다 — 위 줄과 겹치지 않아야 해서다(services/games/home 주석)
  const { discounts, endingSoon: soon, recentReleases, latestNews } = data;

  return (
    <Page pad="home" gap={56}>
      {dbError && (
        <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[13px] text-danger">
          데이터베이스에 연결할 수 없습니다. <code>.env.local</code>의 <code>DATABASE_URL</code>을 설정하고 <code>pnpm db:migrate</code>를 실행하세요.
        </div>
      )}

      {runningSale && <HomeSaleBanner sale={runningSale} />}

      {/* 섹션 1 — 할인 중인 게임. 큰 머리글을 걷어낸 자리라(2026-09-15) 이 제목이 문서의 h1 이다 */}
      <section aria-labelledby="discounts-heading" className="flex flex-col gap-[22px]">
        {/* 곁말과 갈래 칩을 뗐다(2026-09-22, 사용자 지정). 칩은 목록의 플랫폼 필터와 같은 일을 하는
            두 번째 입구였고, 곁말("한국 스토어 기준 플랫폼별 최저가")은 카드가 이미 스토어 이름을
            줄마다 적고 있어 같은 말을 머리에서 한 번 더 하고 있었다 */}
        {/* 전체 보기는 제목 줄 오른쪽 끝에 붙인다(2026-09-22 사용자 요청) — 아래 뉴스, 최근 출시와 같은 자리다.
            격자 밑에 있던 큰 단추는 뗐다: 같은 곳으로 가는 입구가 한 마디에 둘이면 둘 다 덜 읽히고,
            좁은 화면에서는 카드 열두 장을 다 지나야 보여서 사실상 없는 입구였다 */}
        <div className="enter-item flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1" style={stagger(0)}>
          <h1 id="discounts-heading" className="text-[22px] font-extrabold leading-[1.2] tracking-[-0.03em] text-ink sm:text-[26px]">
            지금 할인 중
          </h1>
          {discounts.length > 0 && (
            <Link href={`${ROUTES.game}?sale=1`} className="tap ml-auto inline-flex items-center text-[13px] text-acc hover:underline">
              전체 보기
            </Link>
          )}
        </div>

        {discounts.length === 0 ? (
          <EmptyState
            title="지금 할인 중인 게임이 없습니다"
            description="할인 중인 게임이 확인되면 이 자리에 표시돼요."
            action={{ href: ROUTES.game, label: "전체 게임 목록 보기" }}
          />
        ) : (
          // 개인화한 사람에게는 마운트 뒤 취향 줄로 갈아 끼워진다(components/home-deals 주석)
          <HomeDeals initial={discounts} />
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
                    <span className="relative aspect-[460/215] w-16 shrink-0 overflow-hidden rounded-[var(--radius-inset)] bg-surface-3 shadow-hair">
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
                        {/* 할인율을 값 옆에 세운다(2026-09-22, 사용자 지적: "할인율이 안보임").
                            이 줄에는 커버 위 스탬프가 없어서, 취소선 정가만으로는 "얼마나 싸졌나" 를
                            두 숫자를 머릿속에서 나눠 봐야 알 수 있었다. 카드의 스탬프와 같은 브랜드 색이다 */}
                        {g.best?.discountPct != null && g.best.discountPct > 0 && (
                          <span className="font-bold text-acc"><DiscountText pct={g.best.discountPct} /></span>
                        )}
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
              <Link href={ROUTES.news} className="text-[13px] text-acc hover:underline">
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
          <ul className={HOME_GRID_CLASS}>
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
