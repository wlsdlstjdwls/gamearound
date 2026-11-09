// 가격 변동 훑기 — 가격 배치로만 카탈로그를 한 바퀴 묻고, DB 와 값이 다른 행을 골라 낸다.
//
// 반영은 하지 않는다. 고른 행은 store-targets 가 그 회차 갱신 대상 맨 앞에 세우고, 평소 경로(수집, 검증, 반영,
// 찜 알림)를 그대로 탄다. 여기서 바로 쓰지 않는 이유: 반영 경로(store-apply)가 잠금, 가격 가드, 이력, 알림,
// 캐시 무효화를 한 자리에서 지킨다 — 두 번째 쓰기 길을 만들면 그중 하나가 반드시 빠진다.
// 대가는 고른 행을 한 번 더 묻는 요청(50건에 1회)뿐이다.
//
// 근거와 자격은 constants 의 PRICE_SWEEP_SOURCES 주석.
import { and, asc, eq, inArray, not } from "drizzle-orm";
import { gamePlatforms, gameSourceRefs, games, type Platform } from "@/server/db/schema";
import type { StoreAdapter, StoreSnapshot } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";
import { DEFAULT_FETCH_BATCH_SIZE, MATCHED_FOR_SYNC, PRICE_SWEEP_MAX_MS, SOURCE_PLATFORMS, SOURCE_REGION } from "./constants";
import { missingRefExcluded } from "./missing-refs";
import type { Ctx } from "./context";

export type SweepRow = {
  gameId: string;
  externalId: string;
  slug: string;
  platform: Platform | null;
  currentPrice: number | null;
  discountPct: number | null;
};

/** 바뀐 정도. 새로 할인이 열린 행이 제일 급하다 — 사람들이 기다리는 소식이고, 찜 알림이 거기 걸려 있다 */
export type PriceMove = "sale-started" | "changed" | null;

/**
 * DB 행과 스토어 값을 견준다. 스토어가 가격을 못 준 경우(null)는 변동으로 치지 않는다 —
 * "모른다" 를 "바뀌었다" 로 읽으면 판매 중지 상품이 매 회차 맨 앞을 차지한다(그 판정은 평소 갱신이 한다).
 * 할인율 null 과 0 은 같은 뜻이다(할인 없음).
 */
export function priceMove(row: Pick<SweepRow, "currentPrice" | "discountPct">, snap: Pick<StoreSnapshot, "currentPrice" | "discountPct">): PriceMove {
  if (snap.currentPrice === null) return null;
  const before = row.discountPct ?? 0;
  const after = snap.discountPct ?? 0;
  if (after > 0 && before === 0) return "sale-started";
  if (after !== before || snap.currentPrice !== row.currentPrice) return "changed";
  return null;
}

/** 새 할인 먼저, 그다음 나머지 변동. 같은 갈래 안에서는 훑은 순서(오래된 순)를 지킨다 */
export function orderMoves<T>(moves: Array<{ row: T; move: Exclude<PriceMove, null> }>): T[] {
  return [...moves.filter((m) => m.move === "sale-started"), ...moves.filter((m) => m.move === "changed")].map((m) => m.row);
}

/** 이 소스가 아는 상품 중 가격 행이 있는 것. 오래된 순이라 시간 상한에 걸려도 오래 안 본 쪽을 먼저 본다 */
async function sweepRows(ctx: Ctx, source: StoreSource): Promise<SweepRow[]> {
  return ctx.db
    .select({
      gameId: gameSourceRefs.gameId,
      externalId: gameSourceRefs.externalId,
      slug: games.slug,
      platform: gamePlatforms.platform,
      currentPrice: gamePlatforms.currentPrice,
      discountPct: gamePlatforms.discountPct,
    })
    .from(gameSourceRefs)
    .innerJoin(games, eq(games.id, gameSourceRefs.gameId))
    .innerJoin(
      gamePlatforms,
      and(
        eq(gamePlatforms.gameId, gameSourceRefs.gameId),
        inArray(gamePlatforms.platform, SOURCE_PLATFORMS[source]),
        eq(gamePlatforms.region, SOURCE_REGION[source]),
      ),
    )
    .where(
      and(
        eq(gameSourceRefs.source, source),
        inArray(gameSourceRefs.matchedBy, MATCHED_FOR_SYNC),
        eq(games.crawlExcluded, false),
        not(missingRefExcluded()),
      ),
    )
    .orderBy(asc(gamePlatforms.lastSyncedAt));
}

/**
 * 값이 바뀐 행을 급한 순으로 돌려준다. 배치 하나가 실패해도 나머지는 계속 본다 —
 * 훑기는 순서를 정할 뿐이라 놓친 행은 평소 오래된 순 갱신이 결국 잡는다. 그래서 실패를 회차 실패로 세지 않는다.
 */
export async function sweepPriceMoves(ctx: Ctx, source: StoreSource, adapter: StoreAdapter): Promise<SweepRow[]> {
  if (!adapter.fetchMany) return [];
  const startedAt = Date.now();
  const rows = await sweepRows(ctx, source);
  // 한 상품(nsuid)이 기기 행 둘(switch, switch2)에 붙을 수 있다 — 묻기는 한 번, 견주기는 행마다
  const byId = new Map<string, SweepRow[]>();
  for (const r of rows) byId.set(r.externalId, [...(byId.get(r.externalId) ?? []), r]);
  const ids = [...byId.keys()];
  const size = adapter.batchSize ?? DEFAULT_FETCH_BATCH_SIZE;
  const moves: Array<{ row: SweepRow; move: Exclude<PriceMove, null> }> = [];
  let asked = 0;
  let failedBatches = 0;

  for (let i = 0; i < ids.length; i += size) {
    if (Date.now() - startedAt > PRICE_SWEEP_MAX_MS) break;
    const batch = ids.slice(i, i + size);
    try {
      const snaps = await adapter.fetchMany(batch);
      for (const id of batch) {
        const snap = snaps.get(id);
        if (!snap) continue;
        for (const row of byId.get(id) ?? []) {
          const move = priceMove(row, snap);
          if (move) moves.push({ row, move });
        }
      }
    } catch (e) {
      failedBatches++;
      console.warn(`[sync:${source}] 가격 훑기 배치 실패, 건너뜀: ${errorMessage(e)}`);
    }
    asked += batch.length;
    await sleep(adapter.sweepIntervalMs ?? adapter.minIntervalMs);
  }

  const started = moves.filter((m) => m.move === "sale-started").length;
  console.log(
    `[sync:${source}] 가격 훑기 ${asked}/${ids.length}건, ${Math.round((Date.now() - startedAt) / 1000)}초: ` +
      `새 할인 ${started}건, 다른 변동 ${moves.length - started}건` + (failedBatches > 0 ? `, 실패 배치 ${failedBatches}` : ""),
  );
  return orderMoves(moves);
}
