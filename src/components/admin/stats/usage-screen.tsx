"use client";
// 이용현황 화면 본문(2026-10-30, 사용자 "통계 프로그램, 유입 등"). 조회조건(기간) → 숫자 칸 → 추이 그래프 셋 → 유입경로, 많이 본 게임, 일별 표.
// 그래프를 셋으로 나눈 이유: 방문은 수천, 가입은 몇 건이라 한 그래프에 두면 가입 막대가 바닥에 붙는다(축 둘은 겹치지 않는다, dataviz).
// 유입경로는 그래프 대신 표 + 칸 안 막대다 — 갈래 다섯을 색으로 가르면 색 다섯을 외워야 한다. 막대는 한 색이고 이름은 글자다.
import { AdminScreenHead } from "@/components/admin/screen/head";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { StatTiles } from "@/components/admin/stat-tiles";
import { usePeriodBand } from "@/components/admin/stats/period-band";
import { TrendChart } from "@/components/admin/stats/trend-chart";
import { panelClass } from "@/components/ui/page";
import { ADMIN_NAV, STATS_MESSAGES as M } from "@/lib/admin/messages";
import { changeRate } from "@/lib/stats/change";
import { ROUTES } from "@/lib/routes";
import type { UsageDay, UsageStats } from "@/server/services/stats";

type SourceRow = UsageStats["sources"][number] & { share: number };
type GameRow = UsageStats["topGames"][number];

const count = (n: number) => n.toLocaleString("ko-KR");
const PERCENT = 100;

function ShareBar({ share }: { share: number }) {
  return (
    <span className="flex w-full items-center gap-2">
      <span aria-hidden className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
        <span className="block h-full rounded-full bg-acc" style={{ width: `${share}%` }} />
      </span>
      <span className="w-10 text-right tabular-nums">{M.share(share)}</span>
    </span>
  );
}

const SOURCE_COLUMNS: GridCol<SourceRow>[] = [
  { key: "source", label: M.colSource, width: "minmax(96px,1fr)", value: (r) => M.sourceLabels[r.source] },
  { key: "sessions", label: M.colSessions, width: "72px", align: "right", value: (r) => r.sessions, text: (r) => count(r.sessions), sum: true },
  { key: "share", label: M.colShare, width: "minmax(120px,1.2fr)", value: (r) => r.share, text: (r) => M.share(r.share), render: (r) => <ShareBar share={r.share} /> },
];

const GAME_COLUMNS: GridCol<GameRow>[] = [
  { key: "title", label: M.colGame, width: "minmax(140px,1fr)", value: (g) => g.title },
  { key: "views", label: M.colViews, width: "72px", align: "right", value: (g) => g.views, text: (g) => count(g.views) },
];

export function UsageScreen({ stats }: { stats: UsageStats }) {
  const { band, retrieve } = usePeriodBand(ROUTES.adminStatsUsage, stats.period);
  const t = stats.totals;
  const visitCell = (n: number) => (stats.visitsOk ? count(n) : "-");
  const dayColumns: GridCol<UsageDay>[] = [
    { key: "day", label: M.colDay, width: "minmax(96px,1fr)", align: "center", value: (d) => d.day },
    { key: "sessions", label: M.colSessions, width: "72px", align: "right", value: (d) => d.sessions, text: (d) => visitCell(d.sessions), sum: true },
    { key: "visitors", label: M.colVisitors, width: "72px", align: "right", value: (d) => d.visitors, text: (d) => visitCell(d.visitors) },
    { key: "pv", label: M.colPv, width: "80px", align: "right", value: (d) => d.pv, text: (d) => visitCell(d.pv), sum: true },
    { key: "signups", label: M.colSignups, width: "64px", align: "right", value: (d) => d.signups, sum: true },
    { key: "wishes", label: M.colWishes, width: "64px", align: "right", value: (d) => d.wishes, sum: true },
  ];
  const sourceTotal = stats.sources.reduce((n, s) => n + s.sessions, 0);
  const sources: SourceRow[] = sourceTotal === 0 ? [] : stats.sources.map((s) => ({ ...s, share: Math.round((s.sessions / sourceTotal) * PERCENT) }));
  const series = (pick: (d: UsageDay) => number) => stats.days.map((d) => ({ day: d.day, value: pick(d) }));

  return (
    <>
      <AdminScreenHead title={ADMIN_NAV.statsUsage} note={stats.visitsOk ? M.usageVisitsSince : M.usageVisitsDown} tools={{ retrieve }} />
      <div className="flex flex-col gap-3">
        {band}
        <StatTiles
          tiles={[
            { label: M.usageSessions, value: stats.visitsOk ? count(t.sessions) : "-", hint: stats.visitsOk ? `${M.usageSessionsHint} | ${M.change(changeRate(t.sessions, stats.previous.sessions))}` : M.usageSessionsHint },
            { label: M.usagePv, value: stats.visitsOk ? count(t.pv) : "-" },
            { label: M.usageSignups, value: M.people(t.signups), hint: M.change(changeRate(t.signups, stats.previous.signups)) },
            { label: M.usageWishes, value: M.count(t.wishes), hint: M.change(changeRate(t.wishes, stats.previous.wishes)) },
          ]}
        />
        <section className={panelClass("grid gap-4 p-3 lg:grid-cols-3")}>
          <TrendChart title={M.usageVisitsChart} data={series((d) => d.sessions)} format={(n) => M.times(n)} height={160} />
          <TrendChart title={M.usageSignupsChart} data={series((d) => d.signups)} format={(n) => M.people(n)} height={160} />
          <TrendChart title={M.usageWishesChart} data={series((d) => d.wishes)} format={(n) => M.count(n)} height={160} />
        </section>
        <div className="grid gap-3 xl:grid-cols-2">
          <DataGrid label={M.usageSources} columns={SOURCE_COLUMNS} rows={sources} rowKey={(r) => r.source} empty={M.usageSourcesEmpty} />
          <DataGrid label={M.usageTopGames(stats.topWindowDays)} columns={GAME_COLUMNS} rows={stats.topGames} rowKey={(g) => g.slug} empty={M.usageTopEmpty} />
        </div>
        <DataGrid label={M.usageDays} columns={dayColumns} rows={[...stats.days].reverse()} rowKey={(d) => d.day} paging empty={M.usageSourcesEmpty} />
      </div>
    </>
  );
}
