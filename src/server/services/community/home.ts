// 게시판 홈(S-10), 라운지 홈(S-16)의 소식 블록(기획서 v2.0 6.6 "같은 규칙으로 소식을 구성").
//   급상승: 최근 3일 안의 글을 (좋아요 + 댓글 x 2) / (경과일 + 1) 로 4개. 모자라면 전체 기간 인기순으로 채운다.
//   기다리는 글: 최근 14일, 댓글 0개, 최신순 6개.
// 네 질의를 나란히 보낸다(Neon 왕복 1회분) — 홈은 첫 화면이라 줄 세운 왕복 수가 곧 속도다.
import { and, desc, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { posts, users, type PostCategory } from "@/server/db/schema";
import { LATEST_PROMO_LIMIT, RISING_LIMIT, RISING_WINDOW_DAYS, WAITING_LIMIT, WAITING_WINDOW_DAYS } from "@/lib/community/constants";
import type { BoardHomeDto } from "./dto";
import { popularScoreSql, rowColumns, toRow } from "./columns";

/** 한국 날짜의 오늘 0시 — "오늘 올라온 글" 은 한국 사람의 오늘이다 */
const todayStartSql = sql`(date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')`;
const ageDaysSql = sql`(extract(epoch from (now() - ${posts.createdAt})) / 86400.0)`;

export async function getBoardHome(categories: readonly PostCategory[], waitingCategories: readonly PostCategory[], withPromos: boolean): Promise<BoardHomeDto> {
  const db = getDb();
  const live = and(eq(posts.status, "published"), inArray(posts.category, [...categories]));
  const base = () => db.select(rowColumns).from(posts).innerJoin(users, eq(users.id, posts.authorUserId));

  const [todayRows, countRows, rising, waiting, promos] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(posts).where(and(live, gte(posts.createdAt, todayStartSql))),
    db.select({ category: posts.category, n: sql<number>`count(*)::int` }).from(posts).where(live).groupBy(posts.category),
    base()
      .where(and(live, sql`${posts.createdAt} >= now() - make_interval(days => ${RISING_WINDOW_DAYS}::int)`, sql`${popularScoreSql} > 0`))
      .orderBy(desc(sql`${popularScoreSql} / (${ageDaysSql} + 1)`), desc(posts.createdAt))
      .limit(RISING_LIMIT),
    waitingCategories.length === 0
      ? Promise.resolve([])
      : base()
          .where(and(eq(posts.status, "published"), inArray(posts.category, [...waitingCategories]), eq(posts.commentCount, 0), sql`${posts.createdAt} >= now() - make_interval(days => ${WAITING_WINDOW_DAYS}::int)`))
          .orderBy(desc(posts.createdAt))
          .limit(WAITING_LIMIT),
    withPromos ? base().where(and(eq(posts.status, "published"), eq(posts.category, "promo"))).orderBy(desc(posts.createdAt)).limit(LATEST_PROMO_LIMIT) : Promise.resolve([]),
  ]);

  let risingRows = rising;
  if (risingRows.length < RISING_LIMIT) {
    // 대상이 모자라면 전체 기간으로 채운다(기획서 5.2). 이미 뽑은 글은 빼고, 반응 없는 글도 채움에 들어간다 — 빈 칸보다 낫다
    const picked = risingRows.map((r) => r.id);
    const fill = await base()
      .where(and(live, picked.length > 0 ? notInArray(posts.id, picked) : undefined))
      .orderBy(desc(popularScoreSql), desc(posts.createdAt))
      .limit(RISING_LIMIT - risingRows.length);
    risingRows = [...risingRows, ...fill];
  }

  return {
    today: todayRows[0]?.n ?? 0,
    counts: Object.fromEntries(countRows.map((r) => [r.category, r.n])),
    rising: risingRows.map(toRow),
    waiting: waiting.map(toRow),
    latestPromos: promos.map(toRow),
  };
}
