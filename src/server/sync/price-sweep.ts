// 가격 변동 훑기 — 카탈로그 가격을 싼 길로 한 바퀴 묻고, DB 와 값이 다른 행을 골라 낸다.
//
// 싼 길은 둘이다(constants 의 PRICE_SWEEP_SOURCES 주석).
// 1. 가격 배치(fetchMany): 닌텐도 가격 API 50건, 스팀 GetItems 100건. 고른 행은 평소 경로가 한 번 더 묻는다.
// 2. 카탈로그 목록(listPrices): PS 전체 게임 목록, Xbox browse, Epic 목록. 한 쪽에 수십 개 값이 같이 온다.
//    여기서 받은 값을 가격만 든 스냅샷으로 대상에 실어 보낸다(StoreTarget.prefetched) — 상품마다 다시 묻지 않는다.
//    PS 는 상세가 한 게임에 한 요청이라 큰 세일 1,000건을 다시 물으면 20분이 넘는다.
//
// 어느 쪽이든 쓰기는 여기서 하지 않는다. 고른 행은 store-targets 가 그 회차 대상 맨 앞에 세우고, 평소 반영 경로
// (검증, 반영, 이력, 찜 알림, 캐시 무효화)를 그대로 탄다 — 두 번째 쓰기 길을 만들면 그중 하나가 반드시 빠진다.
import { and, asc, eq, inArray, not } from "drizzle-orm";
import { gamePlatforms, gameSourceRefs, games, type Platform } from "@/server/db/schema";
import type { PriceQuote, StoreAdapter, StoreSnapshot } from "@/server/adapters/types";
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
  storeUrl: string | null;
  listPrice: number | null;
  currentPrice: number | null;
  discountPct: number | null;
};

/** 훑기가 고른 행. 목록에서 값을 받아 온 소스는 그 값으로 만든 스냅샷이 같이 간다(다시 묻지 않는다) */
export type SweptRow = SweepRow & { prefetched?: StoreSnapshot };

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

/**
 * 목록 값으로 견준다. priceMove 에 한 가지 조건이 더 붙는다: **정가가 DB 와 같아야 한다.**
 * 목록은 게임(콘셉트) 칸에 기본판이 아닌 에디션 가격을 싣기도 한다 — 2026-11-10 PS 실측으로 935개 중 94개가 정가부터 달랐다
 * (DB 89,800원 일반판, 목록 112,800원). 그런 행을 믿으면 회차마다 일반판과 에디션 값을 오가며 뒤집는다.
 * 정가가 다르면 손대지 않고 평소 상세 갱신에 맡긴다. 정가를 아직 모르는 행도 같다
 */
export function listMove(row: Pick<SweepRow, "listPrice" | "currentPrice" | "discountPct">, quote: Pick<PriceQuote, "listPrice" | "currentPrice" | "discountPct">): PriceMove {
  if (row.listPrice === null || quote.listPrice !== row.listPrice) return null;
  return priceMove(row, quote);
}

/** 새 할인 먼저, 그다음 나머지 변동. 같은 갈래 안에서는 훑은 순서(오래된 순)를 지킨다 */
export function orderMoves<T>(moves: Array<{ row: T; move: Exclude<PriceMove, null> }>): T[] {
  return [...moves.filter((m) => m.move === "sale-started"), ...moves.filter((m) => m.move === "changed")].map((m) => m.row);
}

/** 훑기 결과로 정한 이번 회차 몫. 큰 세일이면 상세 몫을 쉬고 전체 몫을 늘린다 */
export interface SweepShare {
  /** 이번 회차 전체 처리 상한 */
  limit: number;
  /** 상세로 받을 기존 행 수(한국어 채우기). 큰 세일 회차는 0 */
  detailTop: number;
  /** 변동 행 중 이번 회차에 반영할 수 */
  swept: number;
  surge: boolean;
}

/**
 * 변동 수를 보고 몫을 정한다. 평소에는 변동이 전체 몫의 일정 비율(shareMax)까지만 앞에 서고 나머지 몫은 상세, 조회작,
 * 오래된 순이 쓴다. 변동이 그 자리보다 많으면 큰 세일로 보고 상세를 쉬고 몫을 surgeLimit 까지 늘려 변동을 한 번에 싣는다
 * (constants 의 PRICE_SWEEP_SURGE_LIMIT 주석). surgeLimit 이 없는 소스는 평소대로 간다.
 */
export function sweepShare(opts: { limit: number; detailTop: number; moves: number; shareMax: number; surgeLimit?: number }): SweepShare {
  const { limit, detailTop, moves, shareMax, surgeLimit } = opts;
  const normalRoom = Math.max(Math.floor(limit * shareMax) - detailTop, 0);
  if (moves <= normalRoom || !surgeLimit) return { limit, detailTop, swept: Math.min(moves, normalRoom), surge: false };
  const swept = Math.min(moves, surgeLimit);
  return { limit: Math.max(limit, swept), detailTop: 0, swept, surge: true };
}

/** 목록 값 + DB 행 → 가격만 든 스냅샷. 기기와 주소는 DB 행의 것이다(목록은 그 둘을 안 준다) */
export function quoteSnapshot(row: SweepRow & { platform: Platform; storeUrl: string }, quote: PriceQuote): StoreSnapshot {
  return {
    platform: row.platform,
    storeExternalId: quote.storeExternalId,
    storeUrl: row.storeUrl,
    listPrice: quote.listPrice,
    currentPrice: quote.currentPrice,
    discountPct: quote.discountPct,
    discountStartsAt: quote.discountStartsAt ?? null,
    discountEndsAt: quote.discountEndsAt ?? null,
    discountName: quote.discountName ?? null,
  };
}

/** 이 소스가 아는 상품 중 가격 행이 있는 것. 오래된 순이라 시간 상한에 걸려도 오래 안 본 쪽을 먼저 본다 */
async function sweepRows(ctx: Ctx, source: StoreSource): Promise<SweepRow[]> {
  return ctx.db
    .select({
      gameId: gameSourceRefs.gameId,
      externalId: gameSourceRefs.externalId,
      slug: games.slug,
      platform: gamePlatforms.platform,
      storeUrl: gamePlatforms.storeUrl,
      listPrice: gamePlatforms.listPrice,
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

type Move = { row: SweptRow; move: Exclude<PriceMove, null> };

/** 가격 배치로 훑는다(닌텐도, 스팀). 한 상품(nsuid)이 기기 행 둘에 붙을 수 있다 — 묻기는 한 번, 견주기는 행마다 */
async function sweepByBatch(source: StoreSource, adapter: StoreAdapter & { fetchMany: NonNullable<StoreAdapter["fetchMany"]> }, rows: SweepRow[], startedAt: number) {
  const byId = new Map<string, SweepRow[]>();
  for (const r of rows) byId.set(r.externalId, [...(byId.get(r.externalId) ?? []), r]);
  const ids = [...byId.keys()];
  const size = adapter.batchSize ?? DEFAULT_FETCH_BATCH_SIZE;
  const moves: Move[] = [];
  let seen = 0;
  let failed = 0;
  for (let i = 0; i < ids.length; i += size) {
    if (Date.now() - startedAt > PRICE_SWEEP_MAX_MS) break;
    const batch = ids.slice(i, i + size);
    try {
      const snaps = await (adapter.sweepMany ?? adapter.fetchMany)(batch);
      for (const id of batch) {
        const snap = snaps.get(id);
        if (!snap) continue;
        for (const row of byId.get(id) ?? []) {
          const move = priceMove(row, snap);
          if (move) moves.push({ row, move });
        }
      }
    } catch (e) {
      failed++;
      console.warn(`[sync:${source}] 가격 훑기 배치 실패, 건너뜀: ${errorMessage(e)}`);
    }
    seen += batch.length;
    await sleep(adapter.sweepIntervalMs ?? adapter.minIntervalMs);
  }
  return { moves, seen, total: ids.length, failed };
}

/**
 * 카탈로그 목록으로 훑는다(PS, Xbox, Epic). 목록 쪽에서 상품을 만나는 순서라 DB 순서(오래된 순)와 상관이 없다 —
 * 시간 상한에 걸리면 목록 뒤쪽은 다음 회차가 본다.
 * 한 상품이 기기 행 둘(PS4, PS5)에 붙어 있으면 주소가 있는 행 하나만 견준다. 그 행이 상세 갱신이 쓰는 행이다
 * (주소 없는 행에 스냅샷을 만들면 주소를 비울 수 없어 반영이 그 행을 못 쓴다)
 */
async function sweepByList(source: StoreSource, adapter: StoreAdapter & { listPrices: NonNullable<StoreAdapter["listPrices"]> }, rows: SweepRow[], startedAt: number) {
  const primary = new Map<string, SweepRow & { platform: Platform; storeUrl: string }>();
  for (const r of rows) {
    if (!r.platform || !r.storeUrl || primary.has(r.externalId)) continue;
    primary.set(r.externalId, { ...r, platform: r.platform, storeUrl: r.storeUrl });
  }
  const moves: Move[] = [];
  let seen = 0;
  let failed = 0;
  try {
    for await (const quotes of adapter.listPrices()) {
      for (const q of quotes) {
        const row = primary.get(q.storeExternalId);
        if (!row) continue;
        seen++;
        const move = listMove(row, q);
        if (move) moves.push({ row: { ...row, prefetched: quoteSnapshot(row, q) }, move });
      }
      if (Date.now() - startedAt > PRICE_SWEEP_MAX_MS) break;
    }
  } catch (e) {
    // 목록 한 쪽이 실패하면 거기서 멈춘다(이어 읽을 자리를 모른다). 그때까지 고른 변동은 그대로 쓴다
    failed++;
    console.warn(`[sync:${source}] 가격 훑기 목록 실패, 여기까지 본 것만 쓴다: ${errorMessage(e)}`);
  }
  return { moves, seen, total: primary.size, failed };
}

/**
 * 값이 바뀐 행을 급한 순으로 돌려준다. 실패해도 나머지는 계속 본다 —
 * 훑기는 순서를 정할 뿐이라 놓친 행은 평소 오래된 순 갱신이 결국 잡는다. 그래서 실패를 회차 실패로 세지 않는다.
 */
export async function sweepPriceMoves(ctx: Ctx, source: StoreSource, adapter: StoreAdapter): Promise<SweptRow[]> {
  const { listPrices, fetchMany } = adapter;
  if (!listPrices && !fetchMany) return [];
  const startedAt = Date.now();
  const rows = await sweepRows(ctx, source);
  const r = listPrices
    ? await sweepByList(source, { ...adapter, listPrices }, rows, startedAt)
    : await sweepByBatch(source, { ...adapter, fetchMany: fetchMany! }, rows, startedAt);
  const started = r.moves.filter((m) => m.move === "sale-started").length;
  console.log(
    `[sync:${source}] 가격 훑기 ${r.seen}/${r.total}건, ${Math.round((Date.now() - startedAt) / 1000)}초: ` +
      `새 할인 ${started}건, 다른 변동 ${r.moves.length - started}건` + (r.failed > 0 ? `, 실패 ${r.failed}` : ""),
  );
  return orderMoves(r.moves);
}
