// 대시보드 추이 그래프 질의(2026-10-30, 사용자 "대시보드에서 간단한 그래프"). 최근 며칠의 결제금액, 신규 가입, 방문 셋만 읽는다.
// 매출현황, 이용현황 질의(sales, usage)를 그대로 부르지 않는 이유: 그쪽은 상품별, 앞 기간, 많이 본 게임까지 읽는다 —
// 첫 화면은 업무 현황판 질의도 같이 돌아 Neon 에 한꺼번에 몰리면 느려진다(home-appeal 의 OOM). 그래서 날짜별 합 두 줄 + Redis 한 번이다.
import "server-only";
import { and, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { payments, users } from "@/server/db/schema";
import { daySeries, periodRange, type Period } from "@/lib/stats/period";
import { readVisits } from "@/server/visits";
import { kstDay } from "./kst-day";

export interface DashboardTrend {
  days: Array<{ day: string; paid: number; signups: number; sessions: number }>;
  visitsOk: boolean;
}

export async function getDashboardTrend(period: Period): Promise<DashboardTrend> {
  const db = getDb();
  const { start, end } = periodRange(period);
  const series = daySeries(period);
  const [[paid, signups], visits] = await Promise.all([
    db.batch([
      db
        .select({ day: kstDay(payments.approvedAt), n: sql<number>`coalesce(sum(${payments.amount}), 0)::int` })
        .from(payments)
        .where(and(inArray(payments.status, ["paid", "canceled"]), gte(payments.approvedAt, start), lt(payments.approvedAt, end)))
        .groupBy(kstDay(payments.approvedAt)),
      db
        .select({ day: kstDay(users.createdAt), n: sql<number>`count(*)::int` })
        .from(users)
        .where(and(gte(users.createdAt, start), lt(users.createdAt, end), ne(users.role, "admin")))
        .groupBy(kstDay(users.createdAt)),
    ]),
    readVisits(series),
  ]);
  const paidBy = new Map(paid.map((r) => [r.day, r.n]));
  const signupBy = new Map(signups.map((r) => [r.day, r.n]));
  const visitBy = new Map((visits ?? []).map((v) => [v.day, v.sessions]));
  return {
    days: series.map((day) => ({ day, paid: paidBy.get(day) ?? 0, signups: signupBy.get(day) ?? 0, sessions: visitBy.get(day) ?? 0 })),
    visitsOk: visits !== null,
  };
}
