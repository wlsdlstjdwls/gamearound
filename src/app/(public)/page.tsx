// 홈 — "오늘 뭘 사면 되는가"에 먼저 답한다 (§5.1, 풀 라우트 캐시 1h + 태그 home)
// 검색 폼은 헤더 검색창이 유일한 진입점이므로 히어로에 검색창을 두지 않는다(리디자인).
//
// 2026-10-02 재구성(사용자: "디자인도 없고 투박하다, 서비스적으로 어필하려면"): 같은 카드 격자 44칸을 걷고
// 줄마다 모양을 갈랐다 — 할인 격자, 옆으로 넘기는 줄(Rail), 번호 목록(HomeRanking),
// 두 기둥(곧 마감, 뉴스). 격자는 첫 줄 하나만 남겼다. 모양이 바뀌는 곳이 마디가 바뀌는 곳이다.
// 줄 순서는 "왜 여기 왔나" 순이다: 무엇이 싸나(할인) - 어디서 사면 더 싸나(스토어 차이, 이 서비스만 말할 수 있는 값) -
// 무엇이 팔리나(순위) - 가볍게 살 것(만 원 이하) - 놓치면 안 될 것(마감), 새 소식 - 새로 나온 것(출시).
import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { NewsList } from "@/components/news-list";
import { HomeDeals } from "@/components/home-deals";
import { EmptyState } from "@/components/empty-state";
import { Page, SectionHead } from "@/components/ui/page";
import { Rail } from "@/components/ui/rail";
import { HomeRanking } from "@/components/home/ranking";
import { EndingSoonList } from "@/components/home/ending-soon";
import { HOME_MESSAGES as M } from "@/lib/home/messages";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { getHomeData, listGames } from "@/server/services/games";
import type { GameSummary } from "@/server/services/games/dto";
import { getRunningSteamSale, type RunningSaleDto } from "@/server/services/sales";
import { HomeSaleBanner, SALE_BANNER_PREVIEW } from "@/components/home-sale-banner";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — 근거, 수치는 lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

/** DB 가 안 열릴 때 홈 셸만 세우는 빈 값 */
const EMPTY_HOME = {
  discounts: [],
  endingSoon: [],
  recentReleases: [],
  latestNews: [],
  storeDeals: [],
  popular: [],
  budget: [],
};

type HomeData = Awaited<ReturnType<typeof getHomeData>>;

/** DB 미설정/미연결 시에도 홈 셸은 뜨도록 빈 데이터로 폴백 (로컬 첫 실행용) */
async function loadHomeData(): Promise<{ data: HomeData; dbError: string | null }> {
  try {
    return { data: await getHomeData(), dbError: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[home] 데이터 조회 실패:", msg);
    return { data: { ...EMPTY_HOME }, dbError: msg };
  }
}

/** 배너는 덤이다 — 이 조회가 실패해도 홈은 그대로 서야 해서 실패를 "배너 없음" 으로 접는다 */
async function loadRunningSale(): Promise<{ sale: RunningSaleDto; preview: GameSummary[] } | null> {
  try {
    const sale = await getRunningSteamSale();
    if (!sale) return null;
    // 배너의 커버는 배너가 여는 목록의 첫 줄과 같다(인기순). 세일이 없는 날에는 이 왕복이 아예 없다.
    // 넷의 두 배를 넘기는 이유: 커버 없는 게임을 배너가 거르고 나서도 네 칸이 차야 한다
    const list = await listGames({ event: sale.key });
    return { sale, preview: list.items.slice(0, SALE_BANNER_PREVIEW * 2) };
  } catch (e) {
    console.error("[home] 세일 판정 실패:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

export default async function HomePage() {
  // 두 조회는 서로 기다릴 이유가 없다 — 줄 세우면 Neon 왕복이 둘이 된다
  const [{ data, dbError }, runningSale] = await Promise.all([loadHomeData(), loadRunningSale()]);
  // 곧 끝나는 할인은 서버가 따로 골라 준다 — 위 줄과 겹치지 않아야 해서다(services/games/home 주석)
  const { discounts, endingSoon, recentReleases, latestNews, storeDeals, popular, budget } = data;

  return (
    <Page pad="home" gap={56}>
      {dbError && (
        <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-[13px] text-danger">
          데이터베이스에 연결할 수 없습니다. <code>.env.local</code>의 <code>DATABASE_URL</code>을 설정하고 <code>pnpm db:migrate</code>를 실행하세요.
        </div>
      )}

      {runningSale && <HomeSaleBanner sale={runningSale.sale} preview={runningSale.preview} />}

      {/* 1 — 할인 격자. 머리 약속을 걷어 이 제목이 다시 문서의 h1 이다(2026-10-02). 개인화한 사람에게는 마운트 뒤 취향 줄로 갈아 끼워진다(components/home-deals 주석) */}
      <section aria-labelledby="discounts-heading" className="flex flex-col gap-[22px]">
        <SectionHead
          className="enter-item"
          style={stagger(0)}
          id="discounts-heading"
          as="h1"
          title={M.discountsTitle}
          action={discounts.length > 0 && <SeeAll href={`${ROUTES.game}?sale=1`} />}
        />
        {discounts.length === 0 ? (
          <EmptyState
            title="지금 할인 중인 게임이 없습니다"
            description="할인 중인 게임이 확인되면 이 자리에 표시돼요."
            action={{ href: ROUTES.game, label: "전체 게임 목록 보기" }}
          />
        ) : (
          // 좁은 화면은 여덟 장까지만(2026-10-02). 한 줄에 한 장이라 스물넷이면 같은 카드가 6,000px 이어져
          // 아래의 다른 줄에 닿기 전에 손을 놓는다. 나머지는 머리의 "전체 보기" 가 받는다. 넓은 화면은 그대로 24
          <div className="max-sm:[&_li:nth-child(n+9)]:hidden">
            <HomeDeals initial={discounts} />
          </div>
        )}
      </section>

      {/* 2 — 스토어만 바꿔도 더 싼 게임. 카드마다 초록 판정 줄이 "어디서 얼마" 를 말한다(lib/games/saving) */}
      <RailSection id="store-deals" title={M.storeDealsTitle} note={M.storeDealsNote} games={storeDeals} />

      {/* 3 — 인기 순위. 번호 목록이라 격자와 줄 사이에서 모양이 한 번 더 바뀐다 */}
      {popular.length > 0 && (
        <section aria-labelledby="popular-heading" className="flex flex-col gap-3">
          <SectionHead id="popular-heading" title={M.popularTitle} note={M.popularNote} action={<SeeAll href={ROUTES.game} />} />
          <HomeRanking games={popular} />
        </section>
      )}

      {/* 4 — 만 원 이하. 같은 줄 모양이지만 사이에 순위 목록이 끼어 둘이 붙어 보이지 않는다 */}
      <RailSection id="budget" title={M.budgetTitle} games={budget} href={`${ROUTES.game}?sale=1`} />

      {/* 5 — 곧 끝나는 할인 / 최신 뉴스.
          min() 을 씌우는 이유: auto-fit 의 minmax 는 화면이 그 값보다 좁아도 칸을 줄이지 않는다.
          320px 기기에서 360px 칸 + 좌우 여백이 화면을 넘어 홈 전체가 가로로 밀렸다. items-start: 두 기둥이 서로의 키를 따라가지 않게 한다 */}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-start gap-x-12 gap-y-10">
        <div className="enter-item flex flex-col gap-3.5" style={stagger(0)}>
          <SectionHead title={M.endingSoonTitle} />
          {endingSoon.length === 0 ? (
            <p className="border-t border-line-strong py-5 text-[13px] text-dim">{M.endingSoonEmpty}</p>
          ) : (
            <EndingSoonList games={endingSoon} />
          )}
        </div>
        <div className="enter-item flex flex-col gap-3.5" style={stagger(1)}>
          <SectionHead title={M.newsTitle} action={<SeeAll href={ROUTES.news} />} />
          <NewsList items={latestNews} showGame />
        </div>
      </section>

      {/* 6 — 최근 출시. 격자 20칸이던 것을 줄로(2026-10-02) — 끝에 전체 목록이 있다 */}
      <RailSection id="releases" title={M.releasesTitle} games={recentReleases} variant="release" href={`${ROUTES.game}?sort=release`} linkLabel={M.allGames} />
    </Page>
  );
}

function SeeAll({ href, label = M.seeAll }: { href: string; label?: string }) {
  return (
    <Link href={href} className="tap inline-flex items-center text-[13px] text-acc hover:underline">
      {label}
    </Link>
  );
}

/** 옆으로 넘기는 줄 한 마디. 비면 마디째 안 세운다 — 제목만 선 빈 줄은 고장으로 읽힌다 */
function RailSection({
  id,
  title,
  note,
  games,
  variant,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  note?: string;
  games: GameSummary[];
  variant?: "discount" | "release";
  href?: string;
  linkLabel?: string;
}) {
  if (games.length === 0) return null;
  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
      <SectionHead id={`${id}-heading`} title={title} note={note} action={href && <SeeAll href={href} label={linkLabel} />} />
      <Rail
        labels={{ prev: M.railPrev, next: M.railNext }}
        items={games.map((g) => ({ key: g.slug, node: <GameCard game={g} variant={variant} /> }))}
      />
    </section>
  );
}
