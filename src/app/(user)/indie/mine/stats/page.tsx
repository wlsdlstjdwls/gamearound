// /indie/mine/stats — 내 게임 통계(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 3장 4번). 등록현황 옆 칸.
// 지난 30일 조회, 플레이하기 클릭, 다른 링크 클릭, 새 찜, 댓글을 게임마다 세우고, 맨 위에 모두 더한 칸과 "소식 받는 사람" 을 둔다.
// 내 글만 본다 — 서비스가 글쓴이 조건으로 거른다(getMyIndieStats). 남의 글 통계를 보는 주소는 없다.
//
// 날짜별 그래프는 아직 두지 않았다: 조회, 클릭 하루 표가 2026-10-27 에 생겨 쌓인 날이 없다. 숫자가 쌓이면 유료 성과 화면(기획서 4.4)과 함께 붙인다.
import type { Metadata } from "next";
import Link from "next/link";
import { StatTile } from "@/components/community/news-blocks";
import { EmptyState } from "@/components/empty-state";
import { Page, PageHead, sectionCardClass } from "@/components/ui/page";
import { INDIE_MESSAGES } from "@/lib/indie/messages";
import { stagger } from "@/lib/motion";
import { INDIE_PROMO_MESSAGES as M } from "@/lib/indie/promo-messages";
import { indieDetailHref, INDIE_FROM } from "@/lib/indie/query";
import { MEMBERSHIP_MESSAGES } from "@/lib/membership/messages";
import { indieBoostPath, indieEditPath, ROUTES } from "@/lib/routes";
import { buttonClass } from "@/components/ui/button";
import { PAYMENT_MESSAGES as PM } from "@/lib/payments/messages";
import { PROMO_PERFORMANCE_MESSAGES } from "@/lib/promo/messages";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getMyIndieStats } from "@/server/services/indie";

export const metadata: Metadata = { title: M.statsTitle, robots: { index: false } };

const fmt = (n: number) => n.toLocaleString("ko-KR");

export default async function IndieStatsPage() {
  const user = await requireUserOrRedirect();
  const stats = await getMyIndieStats(user.id);

  return (
    <Page gap={20}>
      <PageHead
        title={M.statsTitle}
        action={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href={ROUTES.membership} className="tap inline-flex items-center text-[13.5px] font-semibold text-acc hover:underline">
              {MEMBERSHIP_MESSAGES.title}
            </Link>
            <Link href={ROUTES.indieAds} className="tap inline-flex items-center text-[13.5px] font-semibold text-acc hover:underline">
              {PROMO_PERFORMANCE_MESSAGES.link}
            </Link>
            <Link href={ROUTES.indiePayments} className="tap inline-flex items-center text-[13.5px] font-semibold text-acc hover:underline">
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
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3.5">
            <StatTile label={M.statsViews} value={stats.window.views} />
            <StatTile label={M.statsPlays} value={stats.window.plays} />
            <StatTile label={M.statsLikes} value={stats.window.likes} />
            <StatTile label={M.statsComments} value={stats.window.comments} />
            <StatTile label={M.statsFollowers} value={stats.followers} />
          </div>
          <p className="-mt-2 text-[12.5px] text-dim">{M.statsSince}</p>

          <ul className="flex flex-col gap-3">
            {stats.rows.map((r, i) => {
              const cells = [
                { label: M.statsViews, value: r.window.views, total: r.allTime.views },
                { label: M.statsPlays, value: r.window.plays, total: null },
                { label: M.statsOutbound, value: r.window.outbound, total: null },
                { label: M.statsLikes, value: r.window.likes, total: r.allTime.likes },
                { label: M.statsComments, value: r.window.comments, total: r.allTime.comments },
              ];
              return (
                <li key={r.id} className={sectionCardClass("enter-item flex flex-col gap-3")} style={stagger(i)}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="min-w-0 truncate text-[16px] font-bold text-ink">{r.title}</h2>
                    <div className="flex shrink-0 items-center gap-2">
                      {/* 광고 걸기(결제)는 공개 중인 게임에만 — 공개 전이면 걸어도 아무도 못 본다 */}
                      {r.live && (
                        <Link href={indieBoostPath(r.id)} className={buttonClass({ variant: "accent", size: "sm" })}>
                          {PM.adBuy}
                        </Link>
                      )}
                      <Link href={r.live ? indieDetailHref(r.slug, INDIE_FROM.mine) : indieEditPath(r.id)} className="tap inline-flex items-center text-[13px] font-semibold text-acc hover:underline">
                        {M.statsDetail}
                      </Link>
                    </div>
                  </div>
                  {!r.live && <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">{M.statsNotLive}</p>}
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 sm:grid-cols-5">
                    {cells.map((c) => (
                      <div key={c.label} className="flex flex-col gap-0.5">
                        <dt className="text-[12.5px] text-dim">{c.label}</dt>
                        <dd className="text-[20px] font-black tabular-nums text-ink">{fmt(c.value)}</dd>
                        {c.total !== null && <dd className="text-[12px] text-dim tabular-nums">{M.statsTotal(fmt(c.total))}</dd>}
                      </div>
                    ))}
                  </dl>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Page>
  );
}
