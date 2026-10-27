// 광고 성과 세기(2026-10-27, 기획서 4.4) — 브라우저가 보낸 "봤다", "눌렀다" 를 걸기 줄의 하루 칸에 더한다(schema-promotions 의 promotionImpressions).
//
// 받은 id 를 그대로 믿지 않는다: 지금 걸려 있는 줄만 센다(끝난 광고의 숫자가 뒤늦게 오르면 성과표가 거짓말을 한다).
// 대상 글쓴이 본인은 세지 않는다 — 자기 광고를 확인하러 들어온 횟수가 노출로 잡히면 산 사람이 자기 숫자에 속는다(조회와 같은 규칙).
// 한 사람이 같은 날 같은 광고를 여러 번 보내는 것은 브라우저가 거른다(components/promo/ad-track). 서버는 세션이 없는 사람도 받아야 해서
// 사람 단위로 거르지 않는다 — 손으로 요청을 쏘면 숫자를 부풀릴 수 있지만, 산 사람이 자기 숫자를 부풀릴 이유는 없고 남의 숫자를 올려 줄 이유도 없다.
import "server-only";
import { and, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { indiePosts, posts, promotionBoosts, promotionImpressions } from "@/server/db/schema";
import { getCurrentUser } from "@/server/services/users";

/** 한국 날짜. 하루 집계 표의 열쇠다(schema-indie-promo 머리 주석) */
const kstToday = sql`(now() at time zone 'Asia/Seoul')::date`;

export async function recordAdEvents(input: { seen: readonly string[]; clicked: readonly string[] }): Promise<void> {
  const ids = [...new Set([...input.seen, ...input.clicked])];
  if (ids.length === 0) return;
  const db = getDb();
  const [viewer, live] = await Promise.all([
    getCurrentUser().catch(() => null),
    db
      .select({ id: promotionBoosts.id, indieAuthor: indiePosts.authorUserId, postAuthor: posts.authorUserId })
      .from(promotionBoosts)
      .leftJoin(indiePosts, and(eq(promotionBoosts.targetKind, "indie_post"), eq(indiePosts.id, promotionBoosts.targetId)))
      .leftJoin(posts, and(eq(promotionBoosts.targetKind, "board_post"), eq(posts.id, promotionBoosts.targetId)))
      .where(and(inArray(promotionBoosts.id, ids), isNull(promotionBoosts.revokedAt), lte(promotionBoosts.startsAt, sql`now()`), gt(promotionBoosts.endsAt, sql`now()`), or(sql`${indiePosts.id} is not null`, sql`${posts.id} is not null`))),
  ]);
  const counted = new Set(live.filter((r) => !viewer || (r.indieAuthor ?? r.postAuthor) !== viewer.id).map((r) => r.id));
  const seen = new Set(input.seen);
  const clicked = new Set(input.clicked);
  const values = [...counted].map((boostId) => ({ boostId, day: kstToday, views: seen.has(boostId) ? 1 : 0, clicks: clicked.has(boostId) ? 1 : 0, ...createdBy("system") }));
  if (values.length === 0) return;
  await db
    .insert(promotionImpressions)
    .values(values)
    .onConflictDoUpdate({
      target: [promotionImpressions.boostId, promotionImpressions.day],
      set: { views: sql`${promotionImpressions.views} + excluded.views`, clicks: sql`${promotionImpressions.clicks} + excluded.clicks`, updatedAt: sql`now()` },
    });
}
