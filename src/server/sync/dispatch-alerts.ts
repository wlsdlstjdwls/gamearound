// 할인 알림 발송 — 설계서 §7. run-source 가 감지한 가격 변동 목록을 받아 조건에 맞는 price_alerts 에 웹푸시.
// 조건: is_active AND game_id 일치 AND (platform 일치 또는 null) AND discountPct >= minDiscountPct AND 직전 스냅샷 대비 가격 하락
import { and, eq, or, isNull, lte } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { alertDeliveries, gamePlatforms, games, priceAlerts, pushSubscriptions } from "@/server/db/schema";
import { markOnce } from "@/server/redis";
import { sendPush } from "@/server/push/webpush";
import { formatKrw, PLATFORM_LABEL } from "@/lib/format";

/** run-source → dispatch 로 넘기는 변동 1건 */
export interface PriceChange {
  gamePlatformId: string;
  snapshotId: number;
  previousPrice: number | null; // 직전 스냅샷(또는 직전 current_price)
  newPrice: number;
}

export interface DispatchSummary {
  changes: number;
  drops: number;
  alertsMatched: number;
  deduped: number;
  sent: number;
  failed: number;
  removedSubscriptions: number;
}

const DEDUPE_TTL_SEC = 7 * 24 * 60 * 60; // 7d

/** 직전 대비 하락인지 (§7). 순수 함수 */
export function isPriceDrop(previousPrice: number | null, newPrice: number): boolean {
  return previousPrice !== null && newPrice < previousPrice;
}

export async function dispatchPriceAlerts(changes: PriceChange[]): Promise<DispatchSummary> {
  const summary: DispatchSummary = { changes: changes.length, drops: 0, alertsMatched: 0, deduped: 0, sent: 0, failed: 0, removedSubscriptions: 0 };
  if (changes.length === 0) return summary;
  const db = getDb();

  for (const change of changes) {
    if (!isPriceDrop(change.previousPrice, change.newPrice)) continue;
    summary.drops++;

    const [gp] = await db
      .select({
        id: gamePlatforms.id,
        gameId: gamePlatforms.gameId,
        platform: gamePlatforms.platform,
        currentPrice: gamePlatforms.currentPrice,
        discountPct: gamePlatforms.discountPct,
        slug: games.slug,
        titleKo: games.titleKo,
        titleEn: games.titleEn,
      })
      .from(gamePlatforms)
      .innerJoin(games, eq(games.id, gamePlatforms.gameId))
      .where(eq(gamePlatforms.id, change.gamePlatformId));
    if (!gp) continue;

    const discountPct = gp.discountPct ?? 0;
    const alerts = await db
      .select()
      .from(priceAlerts)
      .where(
        and(
          eq(priceAlerts.gameId, gp.gameId),
          eq(priceAlerts.isActive, true),
          or(isNull(priceAlerts.platform), eq(priceAlerts.platform, gp.platform)),
          lte(priceAlerts.minDiscountPct, discountPct),
        ),
      );
    summary.alertsMatched += alerts.length;
    if (alerts.length === 0) continue;

    const title = gp.titleKo ?? gp.titleEn;
    const payload = {
      title: `${title} 할인 중`,
      body: `${PLATFORM_LABEL[gp.platform] ?? gp.platform} ${formatKrw(change.newPrice)} (${discountPct}% 할인)`,
      url: `/games/${gp.slug}`,
      tag: `price:${gp.id}`,
    };

    for (const alert of alerts) {
      // 7일 중복 방지 (alert × snapshot)
      const fresh = await markOnce(`dedupe:${alert.id}:${change.snapshotId}`, DEDUPE_TTL_SEC);
      if (!fresh) {
        summary.deduped++;
        continue;
      }

      const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, alert.userId));
      let attempted = false;
      for (const sub of subs) {
        attempted = true;
        const res = await sendPush(sub, payload);
        if (res.ok) {
          summary.sent++;
        } else {
          summary.failed++;
          if (res.gone) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            summary.removedSubscriptions++;
          } else {
            console.warn(`[alerts] push 실패 (alert=${alert.id}, status=${res.statusCode}): ${res.error}`);
          }
        }
      }
      if (attempted) {
        await db.insert(alertDeliveries).values({ alertId: alert.id, snapshotId: change.snapshotId }).onConflictDoNothing();
      }
    }
  }
  return summary;
}
