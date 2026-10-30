// /admin/stats/sales — 매출현황(2026-10-30, 사용자 "통계 프로그램, 매출"). 결제 표에서 날짜별, 상품별 합을 읽어 화면(components/admin/stats/sales-screen)에 넘긴다.
// 기간은 주소(?from=&to=)로 받는다. 기본은 최근 30일, 한 번에 92일까지(그보다 길면 막대가 실선이 되고 질의도 무거워진다).
import type { Metadata } from "next";
import { SalesScreen } from "@/components/admin/stats/sales-screen";
import { ADMIN_NAV, STATS_MESSAGES } from "@/lib/admin/messages";
import { resolvePeriod } from "@/lib/stats/period";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getSalesStats } from "@/server/services/stats";

export const metadata: Metadata = { title: ADMIN_NAV.statsSales };

const DEFAULT_DAYS = 30;
const MAX_DAYS = 92;

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminStatsSalesPage({ searchParams }: { searchParams: Search }) {
  await requireRoleOrForbid("admin");
  const sp = await searchParams;
  const period = resolvePeriod({ from: sp.from, to: sp.to }, { defaultDays: DEFAULT_DAYS, maxDays: MAX_DAYS });
  // 한 질의가 넘어져도 화면 틀은 선다 — 메뉴로 다른 화면에 갈 수 있어야 한다
  const stats = await getSalesStats(period).catch(() => null);
  if (!stats) return <p className="rounded-xl bg-surface-2 px-4 py-3 text-[12.5px] text-mut">{STATS_MESSAGES.failed}</p>;
  return <SalesScreen stats={stats} />;
}
