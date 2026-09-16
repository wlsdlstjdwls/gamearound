// game_platforms + price_snapshots 쓰기 — 가격, 할인이 실제로 반영되는 지점.
// 가격이 바뀐 경우에만 스냅샷을 남기고, 그 변동을 ctx.priceChanges 에 모아 알림 단계로 넘긴다.
//
// "무엇을 쓸지 정하는 일"(planPlatform)과 "쓰는 일"을 갈라 둔 이유: 반영 단계가 게임마다
// DB 를 왕복하면 배치 하나가 몇십 분이 된다. 계획만 모아 두면 호출부가 한 번에 묶어 보낼 수 있다.
import { and, eq, inArray } from "drizzle-orm";
import { gamePlatforms, priceSnapshots, HOME_REGION, type Platform, type Region } from "@/server/db/schema";
import type { StoreSnapshot } from "@/server/adapters/types";
import { DISPLAY_CURRENCY } from "@/lib/currency";
import { isLocked, type Ctx } from "./context";
import { RELEASE_DATE_MAX_YEARS_AHEAD, RELEASE_DATE_MIN_YEAR } from "./constants";

// hasAddOns 도 여기 규칙을 그대로 탄다 — 주지 않는 소스는 undefined 라 기존 값을 덮지 않는다
const PLATFORM_FIELDS = ["storeExternalId", "storeUrl", "releaseDate", "currentVersion", "listPrice", "currentPrice", "discountPct", "hasAddOns", "currency", "titleCode"] as const;
const PRICE_FIELDS = new Set<string>(["listPrice", "currentPrice", "discountPct"]);

/** ISO 문자열 → Date. 빈 값/파싱 실패는 null */
function toDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const sameInstant = (a: Date | null, b: Date | null): boolean => (a === null || b === null ? a === b : a.getTime() === b.getTime());

type DiscountMeta = { discountStartsAt: Date | null; discountEndsAt: Date | null; discountName: string | null };

/** 할인이 없는 상태. 못 믿을 회차의 INSERT 가 가짜 행사 정보를 남기지 않게 쓴다 */
const NO_DISCOUNT: DiscountMeta = { discountStartsAt: null, discountEndsAt: null, discountName: null };

/**
 * 이번 회차의 가격을 스토어 응답 오독으로 볼 것인가.
 *
 * 정가가 있는데 판매가가 0 으로 읽히는 회차가 있다. 2026-09-16 실측: 그런 스냅샷 26건
 * (ps5 22, ps4 2, xbox 2)이 있었고 **26건 전부 다음 회차에 정상값으로 돌아왔다**
 * (레지던트 이블 빌리지 12,450 → 0 → 11,700). 0 이 연달아 두 번 찍힌 적은 한 번도 없다.
 * 같은 배치의 다른 항목은 멀쩡했으니 배치 사고가 아니라 항목별 응답 오독이다.
 *
 * 한 번 새어 들어가면 그 게임은 영영 "역대 최대 할인 100%" 로 박제된다 — 가격 알림 서비스가
 * 제일 하면 안 되는 일이다. §7 의 "null 로 덮지 않는다" 와 같은 성격으로 0 도 못 믿을 값으로 다룬다.
 *
 * **맞바꾼 것**: 정가가 있는 물건을 진짜 0원으로 푸는 배포(에픽 무료 배포)도 같이 버려진다.
 * 우리 데이터에서 그런 배포가 잡힌 적은 아직 없다(값 0 스냅샷 1,012건 중 정가가 있는 것은 위 26건뿐,
 * 에픽 146건은 전부 정가도 0 인 부분 무료 게임이었다). 살려야 할 날이 오면
 * "연속 두 회차가 0 이면 받아들인다" 로 바꾼다 — 그러려면 직전 회차의 0 을 기억할 자리가 필요하다.
 */
export function priceMisread(snapshot: StoreSnapshot, existingListPrice: number | null | undefined): boolean {
  if (snapshot.currentPrice !== 0) return false;
  const listPrice = snapshot.listPrice ?? existingListPrice ?? null;
  return listPrice !== null && listPrice > 0;
}

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

/** 유저 점수 세 컬럼을 한 덩어리로 다룬다 — 값과 척도와 표본 수는 따로 떨어지면 뜻을 잃는다 */
type UserScoreSet = { userScore: number; userScoreKind: NonNullable<StoreSnapshot["userScore"]>["kind"]; userScoreCount: number };

/**
 * 스냅샷의 유저 점수 → 쓸 값. 스토어가 안 주면 undefined 라 기존 값을 덮지 않는다(§7).
 * 세 값을 같이 넣거나 같이 두거나 둘 중 하나다 — 점수만 바뀌고 척도가 남으면 "3.9%" 같은 것이 된다.
 */
export function userScoreSet(snapshot: StoreSnapshot): UserScoreSet | undefined {
  const s = snapshot.userScore;
  if (!s) return undefined;
  return { userScore: s.value, userScoreKind: s.kind, userScoreCount: s.count };
}

/** 기존 행과 견줘 실제로 달라진 것만. 잠긴 필드는 건드리지 않는다 */
function changedUserScore(ctx: Ctx, rowId: string, next: UserScoreSet | undefined, existing: PlatformRow): Partial<UserScoreSet> {
  if (!next || isLocked(ctx, "game_platforms", rowId, "userScore")) return {};
  const same =
    existing.userScore === next.userScore &&
    existing.userScoreKind === next.userScoreKind &&
    existing.userScoreCount === next.userScoreCount;
  return same ? {} : next;
}

/** 한 행에 남길 가격 스냅샷. gamePlatformId 는 INSERT 직후에야 알 수 있으므로 여기서 빼 둔다 */
export type PriceSnapshotDraft = Omit<typeof priceSnapshots.$inferInsert, "gamePlatformId">;

export type PlatformRow = typeof gamePlatforms.$inferSelect;

/**
 * 말이 되지 않는 출시일을 떼어 낸 스냅샷.
 *
 * 스토어가 "미정" 을 먼 미래(xbox 의 9998년)로 적어 보내는 일이 있어서, 그대로 쓰면
 * 출시예정 목록의 정렬과 집계가 그 한 줄에 끌려간다. 값을 고쳐 쓰지 않고 **버리는** 이유:
 * 무엇으로 고칠지 우리가 알 수 없고, 버리면 PLATFORM_FIELDS 의 널 무시 규칙을 타 기존 값이 살아남는다.
 */
export function withSaneReleaseDate(snapshot: StoreSnapshot): StoreSnapshot {
  const raw = snapshot.releaseDate;
  if (!raw) return snapshot;
  const year = new Date(raw).getUTCFullYear();
  const maxYear = new Date().getUTCFullYear() + RELEASE_DATE_MAX_YEARS_AHEAD;
  if (!Number.isNaN(year) && year >= RELEASE_DATE_MIN_YEAR && year <= maxYear) return snapshot;
  return { ...snapshot, releaseDate: null };
}

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
export function planPlatform(ctx: Ctx, existing: PlatformRow | undefined, gameId: string, raw: StoreSnapshot): PlatformPlan {
  // 출시일 소독을 여기서 하는 이유: 아래 두 경로(INSERT 값, UPDATE 필드 루프)가 모두 이 객체만 읽는다
  const snapshot = withSaneReleaseDate(raw);
  // 못 믿을 회차는 가격 세 값과 할인 메타를 통째로 버린다. 나머지 필드(출시일, 버전, 점수)는 그대로 쓴다 —
  // 그것들은 응답의 다른 자리에서 오고 오독의 흔적이 없었다
  const misread = priceMisread(snapshot, existing?.listPrice);
  if (misread) ctx.droppedPrices++;
  const meta = misread ? NO_DISCOUNT : discountMetaOf(snapshot);

  if (!existing) {
    return {
      kind: "insert",
      values: {
        gameId,
        platform: snapshot.platform,
        // 지역은 행의 정체성(유니크 키)이라 나중에 고쳐 쓰지 않는다 — 그래서 INSERT 에만 있다
        region: snapshot.region ?? HOME_REGION,
        titleCode: snapshot.titleCode ?? null,
        storeExternalId: snapshot.storeExternalId,
        storeUrl: snapshot.storeUrl,
        releaseDate: snapshot.releaseDate ?? null,
        currentVersion: snapshot.currentVersion ?? null,
        listPrice: misread ? null : snapshot.listPrice,
        currentPrice: misread ? null : snapshot.currentPrice,
        currency: snapshot.currency ?? DISPLAY_CURRENCY,
        discountPct: misread ? null : snapshot.discountPct,
        hasAddOns: snapshot.hasAddOns ?? null,
        ...userScoreSet(snapshot),
        ...meta,
        lastSyncedAt: ctx.now,
        syncStatus: "ok",
      },
      snapshot:
        misread || snapshot.currentPrice === null
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
    if (misread && PRICE_FIELDS.has(field)) continue; // 못 믿을 회차의 가격 — 기존 값을 지킨다
    if (isLocked(ctx, "game_platforms", existing.id, field)) continue;
    if (existing[field] !== value) (set as Record<string, unknown>)[field] = value;
  }
  const priceChanged = Object.keys(set).some((k) => PRICE_FIELDS.has(k));
  // 할인 메타는 null 로 덮어써야 하는 유일한 필드라 PLATFORM_FIELDS 규칙(널 무시) 밖에서 따로 처리
  // misread 면 빈 객체다 — 못 믿을 회차가 진행 중인 진짜 행사 정보를 지워 버리면 안 된다
  const metaSet = misread ? {} : changedDiscountMeta(ctx, existing.id, meta, existing);
  // 유저 점수도 평평한 필드가 아니라 세 컬럼 묶음이라 PLATFORM_FIELDS 규칙 밖에서 따로 본다
  const scoreSet = changedUserScore(ctx, existing.id, userScoreSet(snapshot), existing);
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
    set: { ...set, ...metaSet, ...scoreSet, lastSyncedAt: ctx.now, syncStatus: "ok" },
    snapshot: draft,
    priceChange: draft !== null && set.currentPrice !== undefined ? { previousPrice: existing.currentPrice, newPrice: draft.price } : null,
    changed: Object.keys(set).length > 0 || Object.keys(metaSet).length > 0 || Object.keys(scoreSet).length > 0,
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
export async function markPlatformFailed(ctx: Ctx, gameId: string, platforms: Platform[], region: Region): Promise<void> {
  await ctx.db
    .update(gamePlatforms)
    .set({ syncStatus: "failed" })
    .where(and(eq(gamePlatforms.gameId, gameId), inArray(gamePlatforms.platform, platforms), eq(gamePlatforms.region, region)));
}
