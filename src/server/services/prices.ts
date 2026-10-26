// prices 서비스 — 가격 이력 조회(/games/[slug]/prices) + 일 1회 정리 작업(§4.3 Vercel Cron)
import { unstable_cache } from "next/cache";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, news, priceSnapshots, syncLogs, HOME_REGION, type Currency, type Platform } from "@/server/db/schema";
import { PLATFORM_ORDER } from "@/lib/platform";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { DTO_CACHE_VERSION } from "@/lib/cache";
import { DISPLAY_CURRENCY as BASE_CURRENCY } from "@/lib/currency";
import { summarizeHistory, type HistoryPoint, type PlatformHistory } from "@/lib/sales/forecast";

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
 * 할인 예측의 근거(기획서 v2.0 S-05) — 플랫폼마다 본 적 있는 최저가, 최대 할인율, 할인 시작 시각.
 * 판단(진행 중인가, 다음은 언제, 얼마쯤)은 lib/sales/forecast 의 순수 함수가 한다. 여기는 스냅샷을 접어 넘기기만 한다.
 *
 * 한국 행, 기준 통화 행만 본다 — 통화가 섞이면 "더 싸다" 가 성립하지 않고(lib/currency), 다른 나라 값은 한국 계정으로 못 산다.
 * 게임 id 를 먼저 찾지 않고 slug 로 한 번에 잇는다: 상세는 Neon 왕복 수가 곧 속도다(왕복 1회 약 220ms).
 *
 * 옛 getRecordedLow 를 대신한다. 그 함수는 "본 날" 을 min(captured_at) 으로 적어 최저가를 본 날이 아니라
 * 첫 스냅샷 날을 보여 줬다 — 여기서는 최저가가 찍힌 그 점의 시각을 쓴다(summarizeHistory).
 */
async function getDiscountHistoryRaw(slug: string): Promise<PlatformHistory[]> {
  const db = getDb();
  const rows = await db
    .select({ platform: gamePlatforms.platform, t: priceSnapshots.capturedAt, price: priceSnapshots.price, discountPct: priceSnapshots.discountPct })
    .from(priceSnapshots)
    .innerJoin(gamePlatforms, eq(gamePlatforms.id, priceSnapshots.gamePlatformId))
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(and(eq(games.slug, slug), eq(gamePlatforms.region, HOME_REGION), eq(gamePlatforms.currency, BASE_CURRENCY), visiblePlatformsOnly()));
  const byPlatform = new Map<string, HistoryPoint[]>();
  for (const r of rows) {
    const list = byPlatform.get(r.platform) ?? [];
    list.push({ t: r.t.toISOString(), price: r.price, discountPct: r.discountPct ?? 0 });
    byPlatform.set(r.platform, list);
  }
  return [...byPlatform].map(([platform, points]) => summarizeHistory(platform, points));
}

export async function getDiscountHistory(slug: string): Promise<PlatformHistory[]> {
  return unstable_cache(() => getDiscountHistoryRaw(slug), [DTO_CACHE_VERSION, "discount-history", slug], {
    tags: [`game:${slug}`],
  })();
}
