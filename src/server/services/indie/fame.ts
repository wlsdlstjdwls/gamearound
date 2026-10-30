// 명예의 전당(S-08), 슈퍼루키(S-09), 인디 게임 찜과 조회 기록. 점수 식과 근거는 lib/indie/fame 머리 주석.
// 대상은 모두 "승인된 공개 글" 이다(isPublic) — 승인 대기 게임은 어느 순위에도 서지 않는다(기획서 7장).
import { ownedByCurrentSession } from "@/server/auth/session";
import "server-only";
import { and, desc, eq, gte, inArray, lt, lte, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { hallOfFameMonths, indiePostComments, indiePostLikes, indiePosts, indieViewMonths } from "@/server/db/schema";
import { getCurrentUser, requireUser } from "@/server/services/users";
import {
  HOF_COMMENT_WEIGHT,
  HOF_LIKE_WEIGHT,
  HOF_MIN_LIKES,
  HOF_PODIUM,
  HOF_TOP,
  HOF_VIEWS_PER_POINT,
  kstYm,
  pickMyStanding,
  prevYm,
  type MyFameStanding,
  ROOKIE_COMMENT_WEIGHT,
  ROOKIE_LIKE_WEIGHT,
  ROOKIE_LIMIT,
  ROOKIE_VIEWS_PER_POINT,
  ROOKIE_WINDOW_DAYS,
  scoreChangePct,
} from "@/lib/indie/fame";
import type { IndieCardDto } from "@/lib/indie/dto";
import { cardColumns, isPublic, toCards } from "./read";
import { bumpIndieViewDay, bumpIndieViewSource } from "./promo";
import type { TrafficSource } from "@/lib/indie/traffic";

/** change: 지난달 대비 점수 변화(%). null 이면 지난달 점수가 없다(새로 진입). 역대 선정작 줄처럼 견줄 일이 없는 자리는 undefined */
export type RankedIndie = { card: IndieCardDto; score: number; likes: number; change?: number | null };
export type RookieIndie = { card: IndieCardDto; daysSince: number; likes: number };

/** 댓글 점수의 재료 — 글쓴이가 아닌 서로 다른 사람 수(lib/indie/fame 머리 주석). 숨긴 댓글은 안 센다 */
const commenterCount = sql<number>`count(distinct ${indiePostComments.authorUserId})::int`;
const notAuthorComment = and(sql`${indiePostComments.authorUserId} <> ${indiePosts.authorUserId}`, eq(indiePostComments.status, "published"));

/** 그 기간 글마다의 댓글 사람 수. 범위를 안 주면 전체 기간, ids 를 주면 그 글만 */
function commentersQuery(range?: { start: SQL; end: SQL }, ids?: string[]) {
  return getDb()
    .select({ postId: indiePostComments.postId, n: commenterCount.as("commenter_n") })
    .from(indiePostComments)
    .innerJoin(indiePosts, eq(indiePosts.id, indiePostComments.postId))
    .where(and(notAuthorComment, range && gte(indiePostComments.createdAt, range.start), range && lt(indiePostComments.createdAt, range.end), ids && inArray(indiePostComments.postId, ids)))
    .groupBy(indiePostComments.postId);
}

/** 한국 달의 시작, 끝(끝은 다음 달 1일 0시) */
function ymRange(ym: string) {
  const start = sql`(${`${ym}-01`}::date at time zone 'Asia/Seoul')`;
  const end = sql`((${`${ym}-01`}::date + interval '1 month') at time zone 'Asia/Seoul')`;
  return { start, end };
}

/** 상세 조회 한 번. 글쓴이 본인 조회는 세지 않는다(혼자 새로고침해 순위를 올리지 못하게). source 는 유입 경로 갈래(lib/indie/traffic) */
export async function recordIndieView(postId: string, authorUserId: string, source: TrafficSource): Promise<void> {
  const viewer = await getCurrentUser().catch(() => null);
  if (viewer?.id === authorUserId) return;
  const db = getDb();
  const ym = kstYm(new Date());
  await Promise.all([
    db.update(indiePosts).set({ viewCount: sql`${indiePosts.viewCount} + 1` }).where(eq(indiePosts.id, postId)),
    // 하루 조회(내 게임 통계의 "지난 30일") — 달 집계로는 30일을 못 센다(schema-indie-promo)
    bumpIndieViewDay(postId),
    // 유입 경로(메이커 멤버십 통계 자세히). 모두에게서 센다(schema-indie-promo)
    bumpIndieViewSource(postId, source),
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
  const commenters = commentersQuery().as("commenters");
  const score = sql`((${indiePosts.likeCount} * ${ROOKIE_LIKE_WEIGHT}::int + coalesce(${commenters.n}, 0) * ${ROOKIE_COMMENT_WEIGHT}::int + ${indiePosts.viewCount} / ${ROOKIE_VIEWS_PER_POINT}::numeric) * (1 - ${ageDays} / ${ROOKIE_WINDOW_DAYS}::numeric))`;
  const rows = await getDb()
    .select({ ...cardColumns, likes: indiePosts.likeCount, days: sql<number>`floor(${ageDays})::int` })
    .from(indiePosts)
    .leftJoin(commenters, eq(commenters.postId, indiePosts.id))
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
  const commenters = commentersQuery({ start, end }).as("month_commenters");
  const score = sql<number>`(${likes.n} * ${HOF_LIKE_WEIGHT}::int + coalesce(${commenters.n}, 0) * ${HOF_COMMENT_WEIGHT}::int + coalesce(${indieViewMonths.views}, 0) / ${HOF_VIEWS_PER_POINT}::int)::int`;
  const rows = await db
    .select({ id: indiePosts.id, likes: likes.n, score })
    .from(indiePosts)
    .innerJoin(likes, eq(likes.postId, indiePosts.id))
    .leftJoin(commenters, eq(commenters.postId, indiePosts.id))
    .leftJoin(indieViewMonths, and(eq(indieViewMonths.postId, indiePosts.id), eq(indieViewMonths.ym, ym)))
    .where(and(isPublic, gte(likes.n, HOF_MIN_LIKES)))
    .orderBy(desc(score), desc(likes.n))
    .limit(HOF_TOP);
  return rows;
}

/**
 * 그 달 점수를 글마다 센다 — liveRanking 과 같은 식(찜 가중 + 댓글 가중 + 조회 환산)이되 상위 자르기와 최소 찜 문턱은 없다.
 * 순위표의 "지난달 대비" 를 세는 데 쓴다: 지난달에 10위 밖이었던 글도 지난달 점수는 있다.
 */
async function monthScores(ym: string, ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const db = getDb();
  const { start, end } = ymRange(ym);
  const [likeRows, viewRows, commentRows] = await Promise.all([
    db
      .select({ id: indiePostLikes.postId, n: sql<number>`count(*)::int` })
      .from(indiePostLikes)
      .where(and(inArray(indiePostLikes.postId, ids), gte(indiePostLikes.createdAt, start), lt(indiePostLikes.createdAt, end)))
      .groupBy(indiePostLikes.postId),
    db.select({ id: indieViewMonths.postId, views: indieViewMonths.views }).from(indieViewMonths).where(and(inArray(indieViewMonths.postId, ids), eq(indieViewMonths.ym, ym))),
    commentersQuery({ start, end }, ids),
  ]);
  const out = new Map<string, number>();
  for (const r of likeRows) out.set(r.id, r.n * HOF_LIKE_WEIGHT);
  for (const r of commentRows) out.set(r.postId, (out.get(r.postId) ?? 0) + r.n * HOF_COMMENT_WEIGHT);
  // 정수 나눗셈 — liveRanking 의 views / HOF_VIEWS_PER_POINT::int 와 같게 내림한다
  for (const r of viewRows) out.set(r.id, (out.get(r.id) ?? 0) + Math.floor(r.views / HOF_VIEWS_PER_POINT));
  return out;
}

async function cardsById(ids: string[]): Promise<Map<string, IndieCardDto>> {
  if (ids.length === 0) return new Map();
  // 확정한 달의 순위표도 지금 공개인 글만 세운다 — 운영진이 숨긴 글이 지난달 명예의 전당에 남아 있으면
  // 숨김이 노출을 못 막는다(기획서 v2.0 2.2 "노출 관리"). 빠진 자리는 attach 가 건너뛰어 순위가 한 칸씩 당겨진다
  const cardRows = await getDb().select(cardColumns).from(indiePosts).where(and(inArray(indiePosts.id, ids), isPublic));
  const cards = new Map((await toCards(cardRows)).map((c) => [c.slug, c]));
  return new Map(cardRows.flatMap((r) => (cards.has(r.slug) ? [[r.id, cards.get(r.slug)!] as const] : [])));
}

/** prev 를 주면 지난달 대비 변화(change)도 붙인다 */
function attach(rows: Array<{ id: string; score: number; likes: number }>, cards: Map<string, IndieCardDto>, prev?: Map<string, number>): RankedIndie[] {
  return rows.flatMap((r) => {
    const card = cards.get(r.id);
    if (!card) return [];
    return [prev ? { card, score: r.score, likes: r.likes, change: scoreChangePct(r.score, prev.get(r.id)) } : { card, score: r.score, likes: r.likes }];
  });
}

/** 그 달 TOP 10. 확정된 달이면 저장한 순위를, 아니면 실시간으로 센다 */
export async function getMonthRanking(ym: string): Promise<{ items: RankedIndie[]; finalized: boolean }> {
  const saved = await getDb().select({ id: hallOfFameMonths.postId, score: hallOfFameMonths.score }).from(hallOfFameMonths).where(eq(hallOfFameMonths.ym, ym)).orderBy(hallOfFameMonths.rank);
  const rows = saved.length > 0 ? saved.map((s) => ({ ...s, likes: 0 })) : await liveRanking(ym);
  const ids = rows.map((r) => r.id);
  // 카드와 지난달 점수는 서로 기다릴 일이 없어 나란히 묻는다(Neon 왕복은 줄 세운 수가 속도를 정한다)
  const [cards, prev] = await Promise.all([cardsById(ids), monthScores(prevYm(ym), ids)]);
  const items = attach(rows, cards, prev);
  return { items, finalized: saved.length > 0 };
}

/**
 * 이번 달 "내 게임 자리"(lib/indie/fame 의 pickMyStanding). 명예의 전당 화면이 마운트 뒤 api/me/fame 으로 부른다 —
 * 화면 본문은 ISR(revalidate 300)이라 쿠키를 읽을 수 없다. 내 공개 게임이 없으면 null.
 * 왕복은 둘이다: 내 글 id 와 이번 달 순위를 나란히, 그다음 내 글들의 이번 달 점수와 찜을 나란히.
 * 내 글은 세션 서브질의로 거른다 — 부르는 쪽이 세션을 먼저 묻지 않아도 된다(2026-10-30 "늦게 나온다": 그 한 왕복이 맨 앞에 줄을 섰다).
 * 비로그인이면 null
 */
export async function getMyFameStanding(): Promise<MyFameStanding | null> {
  const owner = await ownedByCurrentSession(indiePosts.authorUserId);
  if (!owner) return null;
  const db = getDb();
  const ym = kstYm(new Date());
  const [mine, ranking] = await Promise.all([
    db.select({ id: indiePosts.id, title: indiePosts.title, slug: indiePosts.slug }).from(indiePosts).where(and(owner, isPublic)),
    liveRanking(ym),
  ]);
  if (mine.length === 0) return null;
  const ids = mine.map((m) => m.id);
  const { start, end } = ymRange(ym);
  const [scores, likeRows] = await Promise.all([
    monthScores(ym, ids),
    db
      .select({ id: indiePostLikes.postId, n: sql<number>`count(*)::int` })
      .from(indiePostLikes)
      .where(and(inArray(indiePostLikes.postId, ids), gte(indiePostLikes.createdAt, start), lt(indiePostLikes.createdAt, end)))
      .groupBy(indiePostLikes.postId),
  ]);
  const likes = new Map(likeRows.map((r) => [r.id, r.n]));
  return pickMyStanding(
    ranking,
    mine.map((m) => ({ ...m, score: scores.get(m.id) ?? 0, likes: likes.get(m.id) ?? 0 })),
  );
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

/** 글 하나가 지난 달들(확정된 달)에 오른 1~HOF_PODIUM 위, 최신 달부터. 인디 상세의 지난 순위 딱지 */
export async function listIndieFameHistory(postId: string): Promise<Array<{ ym: string; rank: number }>> {
  return getDb()
    .select({ ym: hallOfFameMonths.ym, rank: hallOfFameMonths.rank })
    .from(hallOfFameMonths)
    .where(and(eq(hallOfFameMonths.postId, postId), lte(hallOfFameMonths.rank, HOF_PODIUM)))
    .orderBy(desc(hallOfFameMonths.ym));
}

/** 글 하나의 이번 달 실시간 순위. TOP 밖이면 null. 인디 상세 머리 판이 1~3위를 꾸밀 때 쓴다(2026-10-28) */
export async function getIndieMonthRank(postId: string): Promise<number | null> {
  return (await getMyMonthRanks([postId])).get(postId) ?? null;
}

/**
 * 내 글들의 이번 달 실시간 순위(1부터). TOP 밖이면 Map 에 없다. 등록현황 줄이 "명예의 전당 N위" 로 자랑할 때 쓴다
 * (2026-10-28 사용자 "순위나 조회 수, 찜 수 등을 예쁘게 — 뿌듯할 듯"). 왕복은 순위 질의 하나다.
 */
export async function getMyMonthRanks(postIds: string[]): Promise<Map<string, number>> {
  if (postIds.length === 0) return new Map();
  const mine = new Set(postIds);
  const ranking = await liveRanking(kstYm(new Date()));
  return new Map(ranking.flatMap((r, i) => (mine.has(r.id) ? [[r.id, i + 1] as const] : [])));
}
