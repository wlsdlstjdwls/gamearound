// 내 게임 통계(2026-10-27, 기획서 3장 4번) — 지난 30일 조회, 플레이하기 클릭, 찜, 댓글. 글쓴이 본인만 본다(requireUser + author 조건).
//
// 질의는 글 목록과 네 가지 집계를 나란히 보낸다(Neon 왕복은 줄 세운 수가 속도를 정한다). 집계는 모두 "내 글" 에 join 해서 거른다 —
// 글 id 를 먼저 받아 넘기면 왕복이 하나 더 준다.
// 찜과 댓글은 하루 표가 없어 행의 생성 시각으로 센다. 댓글은 남이 단 것만 센다 — 글쓴이 답글은 반응이 아니다.
import "server-only";
import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { developerFollows, indieLinkClicks, indiePostComments, indiePostLikes, indiePosts, indieViewDays, indieViewSources } from "@/server/db/schema";
import { INDIE_STATS_WINDOW_DAYS, isPlayKind, PLAY_LINK_KINDS } from "@/lib/indie/promo";
import type { IndieStatsDetailDto, IndieStatsDto, IndieStatsRowDto, IndieStatsTotals } from "@/lib/indie/dto";

/** 하루 표의 기간 시작(KST 날짜). 오늘 포함 30일 */
const windowStartDay = sql`((now() at time zone 'Asia/Seoul')::date - ${INDIE_STATS_WINDOW_DAYS - 1}::int)`;
/** 생성 시각 표의 기간 시작. 하루 표와 같은 경계(한국 자정)로 맞춘다 — 둘이 다르면 같은 화면의 숫자가 다른 기간을 센다 */
const windowStartTs = sql`(${windowStartDay}::timestamp at time zone 'Asia/Seoul')`;

const zero = (): IndieStatsTotals => ({ views: 0, plays: 0, outbound: 0, likes: 0, comments: 0 });

export async function getMyIndieStats(userId: string): Promise<IndieStatsDto> {
  const db = getDb();
  const mine = eq(indiePosts.authorUserId, userId);
  const [posts, viewRows, clickRows, likeRows, commentRows, followerRows] = await Promise.all([
    db
      .select({
        id: indiePosts.id,
        slug: indiePosts.slug,
        title: indiePosts.title,
        status: indiePosts.status,
        review: indiePosts.review,
        viewCount: indiePosts.viewCount,
        likeCount: indiePosts.likeCount,
        commentCount: indiePosts.commentCount,
      })
      .from(indiePosts)
      .where(mine)
      .orderBy(desc(indiePosts.createdAt)),
    db
      .select({ postId: indieViewDays.postId, views: indieViewDays.views })
      .from(indieViewDays)
      .innerJoin(indiePosts, eq(indiePosts.id, indieViewDays.postId))
      .where(and(mine, gte(indieViewDays.day, windowStartDay))),
    db
      .select({ postId: indieLinkClicks.postId, kind: indieLinkClicks.linkKind, clicks: indieLinkClicks.clicks })
      .from(indieLinkClicks)
      .innerJoin(indiePosts, eq(indiePosts.id, indieLinkClicks.postId))
      .where(and(mine, gte(indieLinkClicks.day, windowStartDay))),
    db
      .select({ postId: indiePostLikes.postId, n: sql<number>`count(*)::int` })
      .from(indiePostLikes)
      .innerJoin(indiePosts, eq(indiePosts.id, indiePostLikes.postId))
      .where(and(mine, gte(indiePostLikes.createdAt, windowStartTs)))
      .groupBy(indiePostLikes.postId),
    db
      .select({ postId: indiePostComments.postId, n: sql<number>`count(*)::int` })
      .from(indiePostComments)
      .innerJoin(indiePosts, eq(indiePosts.id, indiePostComments.postId))
      .where(and(mine, ne(indiePostComments.authorUserId, userId), eq(indiePostComments.status, "published"), gte(indiePostComments.createdAt, windowStartTs)))
      .groupBy(indiePostComments.postId),
    db.select({ n: sql<number>`count(*)::int` }).from(developerFollows).where(eq(developerFollows.developerUserId, userId)),
  ]);

  const likes = new Map(likeRows.map((r) => [r.postId, r.n]));
  const comments = new Map(commentRows.map((r) => [r.postId, r.n]));
  const sum = zero();
  const rows: IndieStatsRowDto[] = posts.map((p) => {
    const w = zero();
    for (const v of viewRows) if (v.postId === p.id) w.views += v.views;
    for (const c of clickRows) {
      if (c.postId !== p.id) continue;
      if (isPlayKind(c.kind)) w.plays += c.clicks;
      else w.outbound += c.clicks;
    }
    w.likes = likes.get(p.id) ?? 0;
    w.comments = comments.get(p.id) ?? 0;
    for (const k of Object.keys(sum) as Array<keyof IndieStatsTotals>) sum[k] += w[k];
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      live: p.status === "published" && p.review === "approved",
      window: w,
      allTime: { views: p.viewCount, likes: p.likeCount, comments: p.commentCount },
    };
  });
  return { followers: followerRows[0]?.n ?? 0, window: sum, rows };
}

/**
 * 게임 하나의 30일 날짜별 조회, 플레이하기 클릭과 유입 경로(메이커 멤버십 "통계 자세히"). 내 글이 아니면 null — 남의 글 통계를 여는 주소는 없다.
 * 날짜 줄은 DB 의 generate_series 로 빈 날까지 채워 받는다: 화면이 날짜를 만들면 서버와 브라우저의 "오늘" 이 어긋나는 날이 있다.
 * 멤버십 확인은 부르는 쪽(화면)이 한다 — 이 함수는 "누구에게 보여 줄지" 를 모른다.
 */
export async function getMyIndieStatsDetail(userId: string, postId: string): Promise<IndieStatsDetailDto | null> {
  const db = getDb();
  const [post] = await db
    .select({ id: indiePosts.id, slug: indiePosts.slug, title: indiePosts.title })
    .from(indiePosts)
    .where(and(eq(indiePosts.id, postId), eq(indiePosts.authorUserId, userId)))
    .limit(1);
  if (!post) return null;
  const [days, sources] = await Promise.all([
    db.execute<{ day: string; views: number; plays: number }>(sql`
      select d::date::text as day,
        coalesce((select ${indieViewDays.views} from ${indieViewDays} where ${indieViewDays.postId} = ${postId} and ${indieViewDays.day} = d::date), 0)::int as views,
        coalesce((select sum(${indieLinkClicks.clicks}) from ${indieLinkClicks} where ${indieLinkClicks.postId} = ${postId} and ${indieLinkClicks.day} = d::date and ${inArray(indieLinkClicks.linkKind, [...PLAY_LINK_KINDS])}), 0)::int as plays
      from generate_series(${windowStartDay}, (now() at time zone 'Asia/Seoul')::date, interval '1 day') as d
      order by d`),
    db
      .select({ source: indieViewSources.source, views: sql<number>`sum(${indieViewSources.views})::int` })
      .from(indieViewSources)
      .where(and(eq(indieViewSources.postId, postId), gte(indieViewSources.day, windowStartDay)))
      .groupBy(indieViewSources.source)
      .orderBy(desc(sql`sum(${indieViewSources.views})`)),
  ]);
  return { ...post, days: days.rows.map((r) => ({ day: r.day, views: Number(r.views), plays: Number(r.plays) })), sources };
}
