// /indie/mine/stats — 내 게임 통계(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 3장 4번). 등록현황 옆 칸.
// 지난 30일 조회, 플레이하기 클릭, 다른 링크 클릭, 새 찜, 댓글을 게임마다 세우고, 맨 위에 모두 더한 칸과 "소식 받는 사람" 을 둔다.
// 내 글만 본다 — 서비스가 글쓴이 조건으로 거른다(getMyIndieStats). 남의 글 통계를 보는 주소는 없다.
//
// 2026-10-28(사용자: "그래프로 보이고 가시성을 높이고, 버튼 구분이 안 된다"): 맨 위 숫자 칸을 고르면 그 숫자의 30일 추이 선이 바뀌는
// 판(indie/stats-trend)으로 바꿨고, 게임 줄마다 조회 작은 추이 선을 단다. 단추는 무게를 셋으로 가른다 —
// 돈이 드는 광고 걸기만 채운 단추, 게임에 대한 일(플레이테스트, 자세히)은 테두리 단추, 다른 화면 길(게임 보기)은 글자 링크.
// 머리의 멤버십, 광고 성과, 결제 내역도 글자 링크 셋이 붙어 한 덩어리로 읽혀 테두리 단추로 바꿨다.
// 같은 날 둘째 요청("그래프 더, 각 항목마다 순위도"): 항목별 순위 판(공개 인디 게임 중 내 게임 최고 순위, indie/rank-panel),
// 게임이 둘 이상이면 게임별로 견주는 막대(indie/game-compare), 게임 줄의 숫자 칸마다 순위 딱지를 단다.
// 유입 경로는 여기 세우지 않는다 — 메이커 멤버십 "자세히" 의 혜택이다(stats/[id]).
// 로그인한 사람만 본다((user) 레이아웃과 requireUserOrRedirect).
import type { Metadata } from "next";
import Link from "next/link";
import { StatsTrend, Sparkline } from "@/components/indie/stats-trend";
import { GameCompare } from "@/components/indie/game-compare";
import { RankPanel } from "@/components/indie/rank-panel";
import { bestRank, type RankKey } from "@/lib/indie/stats-rank";
import type { IndieStatsRowDto } from "@/lib/indie/dto";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/empty-state";
import { Page, PageHead, sectionCardClass } from "@/components/ui/page";
import { INDIE_MESSAGES } from "@/lib/indie/messages";
import { stagger } from "@/lib/motion";
import { INDIE_PROMO_MESSAGES as M } from "@/lib/indie/promo-messages";
import { indieDetailHref, INDIE_FROM } from "@/lib/indie/query";
import { MEMBERSHIP_MESSAGES } from "@/lib/membership/messages";
import { indieBoostPath, indieEditPath, indiePlaytestPath, indieStatsDetailPath, ROUTES } from "@/lib/routes";
import { PLAYTEST_MESSAGES } from "@/lib/indie/playtest-messages";
import { INDIE_STATS_DETAIL_MESSAGES } from "@/lib/indie/stats-messages";
import { buttonClass } from "@/components/ui/button";
import { PAYMENT_MESSAGES as PM } from "@/lib/payments/messages";
import { PROMO_PERFORMANCE_MESSAGES } from "@/lib/promo/messages";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getMyIndieStats } from "@/server/services/indie";

export const metadata: Metadata = { title: M.statsTitle, robots: { index: false } };

const fmt = (n: number) => n.toLocaleString("ko-KR");

/** 그 항목에서 가장 좋은 순위를 가진 내 게임 이름. 게임이 하나면 이름을 따로 적지 않는다(누구 얘기인지 뻔하다) */
function bestGameNote(rows: IndieStatsRowDto[], key: RankKey, rank: number | null): string | undefined {
  if (rank === null || rows.length < 2) return undefined;
  const game = rows.find((r) => r.ranks[key] === rank);
  return game ? M.statsBestGame(game.title) : undefined;
}

export default async function IndieStatsPage() {
  const user = await requireUserOrRedirect();
  const stats = await getMyIndieStats(user.id);
  // 항목 넷의 내 게임 최고 순위. 순위 판, 위 칸 보조 줄이 같이 쓴다
  const metricDefs: Array<{ key: RankKey; label: string }> = [
    { key: "views", label: M.statsViews },
    { key: "plays", label: M.statsPlays },
    { key: "likes", label: M.statsLikes },
    { key: "comments", label: M.statsComments },
  ];
  const best = Object.fromEntries(metricDefs.map((m) => [m.key, bestRank(stats.rows, m.key)])) as Record<RankKey, number | null>;
  const liveRows = stats.rows.filter((r) => r.live);

  return (
    <Page gap={20}>
      <PageHead
        title={M.statsTitle}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={ROUTES.membership} className={buttonClass({ variant: "secondary", size: "sm" })}>
              {MEMBERSHIP_MESSAGES.title}
            </Link>
            <Link href={ROUTES.indieAds} className={buttonClass({ variant: "secondary", size: "sm" })}>
              {PROMO_PERFORMANCE_MESSAGES.link}
            </Link>
            <Link href={ROUTES.indiePayments} className={buttonClass({ variant: "secondary", size: "sm" })}>
              {PM.toHistory}
            </Link>
          </div>
        }
      >
        <p className="text-[14px] text-mut">{M.statsLead}</p>
      </PageHead>

      {stats.rows.length === 0 ? (
        <EmptyState title={M.statsEmpty} description={M.statsEmptyLead} action={{ href: ROUTES.indieNew, label: INDIE_MESSAGES.register }} />
      ) : (
        <>
          <StatsTrend
            title={M.statsTrend}
            days={stats.days}
            metrics={metricDefs.map((m) => ({ ...m, total: stats.window[m.key], note: best[m.key] !== null ? M.statsBestRank(best[m.key]!) : undefined }))}
          />
          <p className="-mt-2 flex flex-wrap gap-x-4 text-[12.5px] text-dim">
            <span>
              {M.statsFollowers} <b className="font-bold tabular-nums text-ink">{fmt(stats.followers)}</b>
            </span>
            <span>{M.statsSince}</span>
          </p>

          {/* 순위 판과 게임 견주기. 공개 중인 게임이 없으면 순위가 설 수 없어 둘 다 세우지 않는다 */}
          {liveRows.length > 0 && (
            <div className={cn("grid gap-4", liveRows.length > 1 && "lg:grid-cols-2")}>
              <RankPanel
                className="enter-item"
                title={M.statsRankTitle}
                lead={M.statsRankLead(stats.population)}
                population={stats.population}
                items={metricDefs.map((m) => ({ label: m.label, rank: best[m.key], note: bestGameNote(stats.rows, m.key, best[m.key]) }))}
              />
              {liveRows.length > 1 && (
                <GameCompare
                  title={M.statsCompareTitle}
                  lead={M.statsCompareLead}
                  empty={M.statsCompareEmpty}
                  metrics={metricDefs}
                  games={liveRows.map((r) => ({ id: r.id, title: r.title, window: r.window }))}
                />
              )}
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {stats.rows.map((r, i) => {
              // rank: 공개 인디 게임 중 그 항목 순위(30일). 다른 링크 클릭은 견줄 이유가 없어 순위가 없다
              const cells = [
                { label: M.statsViews, value: r.window.views, total: r.allTime.views, rank: r.ranks.views },
                { label: M.statsPlays, value: r.window.plays, total: null, rank: r.ranks.plays },
                { label: M.statsOutbound, value: r.window.outbound, total: null, rank: null },
                { label: M.statsLikes, value: r.window.likes, total: r.allTime.likes, rank: r.ranks.likes },
                { label: M.statsComments, value: r.window.comments, total: r.allTime.comments, rank: r.ranks.comments },
              ];
              return (
                <li key={r.id} className={sectionCardClass("enter-item flex flex-col gap-3")} style={stagger(i)}>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center">
                    <div className="flex min-w-0 flex-col gap-1">
                      <h2 className="min-w-0 truncate text-[17px] font-extrabold tracking-[-0.02em] text-ink">{r.title}</h2>
                      <span className={cn("text-[12.5px] font-semibold", r.live ? "text-ok" : "text-dim")}>{r.live ? M.statsLive : M.statsNotLive}</span>
                    </div>
                    {r.live && (
                      <div className="flex flex-col gap-0.5">
                        <Sparkline values={r.viewsByDay} label={M.statsSpark(r.title)} />
                        <span className="text-right text-[11px] text-dim">{M.statsSparkNote}</span>
                      </div>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line-soft pt-3 sm:grid-cols-5">
                    {cells.map((c) => (
                      <div key={c.label} className="flex flex-col gap-0.5">
                        <dt className="text-[12.5px] text-dim">{c.label}</dt>
                        <dd className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[20px] font-black tabular-nums text-ink">{fmt(c.value)}</span>
                          {/* 순위 딱지 — 1위만 채운 면, 나머지는 연한 면. 숫자 옆이라 "이 숫자가 몇 위" 로 읽힌다 */}
                          {c.rank !== null && (
                            <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums", c.rank === 1 ? "bg-acc text-white" : "bg-acc-soft text-acc")}>
                              {M.statsRank(c.rank)}
                            </span>
                          )}
                        </dd>
                        {c.total !== null && <dd className="text-[12px] text-dim tabular-nums">{M.statsTotal(fmt(c.total))}</dd>}
                      </div>
                    ))}
                  </dl>
                  {/* 할 일 단추 줄 — 무게 셋(머리 주석). 광고 걸기, 플레이테스트는 공개 중인 게임에만: 공개 전이면 걸어도 아무도 못 본다 */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
                    {r.live && (
                      <Link href={indieBoostPath(r.id)} className={buttonClass({ variant: "accent", size: "sm" })}>
                        {PM.adBuy}
                      </Link>
                    )}
                    {r.live && (
                      <Link href={indiePlaytestPath(r.id)} className={buttonClass({ variant: "secondary", size: "sm" })}>
                        {PLAYTEST_MESSAGES.listTitle}
                      </Link>
                    )}
                    <Link href={indieStatsDetailPath(r.id)} className={buttonClass({ variant: "secondary", size: "sm" })}>
                      {INDIE_STATS_DETAIL_MESSAGES.open}
                    </Link>
                    <Link href={r.live ? indieDetailHref(r.slug, INDIE_FROM.mine) : indieEditPath(r.id)} className="tap ml-auto inline-flex items-center text-[13px] font-semibold text-acc hover:underline">
                      {M.statsDetail}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Page>
  );
}
