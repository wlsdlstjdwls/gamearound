// /indie/mine/stats/[id] — 게임 하나의 통계 자세히(2026-10-27, 기획서 4.3 메이커 멤버십 "내 게임 통계 자세히(유입 경로, 일별 그래프)").
// 30일 날짜별 조회, 플레이하기 클릭(두 그래프)과 유입 경로. 내 글이 아니면 404 — 남의 글이 있는지조차 알려 주지 않는다.
// 멤버십이 아니면 숫자 대신 잠긴 판과 멤버십 화면 길을 둔다. 숫자는 모두에게서 모으고 있어(schema-indie-promo) 가입하면 지난 30일이 바로 선다.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DailyBars } from "@/components/indie/daily-bars";
import { buttonClass } from "@/components/ui/button";
import { Page, PageHead, sectionCardClass } from "@/components/ui/page";
import { INDIE_STATS_DETAIL_MESSAGES as M, TRAFFIC_SOURCE_LABEL } from "@/lib/indie/stats-messages";
import { TRAFFIC_SOURCES, type TrafficSource } from "@/lib/indie/traffic";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getMyIndieStatsDetail } from "@/server/services/indie";
import { hasMakerBenefits } from "@/server/services/membership";

export const metadata: Metadata = { robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

const idSchema = z.uuid();

/** 모르는 갈래(갈래를 지운 뒤 남은 옛 줄)는 "다른 사이트" 로 읽는다 */
const sourceLabel = (s: string) => TRAFFIC_SOURCE_LABEL[(TRAFFIC_SOURCES as readonly string[]).includes(s) ? (s as TrafficSource) : "external"];

export default async function IndieStatsDetailPage({ params }: Props) {
  const { id } = await params;
  // 글 id 꼴이 아니면 DB 에 묻기 전에 거른다 — uuid 칸에 아무 글자나 넣으면 질의가 실패한다
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUserOrRedirect();
  const [detail, member] = await Promise.all([getMyIndieStatsDetail(user.id, id), hasMakerBenefits(user.id)]);
  if (!detail) notFound();
  const back = (
    <Link href={ROUTES.indieStats} className="tap inline-flex items-center text-[13.5px] font-semibold text-acc hover:underline">
      {M.back}
    </Link>
  );
  const sourceTotal = detail.sources.reduce((s, r) => s + r.views, 0);

  return (
    <Page gap={20}>
      <PageHead title={M.title(detail.title)} action={back}>
        <p className="text-[14px] text-mut">{M.lead}</p>
      </PageHead>

      {!member ? (
        <section className={sectionCardClass("flex flex-col items-start gap-3")}>
          <h2 className="text-[16px] font-bold text-ink">{M.lockedTitle}</h2>
          <p className="text-[14px] text-mut">{M.lockedLead}</p>
          <Link href={ROUTES.membership} className={buttonClass({ variant: "accent", size: "sm" })}>
            {M.lockedCta}
          </Link>
        </section>
      ) : (
        <>
          <section className={sectionCardClass("enter-item grid gap-6 md:grid-cols-2")} style={stagger(0)}>
            <DailyBars title={M.views} totalLabel={M.total} points={detail.days.map((d) => ({ day: d.day, value: d.views }))} />
            <DailyBars title={M.plays} totalLabel={M.total} points={detail.days.map((d) => ({ day: d.day, value: d.plays }))} />
          </section>

          <section aria-labelledby="stats-sources" className={sectionCardClass("enter-item flex flex-col gap-3")} style={stagger(1)}>
            <h2 id="stats-sources" className="text-[15px] font-bold text-ink">
              {M.sources}
            </h2>
            {detail.sources.length === 0 ? (
              <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">{M.sourcesEmpty}</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {detail.sources.map((s) => {
                  const pct = (s.views / sourceTotal) * 100;
                  return (
                    <li key={s.source} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-[13.5px]">
                      <span className="truncate text-ink">{sourceLabel(s.source)}</span>
                      <span aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-acc" style={{ width: `${Math.max(pct, 2)}%` }} />
                      </span>
                      <span className="tabular-nums text-mut">
                        {s.views.toLocaleString("ko-KR")} ({M.share(pct.toFixed(0))})
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-[12.5px] text-dim">{M.sourcesSince}</p>
          </section>
        </>
      )}
    </Page>
  );
}
