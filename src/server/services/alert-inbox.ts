// 알림을 걸거나 고친 순간 이미 조건에 맞으면 알림함(헤더 종)에 한 줄 남긴다.
//
// 발송(sync/dispatch-alerts)은 "직전보다 내려간 순간" 에만 돈다. 그래서 이미 할인 중인 게임에 알림을 걸면
// 다음 하락이 올 때까지 아무것도 안 오고, 알림 화면은 "조건 충족 1, 보낸 알림 0" 으로 남는다 — 고장으로 읽힌다.
// 걸 때 한 번 판정해서 알림함에 적고, 그 값의 스냅샷으로 alert_deliveries 를 찍는다.
// 같은 (알림, 스냅샷) 은 기본키가 한 번만 받으니, 조건을 몇 번 고쳐도 같은 가격으로는 두 번 쌓이지 않는다.
// 푸시는 보내지 않는다 — 지금 화면을 보고 있는 사람에게 같은 소식을 기기로 또 울릴 까닭이 없다.
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createdBy } from "@/server/db/audit";
import { alertDeliveries, gamePlatforms, games, HOME_REGION, notifications, priceAlerts, priceSnapshots } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { alertStatus } from "@/lib/alerts/condition";
import { formatPrice } from "@/lib/currency";
import { NOTIFICATION_MESSAGES as M } from "@/lib/notifications/messages";
import { requireUser } from "@/server/services/users";

/** 이 게임에 켜 둔 내 알림 중 지금 조건에 맞는 것마다 알림함 한 줄. 돌려주는 값은 새로 쌓은 수 */
export async function notifyAlertsMetNow(gameId: string): Promise<number> {
  const u = await requireUser();
  const db = getDb();
  const [alerts, rows, game] = await Promise.all([
    db.query.priceAlerts.findMany({ where: and(eq(priceAlerts.userId, u.id), eq(priceAlerts.gameId, gameId), eq(priceAlerts.isActive, true)) }),
    db
      .select({
        id: gamePlatforms.id,
        platform: gamePlatforms.platform,
        currentPrice: gamePlatforms.currentPrice,
        currency: gamePlatforms.currency,
        discountPct: gamePlatforms.discountPct,
      })
      .from(gamePlatforms)
      .where(and(eq(gamePlatforms.gameId, gameId), eq(gamePlatforms.region, HOME_REGION), visiblePlatformsOnly())),
    db.query.games.findFirst({ where: eq(games.id, gameId), columns: { slug: true, titleKo: true, titleEn: true } }),
  ]);
  if (!game || alerts.length === 0 || rows.length === 0) return 0;

  // 알림마다 화면과 같은 판정(alertStatus)으로 "맞는 행 중 가장 싼 것" 을 고른다
  const hits = alerts.flatMap((a) => {
    const s = alertStatus({ minDiscountPct: a.minDiscountPct, targetPrice: a.targetPrice }, rows, a.platform);
    const row = s.met && s.best ? rows.find((r) => r.platform === s.best?.platform && r.currentPrice === s.best.currentPrice) : undefined;
    return row && row.currentPrice !== null ? [{ alertId: a.id, row: { ...row, currentPrice: row.currentPrice } }] : [];
  });
  if (hits.length === 0) return 0;

  // 행마다 가장 최근 스냅샷 — 지금 값이 찍힌 기록이다. 스냅샷이 없는 행(값이 아직 한 번도 안 찍힘)은 건너뛴다
  const gpIds = [...new Set(hits.map((h) => h.row.id))];
  const snaps = await db
    .selectDistinctOn([priceSnapshots.gamePlatformId], { gamePlatformId: priceSnapshots.gamePlatformId, id: priceSnapshots.id })
    .from(priceSnapshots)
    .where(inArray(priceSnapshots.gamePlatformId, gpIds))
    .orderBy(priceSnapshots.gamePlatformId, desc(priceSnapshots.capturedAt));
  const snapBy = new Map(snaps.map((s) => [s.gamePlatformId, s.id]));

  const title = game.titleKo ?? game.titleEn;
  let added = 0;
  for (const h of hits) {
    const snapshotId = snapBy.get(h.row.id);
    if (snapshotId === undefined) continue;
    const fresh = await db
      .insert(alertDeliveries)
      .values({ alertId: h.alertId, snapshotId, ...createdBy("user", u.id) })
      .onConflictDoNothing()
      .returning({ alertId: alertDeliveries.alertId });
    if (fresh.length === 0) continue;
    await db.insert(notifications).values({
      userId: u.id,
      kind: "price_drop",
      body: M.priceMet(title, formatPrice(h.row.currentPrice, h.row.currency)),
      link: `/games/${game.slug}`,
      ...createdBy("user", u.id),
    });
    added++;
  }
  return added;
}
