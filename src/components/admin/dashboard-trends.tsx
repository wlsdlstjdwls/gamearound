"use client";
// 대시보드 추이 그래프 줄(2026-10-30, 사용자 "대시보드에서 간단한 그래프"). 최근 며칠의 결제금액, 신규 가입, 방문을 작은 막대 그래프 셋으로.
// 업무 현황판 아래에 둔다 — 첫 화면의 일은 "오늘 무엇을 할지" 이고, 추이는 그다음에 훑는 것이다. 판이 그래프에 밀려 내려가면 안 된다.
// 그래프 이름 옆 숫자는 기간 합이다. 자세한 것은 통계 화면으로 가는 길(머리 오른쪽)이 맡는다.
import Link from "next/link";
import { TrendChart } from "@/components/admin/stats/trend-chart";
import { panelClass } from "@/components/ui/page";
import { STATS_MESSAGES as M } from "@/lib/admin/messages";
import { formatAmount } from "@/lib/currency";
import { compactNumber } from "@/lib/stats/period";
import { ROUTES } from "@/lib/routes";
import type { DashboardTrend } from "@/server/services/stats";

/** 대시보드 그래프 높이(px). 판 셋이 한 줄에 서도 첫 화면을 크게 넘지 않는 높이 */
const CHART_HEIGHT = 120;

export function DashboardTrends({ trend }: { trend: DashboardTrend }) {
  const sum = (k: "paid" | "signups" | "sessions") => trend.days.reduce((n, d) => n + d[k], 0);
  const charts = [
    { key: "paid", title: `${M.salesPaid} ${formatAmount(sum("paid"))}`, data: trend.days.map((d) => ({ day: d.day, value: d.paid })), format: (n: number) => formatAmount(n), axis: compactNumber },
    { key: "signups", title: `${M.usageSignups} ${M.people(sum("signups"))}`, data: trend.days.map((d) => ({ day: d.day, value: d.signups })), format: (n: number) => M.people(n) },
    ...(trend.visitsOk ? [{ key: "sessions", title: `${M.usageSessions} ${M.times(sum("sessions"))}`, data: trend.days.map((d) => ({ day: d.day, value: d.sessions })), format: (n: number) => M.times(n) }] : []),
  ];
  return (
    <section aria-labelledby="dash-trends" className={panelClass("flex flex-col gap-2 p-3")}>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 id="dash-trends" className="text-[13.5px] font-bold text-ink">
          {M.trendTitle(trend.days.length)}
        </h2>
        <Link href={ROUTES.adminStatsSales} className="text-[12.5px] font-semibold text-acc hover:underline">
          {M.trendMore}
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {charts.map((c) => (
          <TrendChart empty={M.chartEmpty} key={c.key} title={c.title} data={c.data} format={c.format} axisFormat={"axis" in c ? c.axis : undefined} height={CHART_HEIGHT} />
        ))}
      </div>
    </section>
  );
}
