// 명예의 전당(S-08), 슈퍼루키(S-09), 인디 게임 찜과 조회 기록. 점수 식과 근거는 lib/indie/fame 머리 주석.
// 대상은 모두 "승인된 공개 글" 이다(isPublic) — 승인 대기 게임은 어느 순위에도 서지 않는다(기획서 7장).
import "server-only";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { hallOfFameMonths, indiePostLikes, indiePosts, indieViewMonths } from "@/server/db/schema";
import { getCurrentUser, requireUser } from "@/server/services/users";
import {
  HOF_LIKE_WEIGHT,
  HOF_MIN_LIKES,
  HOF_TOP,
  HOF_VIEWS_PER_POINT,
  kstYm,
  ROOKIE_LIKE_WEIGHT,
  ROOKIE_LIMIT,
  ROOKIE_VIEWS_PER_POINT,
  ROOKIE_WINDOW_DAYS,
} from "@/lib/indie/fame";
import type { IndieCardDto } from "@/lib/indie/dto";
import { cardColumns, isPublic, toCards } from "./read";

export type RankedIndie = { card: IndieCardDto; score: number; likes: number };
export type RookieIndie = { card: IndieCardDto; daysSince: number; likes: number };

/** 한국 달의 시작, 끝(끝은 다음 달 1일 0시) */
function ymRange(ym: string) {
  const start = sql`(${`${ym}-01`}::date at time zone 'Asia/Seoul')`;
  const end = sql`((${`${ym}-01`}::date + interval '1 month') at time zone 'Asia/Seoul')`;
  return { start, end };
}

/** 상세 조회 한 번. 글쓴이 본인 조회는 세지 않는다(혼자 새로고침해 순위를 올리지 못하게) */
export async function recordIndieView(postId: string, authorUserId: string): Promise<void> {
  const viewer = await getCurrentUser().catch(() => null);
  if (viewer?.id === authorUserId) return;
  const db = getDb();
  const ym = kstYm(new Date());
  await Promise.all([
    db.update(indiePosts).set({ viewCount: sql`${indiePosts.viewCount} + 1` }).where(eq(indiePosts.id, postId)),
    db
      .insert(indieViewMonths)
      .values({ postId, ym, views: 1, ...createdBy("system") })
      .onConflictDoUpdate({ target: [indieViewMonths.postId, indieViewMonths.ym], set: { views: sql`${indieViewMonths.views} + 1` } }),
  ]);
}

export async function isIndieLiked(postId: string): Promise<boolean> {
  const u = await getCurrentUser().catch(() => null);
  if (!u) return false;
  const r = await getDb().select({ x: sql`1` }).from(indiePostLikes).where(and(eq(indiePostLikes.postId, postId), eq(indiePostLikes.userId, u.id))).limit(1);
  return r.length > 0;
}

/** 찜 토글. 쌓아 둔 수는 행이 실제로 들고 날 때만 고친다(community/reactions 와 같은 규칙) */
export async function toggleIndieLike(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  const u = await requireUser();
  const db = getDb();
  const removed = await db.delete(indiePostLikes).where(and(eq(indiePostLikes.postId, postId), eq(indiePostLikes.userId, u.id))).returning({ p: indiePostLikes.postId });
  let liked = false;
  if (removed.length > 0) {
    await db.update(indiePosts).set({ likeCount: sql`greatest(${indiePosts.likeCount} - 1, 0)` }).where(eq(indiePosts.id, postId));
  } else {
    const added = await db.insert(indiePostLikes).values({ postId, userId: u.id, ...createdBy("user", u.id) }).onConflictDoNothing().returning({ p: indiePostLikes.postId });
    liked = true;
    if (added.length > 0) await db.update(indiePosts).set({ likeCount: sql`${indiePosts.likeCount} + 1` }).where(eq(indiePosts.id, postId));
  }
  const [row] = await db.select({ n: indiePosts.likeCount }).from(indiePosts).where(eq(indiePosts.id, postId));
  return { liked, likeCount: row?.n ?? 0 };
}

/** 슈퍼루키 — 승인 뒤 30일 미만, 주목도 상위 12 */
export async function listRookies(): Promise<RookieIndie[]> {
  const ageDays = sql`(extract(epoch from (now() - ${indiePosts.reviewedAt})) / 86400.0)`;
  const score = sql`((${indiePosts.likeCount} * ${ROOKIE_LIKE_WEIGHT}::int + ${indiePosts.viewCount} / ${ROOKIE_VIEWS_PER_POINT}::numeric) * (1 - ${ageDays} / ${ROOKIE_WINDOW_DAYS}::numeric))`;
  const rows = await getDb()
    .select({ ...cardColumns, likes: indiePosts.likeCount, days: sql<number>`floor(${ageDays})::int` })
    .from(indiePosts)
    .where(and(isPublic, gte(indiePosts.reviewedAt, sql`now() - make_interval(days => ${ROOKIE_WINDOW_DAYS}::int)`)))
    .orderBy(desc(score), desc(indiePosts.reviewedAt))
    .limit(ROOKIE_LIMIT);
  const cards = await toCards(rows);
  const bySlug = new Map(cards.map((c) => [c.slug, c]));
  return rows.flatMap((r) => {
    const card = bySlug.get(r.slug);
    return card ? [{ card, daysSince: r.days, likes: r.likes }] : [];
  });
}

/** 그 달의 실시간 순위(확정 전). 찜은 그 달에 들어온 찜, 조회는 그 달 조회 */
async function liveRanking(ym: string): Promise<Array<{ id: string; score: number; likes: number }>> {
  const db = getDb();
  const { start, end } = ymRange(ym);
  const likes = db
    .select({ postId: indiePostLikes.postId, n: sql<number>`count(*)::int`.as("n") })
    .from(indiePostLikes)
    .where(and(gte(indiePostLikes.createdAt, start), lt(indiePostLikes.createdAt, end)))
    .groupBy(indiePostLikes.postId)
    .as("month_likes");
  const score = sql<number>`(${likes.n} * ${HOF_LIKE_WEIGHT}::int + coalesce(${indieViewMonths.views}, 0) / ${HOF_VIEWS_PER_POINT}::int)::int`;
  const rows = await db
    .select({ id: indiePosts.id, likes: likes.n, score })
    .from(indiePosts)
    .innerJoin(likes, eq(likes.postId, indiePosts.id))
    .leftJoin(indieViewMonths, and(eq(indieViewMonths.postId, indiePosts.id), eq(indieViewMonths.ym, ym)))
    .where(and(isPublic, gte(likes.n, HOF_MIN_LIKES)))
    .orderBy(desc(score), desc(likes.n))
    .limit(HOF_TOP);
  return rows;
}

async function cardsById(ids: string[]): Promise<Map<string, IndieCardDto>> {
  if (ids.length === 0) return new Map();
  // 확정한 달의 순위표도 지금 공개인 글만 세운다 — 운영진이 숨긴 글이 지난달 명예의 전당에 남아 있으면
  // 숨김이 노출을 못 막는다(기획서 v2.0 2.2 "노출 관리"). 빠진 자리는 attach 가 건너뛰어 순위가 한 칸씩 당겨진다
  const cardRows = await getDb().select(cardColumns).from(indiePosts).where(and(inArray(indiePosts.id, ids), isPublic));
  const cards = new Map((await toCards(cardRows)).map((c) => [c.slug, c]));
  return new Map(cardRows.flatMap((r) => (cards.has(r.slug) ? [[r.id, cards.get(r.slug)!] as const] : [])));
}

function attach(rows: Array<{ id: string; score: number; likes: number }>, cards: Map<string, IndieCardDto>): RankedIndie[] {
  return rows.flatMap((r) => {
    const card = cards.get(r.id);
    return card ? [{ card, score: r.score, likes: r.likes }] : [];
  });
}

/** 그 달 TOP 10. 확정된 달이면 저장한 순위를, 아니면 실시간으로 센다 */
export async function getMonthRanking(ym: string): Promise<{ items: RankedIndie[]; finalized: boolean }> {
  const saved = await getDb().select({ id: hallOfFameMonths.postId, score: hallOfFameMonths.score }).from(hallOfFameMonths).where(eq(hallOfFameMonths.ym, ym)).orderBy(hallOfFameMonths.rank);
  const rows = saved.length > 0 ? saved.map((s) => ({ ...s, likes: 0 })) : await liveRanking(ym);
  return { items: attach(rows, await cardsById(rows.map((r) => r.id))), finalized: saved.length > 0 };
}

/** 역대 선정작 — 확정된 달마다 1위 한 줄, 최신 달부터 */
export async function listHallHistory(): Promise<Array<{ ym: string; top: RankedIndie | null }>> {
  const rows = await getDb().select({ ym: hallOfFameMonths.ym, id: hallOfFameMonths.postId, score: hallOfFameMonths.score }).from(hallOfFameMonths).where(eq(hallOfFameMonths.rank, 1)).orderBy(desc(hallOfFameMonths.ym));
  const cards = await cardsById(rows.map((r) => r.id));
  return rows.map((r) => {
    const card = cards.get(r.id);
    return { ym: r.ym, top: card ? { card, score: r.score, likes: 0 } : null };
  });
}

/** 월말 확정 — 일일 크론이 달이 바뀐 날 지난달을 닫는다. 이미 닫힌 달은 건드리지 않는다 */
export async function finalizeHallOfFame(ym: string): Promise<number> {
  const db = getDb();
  const exists = await db.select({ x: sql`1` }).from(hallOfFameMonths).where(eq(hallOfFameMonths.ym, ym)).limit(1);
  if (exists.length > 0) return 0;
  const ranking = await liveRanking(ym);
  if (ranking.length === 0) return 0;
  await db.insert(hallOfFameMonths).values(ranking.map((r, i) => ({ ym, rank: i + 1, postId: r.id, score: r.score, ...createdBy("cron:daily") }))).onConflictDoNothing();
  return ranking.length;
}
