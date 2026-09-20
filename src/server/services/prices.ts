// prices 서비스 — 가격 이력 조회(/games/[slug]/prices) + 일 1회 정리 작업(§4.3 Vercel Cron)
import { unstable_cache } from "next/cache";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, news, priceSnapshots, syncLogs, type Currency, type Platform } from "@/server/db/schema";
import { PLATFORM_ORDER } from "@/lib/platform";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { DTO_CACHE_VERSION } from "@/lib/cache";
import { DISPLAY_CURRENCY as BASE_CURRENCY } from "@/lib/currency";

export type PricePoint = { t: string; price: number; discountPct: number; discountName: string | null };
/** 플랫폼별 시계열 + 현재 상태(정가 기준선, 진행 중 할인 표시에 쓴다) */
export type PriceSeries = {
  platform: Platform;
  /** 이 계열의 통화. 차트는 한 축에 한 통화만 그린다 */
  currency: Currency;
  points: PricePoint[];
  listPrice: number | null;
  currentPrice: number | null;
  discountPct: number | null;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  discountName: string | null;
  storeUrl: string | null;
};

async function getPriceHistoryRaw(slug: string, days: number): Promise<PriceSeries[]> {
  const db = getDb();
  const game = await db.query.games.findFirst({ where: eq(games.slug, slug), columns: { id: true } });
  if (!game) return [];

  const gps = await db
    .select({
      id: gamePlatforms.id,
      platform: gamePlatforms.platform,
      listPrice: gamePlatforms.listPrice,
      currentPrice: gamePlatforms.currentPrice,
      currency: gamePlatforms.currency,
      discountPct: gamePlatforms.discountPct,
      discountStartsAt: gamePlatforms.discountStartsAt,
      discountEndsAt: gamePlatforms.discountEndsAt,
      discountName: gamePlatforms.discountName,
      storeUrl: gamePlatforms.storeUrl,
    })
    .from(gamePlatforms)
    .where(and(eq(gamePlatforms.gameId, game.id), visiblePlatformsOnly()));
  if (gps.length === 0) return [];

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      gamePlatformId: priceSnapshots.gamePlatformId,
      price: priceSnapshots.price,
      discountPct: priceSnapshots.discountPct,
      discountName: priceSnapshots.discountName,
      capturedAt: priceSnapshots.capturedAt,
    })
    .from(priceSnapshots)
    .where(
      and(
        inArray(
          priceSnapshots.gamePlatformId,
          gps.map((g) => g.id),
        ),
        gte(priceSnapshots.capturedAt, since),
      ),
    )
    .orderBy(priceSnapshots.capturedAt);

  const byGp = new Map<string, PricePoint[]>();
  for (const r of rows) {
    const list = byGp.get(r.gamePlatformId) ?? [];
    list.push({ t: r.capturedAt.toISOString(), price: r.price, discountPct: r.discountPct ?? 0, discountName: r.discountName });
    byGp.set(r.gamePlatformId, list);
  }

  return gps
    .map((g) => ({
      platform: g.platform,
      currency: g.currency,
      points: byGp.get(g.id) ?? [],
      listPrice: g.listPrice,
      currentPrice: g.currentPrice,
      discountPct: g.discountPct,
      discountStartsAt: g.discountStartsAt ? g.discountStartsAt.toISOString() : null,
      discountEndsAt: g.discountEndsAt ? g.discountEndsAt.toISOString() : null,
      discountName: g.discountName,
      storeUrl: g.storeUrl,
    }))
    .filter((s) => s.points.length > 0)
    .sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));
}

/** 최근 N일 가격 이력 — 태그 `game:<slug>` (크롤러 갱신 시 함께 무효화) */
export async function getPriceHistory(slug: string, opts: { days?: number } = {}): Promise<PriceSeries[]> {
  const days = Math.min(Math.max(opts.days ?? 365, 1), 730);
  const cached = unstable_cache(() => getPriceHistoryRaw(slug, days), [DTO_CACHE_VERSION, "price-history", slug, String(days)], {
    tags: [`game:${slug}`],
  });
  return cached();
}

// ---------- 일 1회 정리 (Vercel Cron → /api/cron/daily) ----------

/**
 * 스냅샷 다운샘플링(§9): 90일 지난 스냅샷은 (플랫폼, ISO 주) 단위로 가장 최근 1개만 남기고 삭제.
 * alert_deliveries.snapshot_id 가 참조하는 행은 FK(cascade 아님) 때문에 보존한다.
 * @returns 삭제된 행 수
 */
export async function downsampleSnapshots(olderThanDays = 90): Promise<number> {
  const db = getDb();
  const res = await db.execute(sql`
    delete from price_snapshots
    where captured_at < now() - make_interval(days => ${olderThanDays})
      and id not in (
        select distinct on (game_platform_id, date_trunc('week', captured_at)) id
        from price_snapshots
        where captured_at < now() - make_interval(days => ${olderThanDays})
        order by game_platform_id, date_trunc('week', captured_at), captured_at desc
      )
      and id not in (select snapshot_id from alert_deliveries)
  `);
  return res.rowCount ?? 0;
}

/** 발행 후 N일 지난 뉴스 삭제. @returns 삭제 행 수 */
export async function purgeOldNews(days = 90): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const deleted = await db.delete(news).where(lt(news.publishedAt, cutoff)).returning({ id: news.id });
  return deleted.length;
}

/** 시작 후 N일 지난 sync_logs 삭제. @returns 삭제 행 수 */
export async function purgeOldSyncLogs(days = 30): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const deleted = await db.delete(syncLogs).where(lt(syncLogs.startedAt, cutoff)).returning({ id: syncLogs.id });
  return deleted.length;
}

/**
 * 기록상 최저가 — **지금보다 쌌던 적이 있을 때만** 값을 돌려준다.
 *
 * 왜 조건을 다는가(2026-09-21 실측): 스냅샷이 2026-09-11부터라 열흘치뿐이고, 가격 있는 행
 * 86,485 중 스냅샷이 하나라도 있는 행이 22,044(25%), 그중 20,600(93%)은 스냅샷이 딱 1건이다.
 * 가격이 움직인 걸 실제로 본 행은 **1,355건, 전체의 1.6%** 다.
 *
 * 그 상태에서 "기록 최저가" 를 늘 적으면 거의 모든 게임이 "최저가 = 현재가" 로 나온다.
 * 그건 정보가 아니라 잡음이고, 읽는 사람은 그것을 "지금이 제일 싸다" 로 읽는다 —
 * 우리가 열흘밖에 안 봤다는 사실은 화면에 없다. 그래서 **더 싼 값을 본 적이 있을 때만** 말한다.
 * 데이터가 쌓여 이 비율이 뒤집히면 그때 조건을 풀면 된다(그때는 없는 것이 오히려 정보가 된다).
 *
 * 통화가 섞인 비교는 하지 않는다(lib/currency) — 기준 통화 행만 본다.
 */
export type RecordedLow = {
  price: number;
  currency: Currency;
  /** 그 값을 본 시각. "언제 그랬나" 가 없으면 되풀이될 값인지 판단할 수 없다 */
  at: string;
  /** 지금 최저가와의 차이(양수). 화면이 다시 빼지 않게 여기서 계산해 준다 */
  gap: number;
};

async function getRecordedLowRaw(slug: string): Promise<RecordedLow | null> {
  const db = getDb();
  const game = await db.query.games.findFirst({ where: eq(games.slug, slug), columns: { id: true } });
  if (!game) return null;

  // 기준 통화 행만. 통화가 섞이면 "더 싸다" 가 성립하지 않는다
  const rows = await db
    .select({ id: gamePlatforms.id, currentPrice: gamePlatforms.currentPrice })
    .from(gamePlatforms)
    .where(and(eq(gamePlatforms.gameId, game.id), eq(gamePlatforms.currency, BASE_CURRENCY), visiblePlatformsOnly()));
  const priced = rows.filter((r) => r.currentPrice !== null && r.currentPrice > 0);
  if (priced.length === 0) return null;
  const now = Math.min(...priced.map((r) => r.currentPrice!));

  const [low] = await db
    .select({ price: sql<number>`min(${priceSnapshots.price})`, at: sql<string>`min(${priceSnapshots.capturedAt})::text` })
    .from(priceSnapshots)
    .where(and(inArray(priceSnapshots.gamePlatformId, priced.map((r) => r.id)), sql`${priceSnapshots.price} > 0`));

  if (!low?.price || low.price >= now) return null;
  return { price: low.price, currency: BASE_CURRENCY, at: low.at, gap: now - low.price };
}

export async function getRecordedLow(slug: string): Promise<RecordedLow | null> {
  return unstable_cache(() => getRecordedLowRaw(slug), [DTO_CACHE_VERSION, "recorded-low", slug], {
    tags: [`game:${slug}`],
  })();
}
