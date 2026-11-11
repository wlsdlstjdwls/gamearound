// 카탈로그 목록이 알려준 구독 포함을 반영한다 — 가격 변동 훑기(sync/price-sweep)가 목록을 읽는 김에 같이 한다.
//
// 왜(2026-11-10, 사용자 "PS Plus 구독 포함 게임 해 보자"): PS 는 구독 카탈로그 API 가 없어 포함 여부를 콘셉트 상세에서만 읽었다.
// 상세는 한 게임에 한 요청이라 PS 한 바퀴가 2주 가까이 걸려 PS Plus 에 새로 들어오거나 빠진 게임을 오래 몰랐다.
// 그런데 전체 게임 목록 칸이 구독 표기(PS Plus "스페셜", "프리미엄", EA Play "포함")를 싣는다 — 훑기는 이미 매 회차 그 목록을 읽는다.
//
// 반영 규칙은 상세 경로와 같다(sync/subscription-writer): 이번에 목록에서 본 게임만 맞추고, 행은 지우지 않고 removed_at 만 찍는다.
// 다른 점 하나: 목록이 말할 수 있는 구독(scope)만 손댄다. Ubisoft+ 는 목록에 안 실려, 범위 없이 쓰면 회차마다 다 빠진다.
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { gamePlatforms, gameSourceRefs, gameSubscriptions, games, subscriptions } from "@/server/db/schema";
import type { StoreSource } from "@/server/adapters";
import { MATCHED_FOR_SYNC, SOURCE_PLATFORMS, SOURCE_REGION } from "./constants";
import { syncSnapshotSubscriptions, type SubscriptionTarget } from "./subscription-writer";
import type { Ctx } from "./context";

/**
 * 목록에서 본 상품(외부 ID → 구독 키)을 받아 그 게임들의 범위 안 구독을 맞춘다.
 * 새로 들어온 포함은 그 게임의 대표 행(주소가 있는 행, 상세 갱신이 쓰는 행)에 단다.
 * 이미 포함이 붙어 있는 행은 그 행 그대로 맞춘다 — PS4, PS5 행 어느 쪽에 붙어 있든 목록 값이 기준이다
 */
export async function syncListSubscriptions(ctx: Ctx, source: StoreSource, scope: readonly string[], seen: Map<string, string[]>): Promise<void> {
  if (seen.size === 0 || scope.length === 0) return;
  const { db } = ctx;

  // 지금 범위 안 구독이 붙어 있는 행. 많아야 수백 행이라 전부 읽고 본 것만 고른다(본 ID 수천 개를 질의에 싣지 않는다)
  const existing = (
    await db
      .select({ gamePlatformId: gameSubscriptions.gamePlatformId, externalId: gameSourceRefs.externalId, slug: games.slug })
      .from(gameSubscriptions)
      .innerJoin(subscriptions, eq(subscriptions.id, gameSubscriptions.subscriptionId))
      .innerJoin(gamePlatforms, eq(gamePlatforms.id, gameSubscriptions.gamePlatformId))
      .innerJoin(games, eq(games.id, gamePlatforms.gameId))
      .innerJoin(gameSourceRefs, and(eq(gameSourceRefs.gameId, gamePlatforms.gameId), eq(gameSourceRefs.source, source)))
      .where(and(isNull(gameSubscriptions.removedAt), inArray(subscriptions.key, [...scope])))
  ).filter((r) => seen.has(r.externalId));

  const withKeys = [...seen].filter(([, keys]) => keys.length > 0).map(([id]) => id);
  const primary = withKeys.length
    ? await db
        .select({ gamePlatformId: gamePlatforms.id, externalId: gameSourceRefs.externalId, slug: games.slug })
        .from(gameSourceRefs)
        .innerJoin(games, eq(games.id, gameSourceRefs.gameId))
        .innerJoin(
          gamePlatforms,
          and(
            eq(gamePlatforms.gameId, gameSourceRefs.gameId),
            inArray(gamePlatforms.platform, SOURCE_PLATFORMS[source]),
            eq(gamePlatforms.region, SOURCE_REGION[source]),
            isNotNull(gamePlatforms.storeUrl),
          ),
        )
        .where(and(eq(gameSourceRefs.source, source), inArray(gameSourceRefs.matchedBy, MATCHED_FOR_SYNC), inArray(gameSourceRefs.externalId, withKeys)))
    : [];

  const targets = new Map<string, SubscriptionTarget>();
  const primaryTaken = new Set<string>();
  for (const p of primary) {
    if (primaryTaken.has(p.externalId)) continue; // 한 상품에 대표 행 하나
    primaryTaken.add(p.externalId);
    targets.set(p.gamePlatformId, { gamePlatformId: p.gamePlatformId, slug: p.slug, keys: seen.get(p.externalId) ?? [] });
  }
  for (const e of existing) targets.set(e.gamePlatformId, { gamePlatformId: e.gamePlatformId, slug: e.slug, keys: seen.get(e.externalId) ?? [] });

  const before = ctx.changedSlugs.size;
  await syncSnapshotSubscriptions(ctx, [...targets.values()], scope);
  console.log(`[sync:${source}] 목록 구독 맞추기: 본 상품 ${seen.size}건, 포함 ${withKeys.length}건, 바뀐 게임 ${ctx.changedSlugs.size - before}건`);
}
