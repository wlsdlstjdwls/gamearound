// 홈(기획서 v2.0 S-01, 목업 v66) — 히어로, 오늘의 할인 4, 출시 예정 4, 그 아래 인디 줄 (풀 라우트 캐시 1h + 태그 home)
//
// 2026-10-26 목업 순서로 다시 세웠다(사용자: "메인화면도 목업이랑 다르다", "모든 화면 최대한 동일하게").
// 10-02 재구성의 인디 줄은 목업 마디 아래에 남긴다 — 기획서가 말하는 "인디 개발자 노출" 의 첫 입구라서다.
// 스토어 차이 줄과 스팀 세일 배너도 10-27 에 걷었다(사용자). HomeData.storeDeals, getRunningSteamSale, home-sale-banner 는 남아 있다.
// 2026-10-27 사용자 지시로 인기 게임 순위와 장르 바로가기, 곧 할인 마감, 뉴스 줄을 홈에서 걷었다("없애주라").
// 인기 순위와 장르는 기획서 S-01 의 "인기 게임·장르" 항목이지만 사용자가 뺐다 — 다시 세우지 않는다.
// 부품(home/ranking, home/ending-soon, news-list)과 HomeData 의 popular, endingSoon, latestNews 는 남겨 두었다 — 되살리면 마디만 다시 얹는다.
// 만 원 이하 줄과 최근 출시 줄은 내렸다: 앞의 할인 줄과 출시 예정 줄이 같은 질문에 답한다.
import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { HomeDeals } from "@/components/home-deals";
import { EmptyState } from "@/components/empty-state";
import { DbUnavailable } from "@/components/db-unavailable";
import { Page, SectionHead } from "@/components/ui/page";
import { Rail } from "@/components/ui/rail";
import { HomeHero } from "@/components/home/hero";
import { cn } from "@/lib/cn";
import { HOME_FOUR_GRID_CLASS, HOME_FOUR_ITEM_CLASS } from "@/lib/games/grid";
import { HOME_TOP_LIMIT } from "@/lib/home/rows";
import { formatReleaseDay } from "@/lib/format";
import { HOME_MESSAGES as M } from "@/lib/home/messages";
import { homeDbFailure, type HomeDbFailure } from "@/lib/home/db-failure";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { getHomeData, getUpcomingSoon, type UpcomingEntry } from "@/server/services/games";
import { IndieCard } from "@/components/indie/indie-card";
import { INDIE_MESSAGES } from "@/lib/indie/messages";
import type { IndieCardDto } from "@/lib/indie/dto";
import { listIndieForHome } from "@/server/services/indie";
import { homeIndieAd, withoutSlug, type IndieSpot } from "@/server/services/promotions";
import { AdLabel } from "@/components/ui/ad-label";
import { AdTrack } from "@/components/promo/ad-track";

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

/** 인디 줄도 덤이다 — 실패하면 줄이 안 설 뿐 홈은 선다. 이 페이지 ISR 에 얹혀 있어 쓰기 경로가 revalidatePath 로 민다 */
async function loadIndie(): Promise<IndieCardDto[]> {
  try {
    return await listIndieForHome();
  } catch (e) {
    console.error("[home] 인디 줄 조회 실패:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

/**
 * 인디 줄 첫 칸 광고(services/promotions/indie-spots). 실패하면 광고 없이 선다. ISR 한 시간과 광고 차례 구간(lib/promo/boost)이 같아
 * 다시 그릴 때마다 다음 차례가 앞에 선다
 */
async function loadIndieAd(): Promise<IndieSpot | null> {
  try {
    return await homeIndieAd();
  } catch (e) {
    console.error("[home] 인디 광고 칸 조회 실패:", e instanceof Error ? e.message : String(e));
    return null;
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

export default async function HomePage() {
  // 두 조회는 서로 기다릴 이유가 없다 — 줄 세우면 Neon 왕복이 둘이 된다
  const [{ data, dbFailure }, indie, upcoming, indieAd] = await Promise.all([loadHomeData(), loadIndie(), loadUpcoming(), loadIndieAd()]);
  const { discounts } = data;

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

      {/* 3 — 인디 개발자가 직접 올린 게임. 몇 장 안 되면 줄째 안 선다(lib/indie/constants 의 INDIE_HOME_MIN). 첫 칸은 광고 자리(기획서 4.2) */}
      {indie.length > 0 && (
        <section aria-labelledby="indie-heading" className="flex flex-col gap-3">
          <SectionHead id="indie-heading" title={INDIE_MESSAGES.homeTitle} action={<SeeAll href={ROUTES.indie} />} />
          <Rail
            labels={INDIE_MESSAGES.rail}
            items={[
              ...(indieAd?.boostId
                ? [
                    {
                      key: indieAd.item.slug,
                      node: (
                        <AdTrack boostId={indieAd.boostId} className="h-full">
                          <IndieCard post={indieAd.item} badge={<AdLabel />} />
                        </AdTrack>
                      ),
                    },
                  ]
                : []),
              ...withoutSlug(indie, indieAd?.item.slug).map((p) => ({ key: p.slug, node: <IndieCard post={p} /> })),
            ]}
          />
        </section>
      )}

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
