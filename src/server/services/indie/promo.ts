// 인디 홍보 기본기 쓰기(2026-10-27) — 바깥 링크 클릭 집계, 하루 조회, 개발자 소식 받기와 그 알림.
//
// 클릭은 경유 주소(app/api/indie/out)가 응답을 보낸 뒤(after) 센다 — 세는 왕복이 넘겨 주기를 늦추지 않게.
// 공개 글(승인, 공개)만 넘겨 준다: 아무 글이나 넘겨 주면 승인 전 글에 적은 주소로 우리 도메인이 사람을 보내는 길이 된다.
//
// 소식 알림은 알림함(notifications)에 사람마다 한 줄씩 넣는다. 받는 사람 수만큼 왕복하지 않게 insert ... select 한 번으로 펼친다.
import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { developerFollows, indieLinkClicks, indiePostLikes, indiePosts, indieViewDays, indieViewSources, notifications, users } from "@/server/db/schema";
import type { TrafficSource } from "@/lib/indie/traffic";
import { getCurrentUser, requireUser } from "@/server/services/users";
import { postPath, type POST_CATEGORIES } from "@/lib/community/constants";
import { INDIE_NOTIFY_MESSAGES as N } from "@/lib/indie/promo-messages";
import { indiePath } from "@/lib/routes";
import { authorNameSql } from "@/server/services/community/columns";

/** 한국 날짜. 하루 집계 표의 열쇠다(schema-indie-promo 머리 주석) */
const kstToday = sql`(now() at time zone 'Asia/Seoul')::date`;

/** 경유 주소가 넘겨 줄 곳. 공개 글이 아니거나 그 순번의 링크가 없으면 null */
export async function resolveIndieOutLink(postId: string, index: number): Promise<{ url: string; kind: string; authorUserId: string } | null> {
  const [row] = await getDb()
    .select({ links: indiePosts.links, authorUserId: indiePosts.authorUserId })
    .from(indiePosts)
    .where(and(eq(indiePosts.id, postId), eq(indiePosts.status, "published"), eq(indiePosts.review, "approved")))
    .limit(1);
  const link = row?.links[index];
  return link ? { url: link.url, kind: link.kind, authorUserId: row.authorUserId } : null;
}

/** 바깥 링크 클릭 한 번. 글쓴이 본인 클릭은 세지 않는다(조회와 같은 규칙, services/indie/fame 의 recordIndieView) */
export async function recordIndieLinkClick(postId: string, kind: string, authorUserId: string): Promise<void> {
  const viewer = await getCurrentUser().catch(() => null);
  if (viewer?.id === authorUserId) return;
  await getDb()
    .insert(indieLinkClicks)
    .values({ postId, day: kstToday, linkKind: kind, clicks: 1, ...createdBy("system") })
    .onConflictDoUpdate({ target: [indieLinkClicks.postId, indieLinkClicks.day, indieLinkClicks.linkKind], set: { clicks: sql`${indieLinkClicks.clicks} + 1`, updatedAt: sql`now()` } });
}

/** 하루 조회 한 칸 올리기. 거르기(글쓴이 본인)는 부르는 쪽(recordIndieView)이 이미 했다 */
export async function bumpIndieViewDay(postId: string): Promise<void> {
  await getDb()
    .insert(indieViewDays)
    .values({ postId, day: kstToday, views: 1, ...createdBy("system") })
    .onConflictDoUpdate({ target: [indieViewDays.postId, indieViewDays.day], set: { views: sql`${indieViewDays.views} + 1`, updatedAt: sql`now()` } });
}

/** 유입 경로 하루 칸 올리기(schema-indie-promo 의 indieViewSources). 거르기는 bumpIndieViewDay 와 같다 */
export async function bumpIndieViewSource(postId: string, source: TrafficSource): Promise<void> {
  await getDb()
    .insert(indieViewSources)
    .values({ postId, day: kstToday, source, views: 1, ...createdBy("system") })
    .onConflictDoUpdate({ target: [indieViewSources.postId, indieViewSources.day, indieViewSources.source], set: { views: sql`${indieViewSources.views} + 1`, updatedAt: sql`now()` } });
}

export async function isFollowingDeveloper(developerUserId: string): Promise<boolean> {
  const u = await getCurrentUser().catch(() => null);
  if (!u) return false;
  const r = await getDb()
    .select({ x: sql`1` })
    .from(developerFollows)
    .where(and(eq(developerFollows.developerUserId, developerUserId), eq(developerFollows.followerUserId, u.id)))
    .limit(1);
  return r.length > 0;
}

/** 소식 받기 토글. 자기 자신은 따를 수 없다 — 자기 개발일지 알림이 자기에게 오는 꼴이 된다 */
export async function toggleDeveloperFollow(developerUserId: string): Promise<{ following: boolean }> {
  const u = await requireUser();
  if (u.id === developerUserId) throw new Error("내 소식은 받을 수 없어요");
  const db = getDb();
  const removed = await db
    .delete(developerFollows)
    .where(and(eq(developerFollows.developerUserId, developerUserId), eq(developerFollows.followerUserId, u.id)))
    .returning({ x: developerFollows.developerUserId });
  if (removed.length > 0) return { following: false };
  await db.insert(developerFollows).values({ developerUserId, followerUserId: u.id, ...createdBy("user", u.id) }).onConflictDoNothing();
  return { following: true };
}

/**
 * 새 개발일지를 소식 받는 사람에게. 게시판 글쓰기(createPostAction)가 개발일지를 세운 뒤 부른다.
 * 글쓴이 이름은 게시판과 같은 표시 이름이다 — 알림을 누르면 그 이름이 단 글로 간다.
 */
export async function notifyFollowersOfDevlog(p: { authorUserId: string; postId: string; title: string; category: (typeof POST_CATEGORIES)[number] }): Promise<void> {
  const db = getDb();
  const [author] = await db.select({ name: authorNameSql }).from(users).where(eq(users.id, p.authorUserId));
  if (!author) return;
  const body = N.devlog(author.name, p.title);
  const link = postPath(p.postId, p.category);
  await db.execute(sql`
    insert into ${notifications} (user_id, kind, body, link, created_source, updated_source)
    select ${developerFollows.followerUserId}, 'dev_news', ${body}, ${link}, 'system', 'system'
    from ${developerFollows}
    where ${developerFollows.developerUserId} = ${p.authorUserId}
  `);
}

/**
 * 인디 게임이 출시됐다 — 개발자 소식을 받는 사람과 그 게임을 찜한 사람에게 한 번씩. 둘 다인 사람은 한 줄만 받는다(union).
 * 단계를 내렸다 다시 올리면 또 불릴 수 있어 이미 같은 알림(같은 링크의 출시 알림)을 받은 사람은 뺀다.
 * 공개 글만 알린다 — 승인 전 글은 링크를 눌러도 404 다.
 */
export async function notifyIndieRelease(postId: string): Promise<void> {
  const db = getDb();
  const [post] = await db
    .select({ slug: indiePosts.slug, title: indiePosts.title, author: indiePosts.authorUserId })
    .from(indiePosts)
    .where(and(eq(indiePosts.id, postId), eq(indiePosts.status, "published"), eq(indiePosts.review, "approved")));
  if (!post) return;
  const body = N.released(post.title);
  const link = indiePath(post.slug);
  await db.execute(sql`
    insert into ${notifications} (user_id, kind, body, link, created_source, updated_source)
    select r.user_id, 'release', ${body}, ${link}, 'system', 'system'
    from (
      select ${developerFollows.followerUserId} as user_id from ${developerFollows} where ${developerFollows.developerUserId} = ${post.author}
      union
      select ${indiePostLikes.userId} from ${indiePostLikes} where ${indiePostLikes.postId} = ${postId}
    ) r
    where r.user_id <> ${post.author}
      and not exists (select 1 from ${notifications} n where n.user_id = r.user_id and n.kind = 'release' and n.link = ${link})
  `);
}
