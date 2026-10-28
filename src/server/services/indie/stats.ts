// 내 게임 통계(2026-10-27, 기획서 3장 4번) — 지난 30일 조회, 플레이하기 클릭, 찜, 댓글. 글쓴이 본인만 본다(requireUser + author 조건).
//
// 질의는 글 목록과 네 가지 집계를 나란히 보낸다(Neon 왕복은 줄 세운 수가 속도를 정한다). 집계는 모두 "내 글" 에 join 해서 거른다 —
// 글 id 를 먼저 받아 넘기면 왕복이 하나 더 준다.
// 찜과 댓글은 하루 표가 없어 행의 생성 시각으로 센다. 댓글은 남이 단 것만 센다 — 글쓴이 답글은 반응이 아니다.
// 날짜 줄(days, 2026-10-28 그래프)은 DB 의 generate_series 로 빈 날까지 채워 받는다 — 화면이 날짜를 만들면 서버와 브라우저의 "오늘" 이 어긋난다.
// 항목별 순위(ranks, 2026-10-28 사용자 "각 항목마다 순위도")는 공개 인디 게임 전부를 모집단으로 창 함수 한 질의에서 센다 — 기간은 위 30일과 같다.
import "server-only";
import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { developerFollows, indieLinkClicks, indiePostComments, indiePostLikes, indiePosts, indieViewDays, indieViewSources } from "@/server/db/schema";
import { INDIE_STATS_WINDOW_DAYS, isPlayKind, PLAY_LINK_KINDS } from "@/lib/indie/promo";
import type { IndieStatsDay, IndieStatsDetailDto, IndieStatsDto, IndieStatsRanks, IndieStatsRowDto, IndieStatsTotals } from "@/lib/indie/dto";
import { isPublic } from "./read";

/** 하루 표의 기간 시작(KST 날짜). 오늘 포함 30일 */
const windowStartDay = sql`((now() at time zone 'Asia/Seoul')::date - ${INDIE_STATS_WINDOW_DAYS - 1}::int)`;
/** 생성 시각 표의 기간 시작. 하루 표와 같은 경계(한국 자정)로 맞춘다 — 둘이 다르면 같은 화면의 숫자가 다른 기간을 센다 */
const windowStartTs = sql`(${windowStartDay}::timestamp at time zone 'Asia/Seoul')`;

const zero = (): IndieStatsTotals => ({ views: 0, plays: 0, outbound: 0, likes: 0, comments: 0 });
const noRanks = (): IndieStatsRanks => ({ views: null, plays: null, likes: null, comments: null });

/**
 * 내 글들의 항목별 순위와 모집단 수. 모집단은 지금 공개 중인 인디 게임(목록에 서는 글, read 의 isPublic)이다.
 * 값이 0 인 항목은 순위를 주지 않는다 — "120개 중 120위" 는 정보가 아니라 기운만 뺀다.
 * 댓글은 글쓴이 자신의 것을 뺀다(위 집계와 같은 규칙). 창 함수 한 질의라 왕복은 하나다.
 */
async function myRanks(userId: string): Promise<{ ranks: Map<string, IndieStatsRanks>; population: number }> {
  const res = await getDb().execute<{ id: string; author: string; views: number | null; plays: number | null; likes: number | null; comments: number | null; total: number }>(sql`
    with pub as (select ${indiePosts.id} as id, ${indiePosts.authorUserId} as author from ${indiePosts} where ${isPublic}),
    v as (select post_id, sum(views)::int n from ${indieViewDays} where day >= ${windowStartDay} group by post_id),
    k as (select post_id, sum(clicks)::int n from ${indieLinkClicks} where day >= ${windowStartDay} and ${inArray(sql`link_kind`, [...PLAY_LINK_KINDS])} group by post_id),
    l as (select post_id, count(*)::int n from ${indiePostLikes} where created_at >= ${windowStartTs} group by post_id),
    c as (select m.post_id, count(*)::int n from ${indiePostComments} m join ${indiePosts} p on p.id = m.post_id
          where m.author_user_id <> p.author_user_id and m.status = 'published' and m.created_at >= ${windowStartTs} group by m.post_id),
    r as (
      select pub.id, pub.author,
        coalesce(v.n, 0) vn, coalesce(k.n, 0) kn, coalesce(l.n, 0) ln, coalesce(c.n, 0) cn,
        rank() over (order by coalesce(v.n, 0) desc) vr, rank() over (order by coalesce(k.n, 0) desc) kr,
        rank() over (order by coalesce(l.n, 0) desc) lr, rank() over (order by coalesce(c.n, 0) desc) cr,
        count(*) over () total
      from pub left join v on v.post_id = pub.id left join k on k.post_id = pub.id left join l on l.post_id = pub.id left join c on c.post_id = pub.id
    ),
    -- 내 공개 글이 없어도 모집단 수는 받아야 해서 아무 줄 하나를 덧붙인다(author 로 걸러 버린다)
    pick as (select * from r where author = ${userId} union all (select * from r limit 1))
    select id, author,
      case when vn > 0 then vr end::int as views, case when kn > 0 then kr end::int as plays,
      case when ln > 0 then lr end::int as likes, case when cn > 0 then cr end::int as comments, total::int as total
    from pick`);
  const population = Number(res.rows[0]?.total ?? 0);
  const ranks = new Map<string, IndieStatsRanks>();
  const n = (x: number | null) => (x === null ? null : Number(x));
  for (const r of res.rows) {
    if (r.author !== userId) continue;
    ranks.set(r.id, { views: n(r.views), plays: n(r.plays), likes: n(r.likes), comments: n(r.comments) });
  }
  return { ranks, population };
}

export async function getMyIndieStats(userId: string): Promise<IndieStatsDto> {
  const db = getDb();
  const mine = eq(indiePosts.authorUserId, userId);
  const [posts, viewRows, clickRows, likeRows, commentRows, followerRows, dayRows, ranked] = await Promise.all([
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
      .select({ postId: indieViewDays.postId, day: sql<string>`${indieViewDays.day}::text`, views: indieViewDays.views })
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
    // 내 게임 모두의 날짜별 합. 찜과 댓글은 한국 날짜로 잘라 센다(하루 표와 같은 경계)
    db.execute<{ day: string; views: number; plays: number; likes: number; comments: number }>(sql`
      select d::date::text as day,
        coalesce((select sum(v.views) from ${indieViewDays} v join ${indiePosts} p on p.id = v.post_id where p.author_user_id = ${userId} and v.day = d::date), 0)::int as views,
        coalesce((select sum(c.clicks) from ${indieLinkClicks} c join ${indiePosts} p on p.id = c.post_id where p.author_user_id = ${userId} and c.day = d::date and ${inArray(sql`c.link_kind`, [...PLAY_LINK_KINDS])}), 0)::int as plays,
        (select count(*) from ${indiePostLikes} l join ${indiePosts} p on p.id = l.post_id where p.author_user_id = ${userId} and (l.created_at at time zone 'Asia/Seoul')::date = d::date)::int as likes,
        (select count(*) from ${indiePostComments} m join ${indiePosts} p on p.id = m.post_id where p.author_user_id = ${userId} and m.author_user_id <> ${userId} and m.status = 'published' and (m.created_at at time zone 'Asia/Seoul')::date = d::date)::int as comments
      from generate_series(${windowStartDay}, (now() at time zone 'Asia/Seoul')::date, interval '1 day') as d
      order by d`),
    myRanks(userId),
  ]);
  const days: IndieStatsDay[] = dayRows.rows.map((r) => ({ day: r.day, views: Number(r.views), plays: Number(r.plays), likes: Number(r.likes), comments: Number(r.comments) }));
  const dayIndex = new Map(days.map((d, i) => [d.day, i]));

  const likes = new Map(likeRows.map((r) => [r.postId, r.n]));
  const comments = new Map(commentRows.map((r) => [r.postId, r.n]));
  const sum = zero();
  const rows: IndieStatsRowDto[] = posts.map((p) => {
    const w = zero();
    const viewsByDay = days.map(() => 0);
    for (const v of viewRows) {
      if (v.postId !== p.id) continue;
      w.views += v.views;
      const i = dayIndex.get(v.day);
      if (i !== undefined) viewsByDay[i] += v.views;
    }
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
      viewsByDay,
      ranks: ranked.ranks.get(p.id) ?? noRanks(),
    };
  });
  return { followers: followerRows[0]?.n ?? 0, window: sum, rows, days, population: ranked.population };
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
  const [days, sources, ranked] = await Promise.all([
    db.execute<{ day: string; views: number; plays: number; likes: number; comments: number }>(sql`
      select d::date::text as day,
        coalesce((select ${indieViewDays.views} from ${indieViewDays} where ${indieViewDays.postId} = ${postId} and ${indieViewDays.day} = d::date), 0)::int as views,
        coalesce((select sum(${indieLinkClicks.clicks}) from ${indieLinkClicks} where ${indieLinkClicks.postId} = ${postId} and ${indieLinkClicks.day} = d::date and ${inArray(indieLinkClicks.linkKind, [...PLAY_LINK_KINDS])}), 0)::int as plays,
        (select count(*) from ${indiePostLikes} l where l.post_id = ${postId} and (l.created_at at time zone 'Asia/Seoul')::date = d::date)::int as likes,
        (select count(*) from ${indiePostComments} m where m.post_id = ${postId} and m.author_user_id <> ${userId} and m.status = 'published' and (m.created_at at time zone 'Asia/Seoul')::date = d::date)::int as comments
      from generate_series(${windowStartDay}, (now() at time zone 'Asia/Seoul')::date, interval '1 day') as d
      order by d`),
    db
      .select({ source: indieViewSources.source, views: sql<number>`sum(${indieViewSources.views})::int` })
      .from(indieViewSources)
      .where(and(eq(indieViewSources.postId, postId), gte(indieViewSources.day, windowStartDay)))
      .groupBy(indieViewSources.source)
      .orderBy(desc(sql`sum(${indieViewSources.views})`)),
    myRanks(userId),
  ]);
  return {
    ...post,
    days: days.rows.map((r) => ({ day: r.day, views: Number(r.views), plays: Number(r.plays), likes: Number(r.likes), comments: Number(r.comments) })),
    sources,
    ranks: ranked.ranks.get(postId) ?? noRanks(),
    population: ranked.population,
  };
}
