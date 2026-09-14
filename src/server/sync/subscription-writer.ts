// 게임 단건이 알려준 구독 포함을 game_subscriptions 에 반영한다.
//
// run-subscriptions 와 무엇이 다른가: 저쪽은 "카탈로그 전체 목록"을 받아 맞춘다(Game Pass).
// PlayStation 에는 그런 목록 API 가 없고, 대신 콘셉트 상세가 이 게임이 어느 구독에 들었는지 말해 준다.
// 그래서 여기서는 **게임 한 건 안에서만** 전체를 안다고 본다 — 이번에 본 게임의 포함/이탈만 건드리고,
// 이번 배치에 없던 게임은 손대지 않는다. 카탈로그 경로처럼 "목록에 없으면 빠진 것"으로 읽으면
// 배치가 훑지 않은 수천 건이 통째로 이탈로 찍힌다.
//
// 규칙은 카탈로그 경로와 같다: 행을 지우지 않고 removed_at 만 찍는다(§7).
// "무엇을 쓸지"(planSubscriptionChanges)와 "쓰는 일"을 가른 이유도 같다 — 판단은 DB 없이 검증한다.
import { inArray } from "drizzle-orm";
import { gameSubscriptions, subscriptions } from "@/server/db/schema";
import type { Db } from "@/server/db/client";
import { recordError, type Ctx } from "./context";
import { runStatements, type Statement } from "./store-apply";

/** 반영 대상 1건 — 어느 플랫폼 행이 어느 구독들에 들었는지 */
export interface SubscriptionTarget {
  gamePlatformId: string;
  slug: string;
  /** subscriptions.key 목록. 빈 배열은 "어느 구독에도 안 들었다"는 단언이라 기존 포함을 내린다 */
  keys: string[];
}

/** 이미 있는 포함 기록 1행 */
export interface SubscriptionRow {
  id: number;
  gamePlatformId: string;
  subscriptionId: number;
  removedAt: Date | null;
}

/** 무엇을 쓸지. 실행은 호출부가 한다 */
export interface SubscriptionPlan {
  inserts: Array<{ gamePlatformId: string; subscriptionId: number }>;
  /** 빠졌다가 돌아온 행. addedAt 까지 새로 찍는다 */
  revive: number[];
  /** 이번 응답에 없어 내려야 할 행 */
  gone: number[];
  /** 캐시를 깨야 할 게임 */
  changedSlugs: string[];
  /** subscriptions 시드에 없어 버린 키 */
  unknownKeys: string[];
}

/**
 * 들어온 것은 추가하거나 되살리고, 이번에 본 게임에서 빠진 것만 내린다.
 * DB 를 건드리지 않는다 — 인자로 받은 것만 본다.
 */
export function planSubscriptionChanges(
  targets: SubscriptionTarget[],
  idByKey: Map<string, number>,
  current: SubscriptionRow[],
): SubscriptionPlan {
  const wanted = new Map<string, Set<number>>(); // gamePlatformId → 구독 id 집합
  const slugOf = new Map<string, string>();
  const unknown = new Set<string>();
  for (const t of targets) {
    const ids = new Set<number>();
    for (const key of t.keys) {
      const id = idByKey.get(key);
      if (id === undefined) unknown.add(key);
      else ids.add(id);
    }
    wanted.set(t.gamePlatformId, ids);
    slugOf.set(t.gamePlatformId, t.slug);
  }

  const known = new Map(current.map((c) => [`${c.gamePlatformId}:${c.subscriptionId}`, c]));
  const plan: SubscriptionPlan = { inserts: [], revive: [], gone: [], changedSlugs: [], unknownKeys: [...unknown] };
  const changed = new Set<string>();

  for (const [gamePlatformId, ids] of wanted) {
    for (const subscriptionId of ids) {
      const hit = known.get(`${gamePlatformId}:${subscriptionId}`);
      if (!hit) {
        plan.inserts.push({ gamePlatformId, subscriptionId });
        changed.add(slugOf.get(gamePlatformId)!);
      } else if (hit.removedAt !== null) {
        plan.revive.push(hit.id);
        changed.add(slugOf.get(gamePlatformId)!);
      }
    }
  }

  // 이번에 본 게임에서만 이탈을 판단한다. 그 게임의 응답이 곧 그 게임의 전체 목록이다
  for (const c of current) {
    const ids = wanted.get(c.gamePlatformId);
    if (!ids || c.removedAt !== null || ids.has(c.subscriptionId)) continue;
    plan.gone.push(c.id);
    changed.add(slugOf.get(c.gamePlatformId)!);
  }

  plan.changedSlugs = [...changed];
  return plan;
}

/** key → subscriptions.id */
async function loadSubscriptionIds(db: Db): Promise<Map<string, number>> {
  const rows = await db.select({ id: subscriptions.id, key: subscriptions.key }).from(subscriptions);
  return new Map(rows.map((r) => [r.key, r.id]));
}

/** 계획을 세우고 그대로 쓴다 */
export async function applySnapshotSubscriptions(ctx: Ctx, targets: SubscriptionTarget[]): Promise<void> {
  if (targets.length === 0) return;
  const { db } = ctx;

  const idByKey = await loadSubscriptionIds(db);
  const current = await db
    .select({
      id: gameSubscriptions.id,
      gamePlatformId: gameSubscriptions.gamePlatformId,
      subscriptionId: gameSubscriptions.subscriptionId,
      removedAt: gameSubscriptions.removedAt,
    })
    .from(gameSubscriptions)
    .where(inArray(gameSubscriptions.gamePlatformId, targets.map((t) => t.gamePlatformId)));

  const plan = planSubscriptionChanges(targets, idByKey, current);
  // 시드에 없는 구독이 응답에 새로 생긴 경우다. 조용히 버리되 사유는 남긴다 — 시드 한 줄이면 켜진다
  if (plan.unknownKeys.length > 0) {
    console.warn(`[sync:${ctx.source}] 모르는 구독 키 ${plan.unknownKeys.join(", ")} — 시드(DEFAULT_SUBSCRIPTIONS)에 없어 건너뜀`);
  }

  const statements: Statement[] = [];
  if (plan.inserts.length > 0) {
    statements.push(db.insert(gameSubscriptions).values(plan.inserts.map((v) => ({ ...v, addedAt: ctx.now }))).onConflictDoNothing());
  }
  if (plan.revive.length > 0) {
    // 되돌아온 경우 addedAt 도 갱신한다 — "언제부터 다시 들어왔는지"가 사용자에게 맞는 값이다
    statements.push(db.update(gameSubscriptions).set({ removedAt: null, addedAt: ctx.now }).where(inArray(gameSubscriptions.id, plan.revive)));
  }
  if (plan.gone.length > 0) {
    statements.push(db.update(gameSubscriptions).set({ removedAt: ctx.now }).where(inArray(gameSubscriptions.id, plan.gone)));
  }
  if (statements.length === 0) return;

  await runStatements(ctx, "subscription", statements);
  for (const slug of plan.changedSlugs) ctx.changedSlugs.add(slug);
}

/** 반영 중 실패해도 가격 수집 결과는 유지한다 — 구독은 부가 정보다 */
export async function syncSnapshotSubscriptions(ctx: Ctx, targets: SubscriptionTarget[]): Promise<void> {
  try {
    await applySnapshotSubscriptions(ctx, targets);
  } catch (e) {
    recordError(ctx, `${ctx.source}:subscription`, e);
  }
}
