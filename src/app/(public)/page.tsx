// 홈(기획서 v2.0 S-01, 목업 v66) — 히어로, 오늘의 할인 4, 출시 예정 4, 인기 게임과 장르 바로가기 (풀 라우트 캐시 1h + 태그 home)
//
// 2026-10-26 목업 순서로 다시 세웠다(사용자: "메인화면도 목업이랑 다르다", "모든 화면 최대한 동일하게").
// 10-02 재구성의 줄들(스토어 차이, 인디, 곧 마감과 뉴스)은 목업 네 마디 아래에 남긴다 — 이 서비스가 모은 값이라서다.
// 만 원 이하 줄과 최근 출시 줄은 내렸다: 앞의 할인 줄과 출시 예정 줄이 같은 질문에 답한다.
import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { NewsList } from "@/components/news-list";
import { HomeDeals } from "@/components/home-deals";
import { EmptyState } from "@/components/empty-state";
import { DbUnavailable } from "@/components/db-unavailable";
import { Page, SectionHead } from "@/components/ui/page";
import { Rail } from "@/components/ui/rail";
import { HomeRanking } from "@/components/home/ranking";
import { HomeHero } from "@/components/home/hero";
import { ChipLink } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { HOME_FOUR_GRID_CLASS, HOME_FOUR_ITEM_CLASS } from "@/lib/games/grid";
import { HOME_GENRE_LIMIT, HOME_TOP_LIMIT } from "@/lib/home/rows";
import { gamesHref } from "@/lib/games-query";
import { formatReleaseDay } from "@/lib/format";
import { EndingSoonList } from "@/components/home/ending-soon";
import { HOME_MESSAGES as M } from "@/lib/home/messages";
import { homeDbFailure, type HomeDbFailure } from "@/lib/home/db-failure";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { getGameFacets, getHomeData, getUpcomingSoon, listGames, type UpcomingEntry } from "@/server/services/games";
import type { GameSummary } from "@/server/services/games/dto";
import { getRunningSteamSale, type RunningSaleDto } from "@/server/services/sales";
import { HomeSaleBanner, SALE_BANNER_PREVIEW } from "@/components/home-sale-banner";
import { IndieCard } from "@/components/indie/indie-card";
import { INDIE_MESSAGES } from "@/lib/indie/messages";
import type { IndieCardDto } from "@/lib/indie/dto";
import { listIndieForHome } from "@/server/services/indie";

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

/** DB 가 안 열릴 때: 운영 실행 중이면 던져 직전 캐시를 지키고, 빌드와 개발에서는 빈 셸로 접는다(lib/home/db-failure) */
async function loadHomeData(): Promise<{ data: HomeData; dbFailure: HomeDbFailure | null }> {
  try {
    return { data: await getHomeData(), dbFailure: null };
  } catch (e) {
    console.error("[home] 데이터 조회 실패:", e instanceof Error ? e.message : String(e));
    const mode = homeDbFailure({ nodeEnv: process.env.NODE_ENV, nextPhase: process.env.NEXT_PHASE });
    if (mode === "rethrow") throw e;
    return { data: { ...EMPTY_HOME }, dbFailure: mode };
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

/** 인디 줄도 덤이다 — 실패하면 줄이 안 설 뿐 홈은 선다. 이 페이지 ISR 에 얹혀 있어 쓰기 경로가 revalidatePath 로 민다 */
async function loadIndie(): Promise<IndieCardDto[]> {
  try {
    return await listIndieForHome();
  } catch (e) {
    console.error("[home] 인디 줄 조회 실패:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

/** 출시 예정 줄도 덤이다 — 실패하면 줄이 안 설 뿐이다 */
async function loadUpcoming(): Promise<UpcomingEntry[]> {
  try {
    return await getUpcomingSoon(HOME_TOP_LIMIT);
  } catch (e) {
    console.error("[home] 출시 예정 줄 조회 실패:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

/** 장르 바로가기 — 게임이 많이 붙은 장르부터. 실패하면 칩이 안 선다 */
async function loadGenres(): Promise<string[]> {
  try {
    const facets = await getGameFacets();
    return facets.genres.slice(0, HOME_GENRE_LIMIT).map((g) => g.name);
  } catch (e) {
    console.error("[home] 장르 조회 실패:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

export default async function HomePage() {
  // 두 조회는 서로 기다릴 이유가 없다 — 줄 세우면 Neon 왕복이 둘이 된다
  const [{ data, dbFailure }, runningSale, indie, upcoming, genres] = await Promise.all([loadHomeData(), loadRunningSale(), loadIndie(), loadUpcoming(), loadGenres()]);
  // 곧 끝나는 할인은 서버가 따로 골라 준다 — 위 줄과 겹치지 않아야 해서다(services/games/home 주석)
  const { discounts, endingSoon, latestNews, storeDeals, popular } = data;

  // DB 가 안 열린 날에는 줄을 하나도 세우지 않는다. 빈 줄은 "할인 마감이 없어요", "뉴스가 없어요" 처럼 사실이 아닌 말을 한다
  if (dbFailure) {
    return (
      <Page pad="home">
        <DbUnavailable size="page" retryHref={ROUTES.home} footnote={dbFailure === "dev-hint" ? M.devDbHint : undefined} />
      </Page>
    );
  }

  return (
    <Page pad="home" gap={48}>
      <HomeHero />

      {runningSale && <HomeSaleBanner sale={runningSale.sale} preview={runningSale.preview} />}

      {/* 1 — 오늘의 할인 넷. 더보기는 할인 게임(S-04). 개인화한 사람에게는 마운트 뒤 취향 줄로 갈아 끼워진다(components/home-deals) */}
      <section aria-labelledby="discounts-heading" className="flex flex-col gap-4">
        <SectionHead
          className="enter-item"
          style={stagger(0)}
          id="discounts-heading"
          title={M.todayDealsTitle}
          action={discounts.length > 0 && <SeeAll href={`${ROUTES.game}?sale=1`} label={M.more} />}
        />
        {discounts.length === 0 ? (
          <EmptyState title={M.discountsEmptyTitle} description={M.discountsEmptyBody} action={{ href: ROUTES.game, label: M.discountsEmptyAction }} />
        ) : (
          <HomeDeals initial={discounts} />
        )}
      </section>

      {/* 2 — 출시 예정 넷, 출시일이 가까운 순. 더보기는 출시 예정(S-03). 좁은 화면은 할인 줄과 같은 넘기는 줄(lib/games/grid) */}
      <section aria-labelledby="upcoming-heading" className="flex flex-col gap-4">
        <SectionHead id="upcoming-heading" title={M.upcomingTitle} action={upcoming.length > 0 && <SeeAll href={ROUTES.upcoming} label={M.more} />} />
        {upcoming.length === 0 ? (
          <p className="text-[13.5px] text-dim">{M.upcomingEmpty}</p>
        ) : (
          <ul className={HOME_FOUR_GRID_CLASS}>
            {upcoming.map((e, i) => (
              <li key={e.game.slug} className={cn("enter-item", HOME_FOUR_ITEM_CLASS)} style={stagger(i + 1)}>
                <GameCard game={e.game} variant="release" releaseText={formatReleaseDay(e.releaseDate)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3 — 인기 게임과 장르 바로가기(기획서 v2.0 S-01 "인기 게임, 장르"). 순위는 번호 목록, 장르는 칩 */}
      {(popular.length > 0 || genres.length > 0) && (
        <section className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {popular.length > 0 && (
            <div className="flex min-w-0 flex-col gap-3">
              <SectionHead id="popular-heading" title={M.popularGamesTitle} note={M.popularNote} action={<SeeAll href={ROUTES.game} label={M.more} />} />
              <HomeRanking games={popular} />
            </div>
          )}
          {genres.length > 0 && (
            <nav aria-labelledby="genres-heading" className="flex min-w-0 flex-col gap-3">
              <SectionHead id="genres-heading" title={M.genresTitle} />
              <ul className="flex flex-wrap gap-2">
                {genres.map((g) => (
                  <li key={g}>
                    <ChipLink href={gamesHref({ genre: g })} outline>
                      {g}
                    </ChipLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </section>
      )}

      {/* 4 — 스토어만 바꿔도 더 싼 게임. 카드마다 초록 판정 줄이 "어디서 얼마" 를 말한다(lib/games/saving) */}
      <RailSection id="store-deals" title={M.storeDealsTitle} note={M.storeDealsNote} games={storeDeals} />

      {/* 5 — 인디 개발자가 직접 올린 게임. 몇 장 안 되면 줄째 안 선다(lib/indie/constants 의 INDIE_HOME_MIN) */}
      {indie.length > 0 && (
        <section aria-labelledby="indie-heading" className="flex flex-col gap-3">
          <SectionHead id="indie-heading" title={INDIE_MESSAGES.homeTitle} note={INDIE_MESSAGES.homeNote} action={<SeeAll href={ROUTES.indie} />} />
          <Rail labels={INDIE_MESSAGES.rail} items={indie.map((p) => ({ key: p.slug, node: <IndieCard post={p} /> }))} />
        </section>
      )}

      {/* 6 — 곧 끝나는 할인 / 최신 뉴스.
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
    </Page>
  );
}

function SeeAll({ href, label = M.seeAll }: { href: string; label?: string }) {
  return (
    // 제목보다 먼저 읽히지 않게 회색으로 물린다(2026-10-07). 보라는 hover 에서만 — 화면의 보라는 할인율이 먼저 가져간다
    <Link href={href} className="tap inline-flex items-center text-[12.5px] font-medium text-mut hover:text-acc hover:underline">
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
