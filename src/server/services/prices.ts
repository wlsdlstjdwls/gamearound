// prices 서비스 — 가격 이력 조회(/games/[slug]/prices) + 일 1회 정리 작업(§4.3 Vercel Cron)
import { unstable_cache } from "next/cache";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, news, priceSnapshots, syncLogs, type Currency, type Platform } from "@/server/db/schema";
import { PLATFORM_ORDER } from "@/lib/platform";

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
    .where(eq(gamePlatforms.gameId, game.id));
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
  const cached = unstable_cache(() => getPriceHistoryRaw(slug, days), ["price-history", slug, String(days)], {
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
