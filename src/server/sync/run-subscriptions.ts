// 구독 카탈로그 소스 실행 — 기획서 F7.
// 게임 단위가 아니라 카탈로그 전체 목록을 받아, 우리 DB 의 game_platforms.store_external_id 와 맞춘다.
//
// 이 파일에서 가장 중요한 규칙: **행을 지우지 않는다**. 카탈로그에서 빠진 것은 removed_at 을 찍을 뿐이다.
// 이탈 자체가 사용자에게 가치 있는 정보이고("곧 빠져요"), 일시적 수집 실패로 이력이 증발하는 것도 막는다.
import { and, eq, inArray, isNull } from "drizzle-orm";
import { gamePlatforms, gameSubscriptions, games, subscriptions } from "@/server/db/schema";
import { getSubscriptionAdapter, type SubscriptionSource } from "@/server/adapters";
import { AdapterError } from "@/server/adapters/types";
import { sleep } from "@/lib/async";
import { SUBSCRIPTION_MIN_CATALOG_SIZE } from "./constants";
import { recordError, type Ctx } from "./context";

/** 카탈로그 ID 목록을 우리 game_platforms 행으로 바꾼다. 모르는 제품은 조용히 버린다(우리가 안 다루는 게임) */
async function resolvePlatformRows(ctx: Ctx, platform: typeof gamePlatforms.$inferSelect.platform, externalIds: string[]) {
  if (externalIds.length === 0) return [];
  return ctx.db
    .select({ id: gamePlatforms.id, slug: games.slug })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(and(eq(gamePlatforms.platform, platform), inArray(gamePlatforms.storeExternalId, externalIds)));
}

/**
 * 한 구독 서비스의 포함 목록을 반영한다.
 * 들어온 것은 추가하거나 되살리고, 빠진 것은 removed_at 을 찍는다.
 */
export async function applySubscriptionCatalog(
  ctx: Ctx,
  subscription: typeof subscriptions.$inferSelect,
  externalIds: string[],
): Promise<void> {
  const { db } = ctx;
  if (externalIds.length < SUBSCRIPTION_MIN_CATALOG_SIZE) {
    // 수집 실패와 "카탈로그가 정말 비었다"를 구분할 방법이 없다. 반영하지 않는 쪽이 안전하다.
    throw new AdapterError(
      `${subscription.key} 카탈로그가 너무 작음 (${externalIds.length}건 < ${SUBSCRIPTION_MIN_CATALOG_SIZE}) — 반영 생략`,
      ctx.source,
      true,
    );
  }

  const rows = await resolvePlatformRows(ctx, subscription.platform, externalIds);
  const incoming = new Map(rows.map((r) => [r.id, r.slug]));

  const current = await db
    .select({ id: gameSubscriptions.id, gamePlatformId: gameSubscriptions.gamePlatformId, removedAt: gameSubscriptions.removedAt })
    .from(gameSubscriptions)
    .where(eq(gameSubscriptions.subscriptionId, subscription.id));
  const known = new Map(current.map((c) => [c.gamePlatformId, c]));

  // 새로 들어왔거나, 빠졌다가 돌아온 것
  for (const [gamePlatformId, slug] of incoming) {
    const hit = known.get(gamePlatformId);
    if (!hit) {
      await db.insert(gameSubscriptions).values({ gamePlatformId, subscriptionId: subscription.id, addedAt: ctx.now });
      ctx.changedSlugs.add(slug);
    } else if (hit.removedAt !== null) {
      // 되돌아온 경우 addedAt 도 갱신한다 — "언제부터 다시 들어왔는지"가 사용자에게 맞는 값이다
      await db
        .update(gameSubscriptions)
        .set({ removedAt: null, addedAt: ctx.now })
        .where(eq(gameSubscriptions.id, hit.id));
      ctx.changedSlugs.add(slug);
    }
  }

  // 빠진 것 — 삭제가 아니라 removed_at 표시
  const goneIds = current.filter((c) => c.removedAt === null && !incoming.has(c.gamePlatformId)).map((c) => c.id);
  if (goneIds.length > 0) {
    await db.update(gameSubscriptions).set({ removedAt: ctx.now }).where(inArray(gameSubscriptions.id, goneIds));
    const goneSlugs = await db
      .select({ slug: games.slug })
      .from(gameSubscriptions)
      .innerJoin(gamePlatforms, eq(gamePlatforms.id, gameSubscriptions.gamePlatformId))
      .innerJoin(games, eq(games.id, gamePlatforms.gameId))
      .where(inArray(gameSubscriptions.id, goneIds));
    for (const g of goneSlugs) ctx.changedSlugs.add(g.slug);
  }
}

export async function runSubscriptions(ctx: Ctx, source: SubscriptionSource): Promise<void> {
  const adapter = getSubscriptionAdapter(source);
  const rows = await ctx.db.select().from(subscriptions).where(eq(subscriptions.isActive, true));

  for (const [i, sub] of rows.entries()) {
    if (!sub.catalogId) continue; // 수집 키가 없는 구독은 관리자 입력 전용이다
    try {
      if (i > 0) await sleep(adapter.minIntervalMs);
      const ids = await adapter.fetchCatalog(sub.catalogId);
      await applySubscriptionCatalog(ctx, sub, ids);
      ctx.processed++;
    } catch (e) {
      recordError(ctx, `subscription:${sub.key}`, e);
    }
  }
}

/** 화면에서 쓰는 조회 — 이 플랫폼 행이 지금 포함된 구독들 */
export async function activeSubscriptionsOf(ctx: Ctx, gamePlatformId: string) {
  return ctx.db
    .select({ key: subscriptions.key, labelKo: subscriptions.labelKo })
    .from(gameSubscriptions)
    .innerJoin(subscriptions, eq(subscriptions.id, gameSubscriptions.subscriptionId))
    .where(and(eq(gameSubscriptions.gamePlatformId, gamePlatformId), isNull(gameSubscriptions.removedAt)));
}
