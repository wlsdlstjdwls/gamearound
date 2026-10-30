// 이용현황 질의(2026-10-30). 방문은 Redis(server/visits), 가입과 찜은 DB, 많이 본 게임은 게임 조회 기록(server/game-views)에서 읽는다.
//
// 방문 기록은 방문 신호(components/visit-beacon)를 배포한 날부터 쌓인다 — 그 전 날짜는 0 이다.
// 가입은 관리자 계정을 뺀다 — 운영자가 만든 시험 계정이 손님 가입으로 섞이지 않게.
import "server-only";
import { and, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { games, users, wishlists } from "@/server/db/schema";
import { daySeries, periodRange, previousPeriod, type Period } from "@/lib/stats/period";
import { SITE_SOURCES, type SiteSource } from "@/lib/stats/visits";
import { GAME_VIEWS_WINDOW_DAYS, viewCountsBySlug } from "@/server/game-views";
import { readVisits } from "@/server/visits";
import { kstDay } from "./kst-day";

/** 많이 본 게임 줄 수. 표 한 판에 스크롤 없이 서는 만큼 */
export const TOP_GAMES = 10;

export interface UsageDay {
  day: string;
  pv: number;
  sessions: number;
  visitors: number;
  signups: number;
  wishes: number;
}

export interface UsageStats {
  period: Period;
  /** Redis 를 읽지 못하면 false — 방문 칸을 0 이 아니라 "읽지 못함" 으로 그린다 */
  visitsOk: boolean;
  days: UsageDay[];
  sources: Array<{ source: SiteSource; sessions: number }>;
  totals: { pv: number; sessions: number; signups: number; wishes: number };
  previous: { sessions: number; signups: number; wishes: number };
  topGames: Array<{ slug: string; title: string; views: number }>;
  topWindowDays: number;
}

export async function getUsageStats(period: Period): Promise<UsageStats> {
  const db = getDb();
  const { start, end } = periodRange(period);
  const prevPeriod = previousPeriod(period);
  const prev = periodRange(prevPeriod);
  const series = daySeries(period);
  const notAdmin = ne(users.role, "admin");

  const [[signupDays, wishDays, prevSignups, prevWishes], visits, prevVisits, views] = await Promise.all([
    db.batch([
      db
        .select({ day: kstDay(users.createdAt), n: sql<number>`count(*)::int` })
        .from(users)
        .where(and(gte(users.createdAt, start), lt(users.createdAt, end), notAdmin))
        .groupBy(kstDay(users.createdAt)),
      db
        .select({ day: kstDay(wishlists.createdAt), n: sql<number>`count(*)::int` })
        .from(wishlists)
        .where(and(gte(wishlists.createdAt, start), lt(wishlists.createdAt, end)))
        .groupBy(kstDay(wishlists.createdAt)),
      db.select({ n: sql<number>`count(*)::int` }).from(users).where(and(gte(users.createdAt, prev.start), lt(users.createdAt, prev.end), notAdmin)),
      db.select({ n: sql<number>`count(*)::int` }).from(wishlists).where(and(gte(wishlists.createdAt, prev.start), lt(wishlists.createdAt, prev.end))),
    ]),
    readVisits(series),
    readVisits(daySeries(prevPeriod)),
    viewCountsBySlug(),
  ]);

  const signupBy = new Map(signupDays.map((r) => [r.day, r.n]));
  const wishBy = new Map(wishDays.map((r) => [r.day, r.n]));
  const visitBy = new Map((visits ?? []).map((v) => [v.day, v]));
  const days = series.map((day) => {
    const v = visitBy.get(day);
    return { day, pv: v?.pv ?? 0, sessions: v?.sessions ?? 0, visitors: v?.visitors ?? 0, signups: signupBy.get(day) ?? 0, wishes: wishBy.get(day) ?? 0 };
  });
  // 방문자는 날마다 따로 어림한 값이라 기간 합이 "기간 방문자" 가 아니다 — 합계에 두지 않는다
  const totals = days.reduce((t, d) => ({ pv: t.pv + d.pv, sessions: t.sessions + d.sessions, signups: t.signups + d.signups, wishes: t.wishes + d.wishes }), { pv: 0, sessions: 0, signups: 0, wishes: 0 });
  const sources = SITE_SOURCES.map((source) => ({ source, sessions: (visits ?? []).reduce((n, v) => n + v.sources[source], 0) })).sort((a, b) => b.sessions - a.sessions);

  // 많이 본 게임: 조회 기록은 최근 GAME_VIEWS_WINDOW_DAYS 일만 산다 — 고른 기간과 상관없이 그 창이다(화면이 말한다)
  const top = [...views.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_GAMES);
  const titles = top.length
    ? await db.select({ slug: games.slug, titleKo: games.titleKo, titleEn: games.titleEn }).from(games).where(inArray(games.slug, top.map(([s]) => s)))
    : [];
  const titleBy = new Map(titles.map((g) => [g.slug, g.titleKo ?? g.titleEn]));

  return {
    period,
    visitsOk: visits !== null,
    days,
    sources,
    totals,
    previous: { sessions: (prevVisits ?? []).reduce((n, v) => n + v.sessions, 0), signups: prevSignups[0]?.n ?? 0, wishes: prevWishes[0]?.n ?? 0 },
    topGames: top.filter(([s]) => titleBy.has(s)).map(([slug, views]) => ({ slug, title: titleBy.get(slug) ?? slug, views })),
    topWindowDays: GAME_VIEWS_WINDOW_DAYS,
  };
}
