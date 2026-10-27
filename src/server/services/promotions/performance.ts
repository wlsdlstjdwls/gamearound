// 산 사람이 보는 광고 성과(2026-10-27, 기획서 4.4 "부스트 기간마다 노출 수, 카드 클릭, 플레이하기 클릭, 찜 증가. 이 숫자가 없으면 두 번째 결제가 없다").
//
// 내 글에 걸린 걸기 줄 전부다 — 결제로 산 것, 이용권으로 건 것, 관리자가 시범으로 걸어 준 것 모두. 산 사람에게는 출처보다 "효과가 있었나" 가 궁금하다.
// 인디 게임 광고는 기간 안 플레이하기 클릭과 새 찜을 "광고 전 같은 길이 기간" 과 나란히 세운다 — 숫자 하나로는 늘었는지 알 수 없다.
// 플레이하기 클릭은 하루 표라 시작한 날, 끝난 날을 통째로 센다(한나절 차이). 찜은 행 시각이라 기간 그대로 센다.
// 기간 끝은 끝 시각, 회수 시각, 지금 가운데 이른 것이다 — 진행 중인 광고는 오늘까지만, 앞 기간도 같은 길이로 맞춘다.
// 줄마다 하위 질의 몇 개라 한 번 왕복이다. 한 사람이 건 광고는 많아야 수십 줄이다.
import "server-only";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { indieLinkClicks, indiePostLikes, indiePosts, posts, promotionBoosts, promotionImpressions, type PromoSlot, type PromoSource } from "@/server/db/schema";
import { boostState, type BoostState } from "@/lib/promo/boost";
import { PLAY_LINK_KINDS } from "@/lib/indie/promo";
import { PROMO_MESSAGES as M } from "@/lib/promo/messages";
import { postPath } from "@/lib/community/constants";
import { indiePath } from "@/lib/routes";
import { impressionSum } from "./columns";

/** 한 화면에 세우는 줄 수. 최근 것부터 — 오래된 광고는 다음 결제를 정하는 데 덜 쓰인다 */
const SHOWN = 50;

const kst = (ts: unknown) => sql`((${ts}) at time zone 'Asia/Seoul')::date`;
/** 성과를 세는 기간 끝(머리 주석) */
const effEnd = sql`least(${promotionBoosts.endsAt}, coalesce(${promotionBoosts.revokedAt}, ${promotionBoosts.endsAt}), now())`;
/** 하루 표로 센 기간 길이(일). 시작한 날, 끝난 날을 포함한다 */
const spanDays = sql`(${kst(effEnd)} - ${kst(promotionBoosts.startsAt)} + 1)`;
const playKind = inArray(indieLinkClicks.linkKind, [...PLAY_LINK_KINDS]);
const sameIndie = sql`${indieLinkClicks.postId} = ${promotionBoosts.targetId}`;

export type BoostPerformanceDto = {
  id: string;
  slot: PromoSlot;
  source: PromoSource;
  state: BoostState;
  targetTitle: string;
  targetHref: string | null;
  startsAt: Date;
  endsAt: Date;
  views: number;
  clicks: number;
  /** 인디 게임 광고만. 홍보 글 고정은 하루 표가 없어 비운다 */
  indie: { plays: number; playsBefore: number; likes: number; likesBefore: number } | null;
};

export async function listMyBoostPerformance(userId: string): Promise<BoostPerformanceDto[]> {
  const db = getDb();
  const plays = (from: ReturnType<typeof sql>, to: ReturnType<typeof sql>) =>
    sql<number>`coalesce((select sum(${indieLinkClicks.clicks}) from ${indieLinkClicks} where ${sameIndie} and ${playKind} and ${indieLinkClicks.day} >= ${from} and ${indieLinkClicks.day} < ${to}), 0)::int`;
  const likes = (from: ReturnType<typeof sql>, to: ReturnType<typeof sql>) =>
    sql<number>`(select count(*) from ${indiePostLikes} where ${indiePostLikes.postId} = ${promotionBoosts.targetId} and ${indiePostLikes.createdAt} >= ${from} and ${indiePostLikes.createdAt} < ${to})::int`;
  const startDay = kst(promotionBoosts.startsAt);
  const startTs = sql`${promotionBoosts.startsAt}`;
  const isIndie = eq(promotionBoosts.targetKind, "indie_post");

  const rows = await db
    .select({
      id: promotionBoosts.id,
      slot: promotionBoosts.slot,
      source: promotionBoosts.source,
      startsAt: promotionBoosts.startsAt,
      endsAt: promotionBoosts.endsAt,
      revokedAt: promotionBoosts.revokedAt,
      indieTitle: indiePosts.title,
      indieSlug: indiePosts.slug,
      postId: posts.id,
      postTitle: posts.title,
      views: impressionSum(promotionImpressions.views),
      clicks: impressionSum(promotionImpressions.clicks),
      // 시작 전(대기) 광고는 아래 넷이 빈 기간이라 0 이다 — 화면이 대기 줄에는 숫자를 세우지 않는다
      plays: sql<number>`case when ${isIndie} then ${plays(startDay, sql`${kst(effEnd)} + 1`)} else 0 end`,
      playsBefore: sql<number>`case when ${isIndie} then ${plays(sql`${startDay} - ${spanDays}`, startDay)} else 0 end`,
      likes: sql<number>`case when ${isIndie} then ${likes(startTs, effEnd)} else 0 end`,
      likesBefore: sql<number>`case when ${isIndie} then ${likes(sql`${startTs} - (${effEnd} - ${startTs})`, startTs)} else 0 end`,
    })
    .from(promotionBoosts)
    .leftJoin(indiePosts, and(isIndie, eq(indiePosts.id, promotionBoosts.targetId)))
    .leftJoin(posts, and(eq(promotionBoosts.targetKind, "board_post"), eq(posts.id, promotionBoosts.targetId)))
    .where(or(eq(indiePosts.authorUserId, userId), eq(posts.authorUserId, userId)))
    .orderBy(desc(promotionBoosts.startsAt))
    .limit(SHOWN);

  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    slot: r.slot,
    source: r.source,
    state: boostState(r, now),
    targetTitle: r.indieTitle ?? r.postTitle ?? M.targetGone,
    targetHref: r.indieSlug ? indiePath(r.indieSlug) : r.postId ? postPath(r.postId, "promo") : null,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    views: r.views,
    clicks: r.clicks,
    indie: r.indieTitle ? { plays: r.plays, playsBefore: r.playsBefore, likes: r.likes, likesBefore: r.likesBefore } : null,
  }));
}
