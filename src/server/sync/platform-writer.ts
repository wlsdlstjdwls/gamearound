// game_platforms + price_snapshots 쓰기 — 가격, 할인이 실제로 반영되는 지점.
// 가격이 바뀐 경우에만 스냅샷을 남기고, 그 변동을 ctx.priceChanges 에 모아 알림 단계로 넘긴다.
//
// "무엇을 쓸지 정하는 일"(planPlatform)과 "쓰는 일"을 갈라 둔 이유: 반영 단계가 게임마다
// DB 를 왕복하면 배치 하나가 몇십 분이 된다. 계획만 모아 두면 호출부가 한 번에 묶어 보낼 수 있다.
import { and, eq, inArray } from "drizzle-orm";
import { gamePlatforms, priceSnapshots, type Platform } from "@/server/db/schema";
import type { StoreSnapshot } from "@/server/adapters/types";
import { isLocked, type Ctx } from "./context";

// hasAddOns 도 여기 규칙을 그대로 탄다 — 주지 않는 소스는 undefined 라 기존 값을 덮지 않는다
const PLATFORM_FIELDS = ["storeExternalId", "storeUrl", "releaseDate", "currentVersion", "listPrice", "currentPrice", "discountPct", "hasAddOns"] as const;
const PRICE_FIELDS = new Set<string>(["listPrice", "currentPrice", "discountPct"]);

/** ISO 문자열 → Date. 빈 값/파싱 실패는 null */
function toDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const sameInstant = (a: Date | null, b: Date | null): boolean => (a === null || b === null ? a === b : a.getTime() === b.getTime());

type DiscountMeta = { discountStartsAt: Date | null; discountEndsAt: Date | null; discountName: string | null };

/** 스냅샷의 할인 기간, 행사명. 할인이 끝났으면(할인율 0) 세 값 모두 null 로 지워야 지난 행사 정보가 남지 않는다 */
export function discountMetaOf(snapshot: StoreSnapshot): DiscountMeta {
  const onSale = (snapshot.discountPct ?? 0) > 0;
  if (!onSale) return { discountStartsAt: null, discountEndsAt: null, discountName: null };
  return {
    discountStartsAt: toDate(snapshot.discountStartsAt),
    discountEndsAt: toDate(snapshot.discountEndsAt),
    discountName: snapshot.discountName ?? null,
  };
}

/** 기존 행과 달라진 할인 메타만. 잠긴 필드는 제외 */
function changedDiscountMeta(ctx: Ctx, rowId: string, meta: DiscountMeta, existing: { discountStartsAt: Date | null; discountEndsAt: Date | null; discountName: string | null }): Partial<DiscountMeta> {
  const set: Partial<DiscountMeta> = {};
  if (!isLocked(ctx, "game_platforms", rowId, "discountStartsAt") && !sameInstant(meta.discountStartsAt, existing.discountStartsAt)) set.discountStartsAt = meta.discountStartsAt;
  if (!isLocked(ctx, "game_platforms", rowId, "discountEndsAt") && !sameInstant(meta.discountEndsAt, existing.discountEndsAt)) set.discountEndsAt = meta.discountEndsAt;
  if (!isLocked(ctx, "game_platforms", rowId, "discountName") && meta.discountName !== existing.discountName) set.discountName = meta.discountName;
  return set;
}

/** 한 행에 남길 가격 스냅샷. gamePlatformId 는 INSERT 직후에야 알 수 있으므로 여기서 빼 둔다 */
export type PriceSnapshotDraft = Omit<typeof priceSnapshots.$inferInsert, "gamePlatformId">;

export type PlatformRow = typeof gamePlatforms.$inferSelect;

/** 이 플랫폼 행에 무엇을 쓸지. 실행은 호출부가 한다 */
export type PlatformPlan =
  | { kind: "insert"; values: typeof gamePlatforms.$inferInsert; snapshot: PriceSnapshotDraft | null }
  | {
      kind: "update";
      id: string;
      set: Partial<typeof gamePlatforms.$inferInsert>;
      snapshot: PriceSnapshotDraft | null;
      /** 알림으로 보낼 가격 변동. 스냅샷만 남기고 알릴 것이 없으면 null */
      priceChange: { previousPrice: number | null; newPrice: number } | null;
      changed: boolean;
    };

/** 기존 행(없으면 undefined)과 스냅샷을 받아 쓸 내용을 정한다. DB 를 건드리지 않는다 */
export function planPlatform(ctx: Ctx, existing: PlatformRow | undefined, gameId: string, snapshot: StoreSnapshot): PlatformPlan {
  const meta = discountMetaOf(snapshot);

  if (!existing) {
    return {
      kind: "insert",
      values: {
        gameId,
        platform: snapshot.platform,
        storeExternalId: snapshot.storeExternalId,
        storeUrl: snapshot.storeUrl,
        releaseDate: snapshot.releaseDate ?? null,
        currentVersion: snapshot.currentVersion ?? null,
        listPrice: snapshot.listPrice,
        currentPrice: snapshot.currentPrice,
        discountPct: snapshot.discountPct,
        hasAddOns: snapshot.hasAddOns ?? null,
        ...meta,
        lastSyncedAt: ctx.now,
        syncStatus: "ok",
      },
      snapshot:
        snapshot.currentPrice === null
          ? null
          : {
              price: snapshot.currentPrice,
              discountPct: snapshot.discountPct ?? 0,
              discountEndsAt: meta.discountEndsAt,
              discountName: meta.discountName,
              capturedAt: ctx.now,
            },
    };
  }

  const set: Partial<typeof gamePlatforms.$inferInsert> = {};
  for (const field of PLATFORM_FIELDS) {
    const value = snapshot[field];
    if (value === null || value === undefined) continue; // 절대 null 로 덮지 않음
    if (isLocked(ctx, "game_platforms", existing.id, field)) continue;
    if (existing[field] !== value) (set as Record<string, unknown>)[field] = value;
  }
  const priceChanged = Object.keys(set).some((k) => PRICE_FIELDS.has(k));
  // 할인 메타는 null 로 덮어써야 하는 유일한 필드라 PLATFORM_FIELDS 규칙(널 무시) 밖에서 따로 처리
  const metaSet = changedDiscountMeta(ctx, existing.id, meta, existing);
  const newPrice = set.currentPrice ?? existing.currentPrice;

  const draft: PriceSnapshotDraft | null =
    priceChanged && newPrice !== null && newPrice !== undefined
      ? {
          price: newPrice,
          discountPct: set.discountPct ?? existing.discountPct ?? 0,
          discountEndsAt: meta.discountEndsAt,
          discountName: meta.discountName,
          capturedAt: ctx.now,
        }
      : null;

  return {
    kind: "update",
    id: existing.id,
    set: { ...set, ...metaSet, lastSyncedAt: ctx.now, syncStatus: "ok" },
    snapshot: draft,
    priceChange: draft !== null && set.currentPrice !== undefined ? { previousPrice: existing.currentPrice, newPrice: draft.price } : null,
    changed: Object.keys(set).length > 0 || Object.keys(metaSet).length > 0,
  };
}

/**
 * game_platforms upsert + 변경 시 price_snapshots INSERT (단건 경로).
 * 배치 경로는 store-apply 가 planPlatform 을 직접 쓴다 — 여기는 DLC 등록처럼 건수가 적은 자리용이다.
 */
export async function upsertPlatform(ctx: Ctx, gameId: string, slug: string, snapshot: StoreSnapshot): Promise<void> {
  const { db } = ctx;
  const existing = await db.query.gamePlatforms.findFirst({
    where: and(eq(gamePlatforms.gameId, gameId), eq(gamePlatforms.platform, snapshot.platform)),
  });
  const plan = planPlatform(ctx, existing, gameId, snapshot);

  if (plan.kind === "insert") {
    const [row] = await db.insert(gamePlatforms).values(plan.values).returning({ id: gamePlatforms.id });
    if (plan.snapshot) {
      const [snap] = await db
        .insert(priceSnapshots)
        .values({ ...plan.snapshot, gamePlatformId: row.id })
        .returning({ id: priceSnapshots.id });
      ctx.priceChanges.push({ gamePlatformId: row.id, snapshotId: snap.id, previousPrice: null, newPrice: plan.snapshot.price });
    }
    ctx.changedSlugs.add(slug);
    return;
  }

  await db.update(gamePlatforms).set(plan.set).where(eq(gamePlatforms.id, plan.id));
  if (plan.snapshot) {
    const [snap] = await db
      .insert(priceSnapshots)
      .values({ ...plan.snapshot, gamePlatformId: plan.id })
      .returning({ id: priceSnapshots.id });
    if (plan.priceChange) ctx.priceChanges.push({ gamePlatformId: plan.id, snapshotId: snap.id, ...plan.priceChange });
  }
  if (plan.changed) ctx.changedSlugs.add(slug);
}

/** 항목 실패 시 해당 플랫폼 행을 failed 로 표시 (값은 유지, §4.6 신선도 경고용) */
export async function markPlatformFailed(ctx: Ctx, gameId: string, platforms: Platform[]): Promise<void> {
  await ctx.db
    .update(gamePlatforms)
    .set({ syncStatus: "failed" })
    .where(and(eq(gamePlatforms.gameId, gameId), inArray(gamePlatforms.platform, platforms)));
}
