"use client";
// 매출현황 화면 본문(2026-10-30, 사용자 "통계 프로그램, 매출 등"). 백오피스 ~현황 꼴: 조회조건(기간) → 숫자 칸 → 추이 그래프 → 일별 표, 상품별 표.
// 보기만 하는 화면이라 툴바는 조회, 엑셀만 쓴다(엑셀은 화면의 표 둘을 받아 간다).
// 숫자 칸 작은 글은 같은 길이의 바로 앞 기간과 견준 변화다 — 숫자 하나로는 많은지 적은지 모른다.
import { AdminScreenHead } from "@/components/admin/screen/head";
import { DataGrid, type GridCol } from "@/components/admin/screen/data-grid";
import { StatTiles } from "@/components/admin/stat-tiles";
import { usePeriodBand } from "@/components/admin/stats/period-band";
import { TrendChart } from "@/components/admin/stats/trend-chart";
import { panelClass } from "@/components/ui/page";
import { ADMIN_NAV, STATS_MESSAGES as M } from "@/lib/admin/messages";
import { formatAmount } from "@/lib/currency";
import { changeRate } from "@/lib/stats/change";
import { compactNumber } from "@/lib/stats/period";
import { ROUTES } from "@/lib/routes";
import type { SalesByProduct, SalesDay, SalesStats } from "@/server/services/stats";

const won = (n: number) => formatAmount(n);

const DAY_COLUMNS: GridCol<SalesDay>[] = [
  { key: "day", label: M.colDay, width: "minmax(96px,1fr)", align: "center", value: (d) => d.day },
  { key: "count", label: M.colCount, width: "64px", align: "right", value: (d) => d.count, sum: true },
  { key: "paid", label: M.colPaid, width: "minmax(96px,1fr)", align: "right", value: (d) => d.paid, text: (d) => won(d.paid), sum: (rows) => won(rows.reduce((n, r) => n + r.paid, 0)) },
  { key: "refunded", label: M.colRefunded, width: "minmax(88px,1fr)", align: "right", value: (d) => d.refunded, text: (d) => won(d.refunded), sum: (rows) => won(rows.reduce((n, r) => n + r.refunded, 0)) },
  { key: "net", label: M.colNet, width: "minmax(96px,1fr)", align: "right", value: (d) => d.net, text: (d) => won(d.net), sum: (rows) => won(rows.reduce((n, r) => n + r.net, 0)) },
];

const PRODUCT_COLUMNS: GridCol<SalesByProduct>[] = [
  { key: "name", label: M.colProduct, width: "minmax(120px,1.4fr)", value: (p) => p.name },
  { key: "count", label: M.colCount, width: "64px", align: "right", value: (p) => p.count, sum: true },
  { key: "paid", label: M.colPaid, width: "minmax(96px,1fr)", align: "right", value: (p) => p.paid, text: (p) => won(p.paid), sum: (rows) => won(rows.reduce((n, r) => n + r.paid, 0)) },
  { key: "refunded", label: M.colRefunded, width: "minmax(88px,1fr)", align: "right", value: (p) => p.refunded, text: (p) => won(p.refunded), sum: (rows) => won(rows.reduce((n, r) => n + r.refunded, 0)) },
];

export function SalesScreen({ stats }: { stats: SalesStats }) {
  const { band, retrieve } = usePeriodBand(ROUTES.adminStatsSales, stats.period);
  const t = stats.totals;
  return (
    <>
      <AdminScreenHead title={ADMIN_NAV.statsSales} note={M.salesRule} tools={{ retrieve }} />
      <div className="flex flex-col gap-3">
        {band}
        <StatTiles
          tiles={[
            { label: M.salesPaid, value: won(t.paid), hint: `${M.count(t.count)} | ${M.change(changeRate(t.paid, stats.previous.paid))}` },
            { label: M.salesNet, value: won(t.net), hint: M.change(changeRate(t.net, stats.previous.net)) },
            { label: M.salesRefunded, value: won(t.refunded), tone: t.refunded > 0 ? "danger" : undefined },
            { label: M.salesMembers, value: M.people(stats.liveMemberships), hint: M.salesMembersHint },
          ]}
        />
        <section className={panelClass("p-3")}>
          <TrendChart title={M.salesChart} data={stats.days.map((d) => ({ day: d.day, value: d.net }))} format={won} axisFormat={compactNumber} />
        </section>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <DataGrid label={M.salesDays} columns={DAY_COLUMNS} rows={[...stats.days].reverse()} rowKey={(d) => d.day} rowTone={(d) => (d.count === 0 && d.refunded === 0 ? "muted" : undefined)} paging empty={M.salesEmpty} />
          <DataGrid label={M.salesProducts} columns={PRODUCT_COLUMNS} rows={stats.products} rowKey={(p) => p.product} empty={M.salesEmpty} />
        </div>
      </div>
    </>
  );
}
